/**
 * Patient document uploader.
 *
 * Two-step: (1) POST /patient/me/documents/upload-url to get a presigned URL
 * (the API returns a signed in-Worker proxy URL since R2 doesn't support
 * direct presigned PUT for the buckets we use), (2) PUT the file body to that
 * URL with `credentials: 'include'`. The server stores it and runs an async
 * AV scan; the doc shows up in the documents list with `scanStatus: pending`.
 */
import { useRef, useState } from 'react';
import { Banner, Button, useTranslator } from '@dr-bak/ui';
import type { Locale } from '@dr-bak/i18n-keys';
import { PUBLIC_API_BASE, apiFetch, errorMessageFor } from '~/lib/api';

interface Props {
  locale: Locale;
  dict: Record<string, unknown>;
}

export default function DocumentUploader({ locale, dict }: Props) {
  const t = useTranslator(dict, locale);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const presign = await apiFetch<{ documentId: string; uploadUrl: string }>(
      '/patient/me/documents/upload-url',
      {
        method: 'POST',
        body: {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        },
      },
    );
    if (!presign.ok) {
      setBusy(false);
      setError(errorMessageFor(presign.error, t as never));
      return;
    }
    const url = presign.value.uploadUrl.startsWith('http')
      ? presign.value.uploadUrl
      : `${PUBLIC_API_BASE}${presign.value.uploadUrl}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PUT',
        body: file,
        credentials: 'include',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
    } catch {
      setBusy(false);
      setError(t('errors.NETWORK'));
      return;
    }
    setBusy(false);
    if (!res.ok) {
      setError(`HTTP ${res.status}`);
      return;
    }
    window.location.reload();
  };

  return (
    <div>
      {error ? (
        <Banner variant="danger">
          <p style={{ margin: 0 }}>{error}</p>
        </Banner>
      ) : null}
      <input ref={fileRef} type="file" onChange={onChange} hidden accept="image/*,application/pdf" />
      <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busy}>
        {t('portal.uploadDocument')}
      </Button>
    </div>
  );
}
