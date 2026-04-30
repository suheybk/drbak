/**
 * Drizzle client over Neon Postgres via Cloudflare Hyperdrive (production)
 * or direct serverless driver (local dev / migrations).
 *
 * IMPORTANT: instantiate per-request — never reuse a Drizzle client across
 * isolate invocations. Hyperdrive handles pooling at the edge.
 */

import type { Hyperdrive } from '@cloudflare/workers-types';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export const buildDb = (binding: Hyperdrive | { connectionString: string }): Db => {
  const connStr =
    'connectionString' in binding ? binding.connectionString : binding.connectionString;
  // Neon HTTP driver — works in Workers; no long-lived TCP.
  const sql = neon(connStr);
  return drizzle(sql, { schema });
};

export { schema };
