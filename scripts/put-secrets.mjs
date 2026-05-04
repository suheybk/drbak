#!/usr/bin/env node
/**
 * Push secrets from apps/api/.dev.vars into Cloudflare Workers via the
 * REST API (Wrangler's interactive `wrangler secret put` doesn't fit
 * a non-interactive scripted run).
 *
 * Usage:  node scripts/put-secrets.mjs (staging|production)
 *
 * Posts each secret as a separate PUT to:
 *   /accounts/{account}/workers/scripts/{script}/secrets
 *
 * Idempotent — overwrites existing secrets with the same name.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEV_VARS = join(ROOT, 'apps/api/.dev.vars');

const env = process.argv[2];
if (!['staging', 'production'].includes(env)) {
  console.error('Usage: node scripts/put-secrets.mjs (staging|production)');
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

const token = vars.CLOUDFLARE_API_TOKEN;
const accountId = vars.CLOUDFLARE_ACCOUNT_ID;
if (!token || !accountId) {
  console.error('missing CF token / account id');
  process.exit(2);
}

// Map .dev.vars keys → wrangler secret names. Per-env DATABASE_URL is
// split into staging/production locally, but each env's deployed Worker
// only sees `DATABASE_URL`.
const dbUrlKey = `DATABASE_URL_${env.toUpperCase()}`;
const secretNames = [
  ['DATABASE_URL', vars[dbUrlKey]],
  ['JWT_SIGNING_PRIVATE_KEY', vars.JWT_SIGNING_PRIVATE_KEY],
  ['JWT_SIGNING_PUBLIC_KEY', vars.JWT_SIGNING_PUBLIC_KEY],
  ['JWT_SIGNING_KID', vars.JWT_SIGNING_KID],
  ['ANTHROPIC_API_KEY', vars.ANTHROPIC_API_KEY],
  // Optional vendor secrets — write only when filled in
  ['RESEND_API_KEY', vars.RESEND_API_KEY],
  ['NETGSM_USERNAME', vars.NETGSM_USERNAME],
  ['NETGSM_PASSWORD', vars.NETGSM_PASSWORD],
  ['NETGSM_SENDER_ID', vars.NETGSM_SENDER_ID],
  ['META_WA_ACCESS_TOKEN', vars.META_WA_ACCESS_TOKEN],
  ['META_WA_PHONE_NUMBER_ID', vars.META_WA_PHONE_NUMBER_ID],
  ['META_WA_VERIFY_TOKEN', vars.META_WA_VERIFY_TOKEN],
  ['GOOGLE_OAUTH_CLIENT_ID', vars.GOOGLE_OAUTH_CLIENT_ID],
  ['GOOGLE_OAUTH_CLIENT_SECRET', vars.GOOGLE_OAUTH_CLIENT_SECRET],
  ['JITSI_APP_ID', vars.JITSI_APP_ID],
  ['JITSI_APP_SECRET', vars.JITSI_APP_SECRET],
  ['IYZICO_API_KEY', vars.IYZICO_API_KEY],
  ['IYZICO_SECRET_KEY', vars.IYZICO_SECRET_KEY],
  ['IYZICO_BASE_URL', vars.IYZICO_BASE_URL],
];

// Worker script name: from wrangler.toml (`name = "dr-bak-api"`). Per-env
// deploys add an `-<env>` suffix because we use `--env staging` / `--env
// production`. Matches the production wrangler.toml convention.
const scriptName = env === 'production' ? 'dr-bak-api-production' : 'dr-bak-api-staging';

console.log(`-- target: ${scriptName}`);

let pushed = 0;
let skipped = 0;

for (const [name, value] of secretNames) {
  if (!value || value.length === 0) {
    console.log(`-- skip ${name} (empty)`);
    skipped += 1;
    continue;
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, text: value, type: 'secret_text' }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`-- FAILED ${name}: ${res.status} ${body.slice(0, 200)}`);
    process.exit(3);
  }
  console.log(`-- pushed ${name}`);
  pushed += 1;
}

console.log(`\n== secrets done: ${pushed} pushed, ${skipped} skipped ==`);
