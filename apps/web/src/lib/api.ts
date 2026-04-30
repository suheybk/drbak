/**
 * Thin API client for browser islands. Server-side fetches in .astro files use
 * `serverFetch` which forwards cookies. Client-side islands use `apiFetch`
 * which talks to PUBLIC_API_BASE with `credentials: 'include'`.
 *
 * Both return either `{ ok: true, value }` or `{ ok: false, error }` where
 * `error` is the `ApiError` envelope (the same shape Hono returns). This lets
 * UI components localise via `t(`errors.${error.code}`)`.
 */
import type { ApiError, ApiErrorResponse } from '@dr-bak/contracts';

export type Result<T> = { ok: true; value: T } | { ok: false; error: ApiError };

const NETWORK_ERROR = (corr = 'client-network'): ApiError => ({
  code: 'NETWORK',
  message: 'Network error',
  correlationId: corr,
});

export const PUBLIC_API_BASE: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.PUBLIC_API_BASE ?? 'http://localhost:8787/api/v1';

const newCorrelationId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Set to enable idempotent retries on 5xx. */
  idempotencyKey?: string;
  /** AbortSignal to support cancel-on-unmount in React islands. */
  signal?: AbortSignal;
  /** Force a specific base URL (e.g. for SSR). */
  baseUrl?: string;
  /** Forward incoming Cookie header during SSR. */
  cookieHeader?: string | undefined;
};

export const apiFetch = async <T>(path: string, opts: FetchOpts = {}): Promise<Result<T>> => {
  const url = `${opts.baseUrl ?? PUBLIC_API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Correlation-Id': newCorrelationId(),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  if (opts.cookieHeader) headers['Cookie'] = opts.cookieHeader;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: opts.signal,
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR(headers['X-Correlation-Id']) };
  }

  if (res.status === 204) return { ok: true, value: undefined as never };

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    if (!res.ok) {
      return {
        ok: false,
        error: {
          code: 'INTERNAL',
          message: `HTTP ${res.status}`,
          correlationId: headers['X-Correlation-Id'] ?? 'unknown',
        },
      };
    }
  }

  if (!res.ok) {
    const errEnvelope = payload as ApiErrorResponse | null;
    const err: ApiError = errEnvelope?.error ?? {
      code: 'INTERNAL',
      message: `HTTP ${res.status}`,
      correlationId: headers['X-Correlation-Id'] ?? 'unknown',
    };
    return { ok: false, error: err };
  }

  return { ok: true, value: payload as T };
};

/** Convenience: fetch from .astro server-side, forwarding the visitor's cookies. */
export const serverFetch = async <T>(
  request: Request,
  path: string,
  opts: Omit<FetchOpts, 'cookieHeader' | 'baseUrl'> & { baseUrl?: string } = {},
): Promise<Result<T>> =>
  apiFetch<T>(path, {
    ...opts,
    cookieHeader: request.headers.get('cookie') ?? undefined,
  });

/** Localise an ApiError via the i18n dict. */
export const errorMessageFor = (
  error: ApiError,
  t: (key: `errors.${string}`) => string,
): string => {
  const localised = t(`errors.${error.code}`);
  // If the key didn't resolve, the resolver returns the key itself.
  return localised.startsWith('errors.') ? error.message : localised;
};
