#!/usr/bin/env node
/**
 * Run hand-written SQL migrations against a Neon Postgres branch.
 *
 * Usage:  node scripts/run-migrations.mjs (staging|production)
 *
 * Reads DATABASE_URL_STAGING or DATABASE_URL_PRODUCTION from
 * apps/api/.dev.vars and applies every .sql file in
 * apps/api/src/infrastructure/db/migrations/ in lexicographic order.
 *
 * Uses a `_drbak_migrations` table to track which files have been
 * applied — idempotent across re-runs.
 *
 * Direct (non-pooled) connection is required for migrations because
 * Neon's pooler doesn't support DDL statements that span multiple
 * statements. We rewrite the pooler hostname → direct hostname here.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'apps/api/src/infrastructure/db/migrations');
const DEV_VARS = join(ROOT, 'apps/api/.dev.vars');

const env = process.argv[2];
if (!['staging', 'production'].includes(env)) {
  console.error('Usage: node scripts/run-migrations.mjs (staging|production)');
  process.exit(1);
}

const vars = Object.fromEntries(
  readFileSync(DEV_VARS, 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const key = `DATABASE_URL_${env.toUpperCase()}`;
const pooledUrl = vars[key];
if (!pooledUrl) {
  console.error(`missing ${key} in apps/api/.dev.vars`);
  process.exit(2);
}
// Migrations need a direct (non-pooled) connection — strip "-pooler" from host
const url = pooledUrl.replace('-pooler.', '.');
console.log(`-- target: ${env} branch on Neon`);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS _drbak_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const { rows: appliedRows } = await client.query('SELECT filename FROM _drbak_migrations');
const applied = new Set(appliedRows.map((r) => r.filename));

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

let ran = 0;
for (const f of files) {
  if (applied.has(f)) {
    console.log(`-- skip ${f} (already applied)`);
    continue;
  }
  console.log(`-- applying ${f}`);
  const sqlText = readFileSync(join(MIGRATIONS_DIR, f), 'utf-8');
  // node-pg supports multi-statement queries when passed as a single
  // string — perfect for our hand-written migrations.
  await client.query('BEGIN');
  try {
    await client.query(sqlText);
    await client.query('INSERT INTO _drbak_migrations (filename) VALUES ($1)', [f]);
    await client.query('COMMIT');
    ran += 1;
    console.log(`-- ${f} OK`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`-- FAILED ${f}: ${e.message}`);
    if (e.position) console.error(`-- at position ${e.position}`);
    process.exit(3);
  }
}

await client.end();
console.log(`\n== migrations done: ${ran} applied, ${applied.size} already in place ==`);
