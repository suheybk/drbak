# Operations Runbook — Dr. Bak

**Audience:** on-call engineer (primary), agency lead (backup), clinic lead
(business-impact decisions).

**Tier-1 services:** booking flow (`/api/v1/public/booking/holds`,
`/patient/me/appointments`), auth (`/auth/login`, `/auth/refresh`),
notifications pipeline (Resend, NetGSM, Twilio, Meta WA).

**Anything in this file > anything in chat / Slack / a hallway conversation.**
If a procedure here looks wrong, fix the runbook in the same PR as the code.

---

## 0. Quick reference

| What | Where |
|---|---|
| Production API | https://api.uzmdroguzbak.com |
| Staging API | https://staging-api.uzmdroguzbak.com |
| Production web | https://uzmdroguzbak.com |
| Staging web | https://staging.uzmdroguzbak.com |
| API health | `GET /healthz` (root, no version prefix) |
| API readiness | `GET /readyz` (KV + DB ping) |
| CF dashboard | https://dash.cloudflare.com → Workers → `dr-bak-api` |
| CF Pages | https://dash.cloudflare.com → Pages → `dr-bak-web` |
| Neon | https://console.neon.tech → Project: drbak-prod (eu-central-1, Frankfurt) |
| Routines (this app's) | https://claude.ai/code/routines |
| Logs | CF Workers Observability → Tail → filter by `correlationId` |
| Runtime errors | Workers → Errors tab |
| Status / paging | UptimeRobot (HTTP) + CF synthetic checks (logged-in flow) |

## 1. Deploys

### Standard deploy (staging)

Every push to `main` deploys staging automatically once CI is green.
Workflow: `.github/workflows/deploy-staging.yml`. Smoke check at the end
hits `/healthz` (api) and `/` (web); a failure here pages on-call.

Manual re-run (if a transient CF API failure aborted the auto deploy):

```bash
gh workflow run deploy-staging.yml --ref main
```

### Standard deploy (production)

Production is **tag-gated** and **manual-approval-gated**. To cut a release:

1. Bump version in root `package.json` (`0.4.0` etc.); commit on `main`.
2. Tag: `git tag v0.4.0 && git push origin v0.4.0`
3. The `deploy-prod.yml` workflow opens; approve in GitHub UI:
   *Settings → Environments → production → reviewers*.
4. Watch the workflow:
   - `deploy-api-prod` runs first (so the web has a backend)
   - `deploy-web-prod` runs second
   - `smoke-prod` hits `/healthz` and the 5 locale homepages
5. If smoke fails, **don't roll forward** — start §2 rollback.

### Rollback

CF keeps every prior Worker / Pages version. Two tools:

**Workers (api):**
```bash
wrangler rollback --env production
# Or pick a specific version:
wrangler deployments list --env production
wrangler rollback <deployment-id> --env production
```

**Pages (web):** in the dashboard:
*CF Pages → dr-bak-web → Deployments → <prior green deploy> → Rollback to this deployment*.

**Tag-rerun:** as a third option, push a new tag pointing at the previous
green commit and re-run the prod workflow:
```bash
git tag v0.4.1 <prior-good-sha>
git push origin v0.4.1
```

**Rule:** prefer rollback over hotfix-roll-forward unless the bug is
isolated and fix-time < 30min. KVKK incidents always rollback first.

---

## 2. Incidents

### 2.1 Severity

| Severity | Signal | First-response SLA |
|---|---|---|
| **Sev-1** | Booking flow returns >5% 5xx for 5min · KVKK data exposure suspected · auth completely broken | Page on-call immediately; 15min ack |
| **Sev-2** | One locale or one channel down (e.g. SMS not sending) · degraded perf | 1h ack during clinic hours |
| **Sev-3** | Cosmetic / single-page issue · stale content | Next business day |

### 2.2 Sev-1 first 15 minutes

1. **Acknowledge.** Post in `#drbak-incident` (Slack) — start time, scope,
   one-line hypothesis.
2. **Stabilise, don't fix.** If anything in the last hour was a deploy:
   roll back (§1).
3. **Capture state.** `wrangler tail --env production --format pretty`,
   `gh run list --limit 5`, take a screenshot of the CF analytics dashboard.
4. **Decide blast radius.** Is this one user or all users? Is patient data
   leaking? If the answer to either is yes → §6 KVKK breach drill.
5. **Communicate.** Update `#drbak-incident` every 15 minutes. If it's
   patient-impacting and longer than 30min, the clinic lead notifies
   patients on the affected channel(s) by SMS/WA opt-in lists.

### 2.3 Postmortem

Within 5 working days. Template:
- **What happened** (timeline UTC, blameless)
- **What was the impact** (users affected, data exposed if any, KVKK obligations triggered)
- **Why** (5 whys; root cause, not surface trigger)
- **How will it not happen again** (3 concrete actions with owners + dates)

Post the postmortem in `docs/postmortems/YYYY-MM-DD-<slug>.md`.

---

## 3. Database (Neon Postgres EU Frankfurt)

### 3.1 Migrations

We never auto-apply migrations on deploy. Workflow:

1. Author the migration in `apps/api/src/infrastructure/db/migrations/`
   (Drizzle-Kit).
2. Test it locally against a Neon **branch** (free; spins up in <2s):
   ```bash
   neon branches create migration-test-<short-name> --parent main
   # Copy the new connection string into .dev.vars as DATABASE_URL
   pnpm --filter @dr-bak/api db:migrate
   pnpm --filter @dr-bak/api test
   ```
3. Apply against staging:
   ```bash
   wrangler secret put DATABASE_URL --env staging  # (or pre-set)
   pnpm --filter @dr-bak/api db:migrate -- --env staging
   ```
4. Run staging integration tests; let it bake for ≥ 24 hours.
5. **Schedule** the production migration during the lowest-traffic window
   (currently 03:00–05:00 Europe/Istanbul).
6. Take a Neon snapshot of production (one click; named
   `pre-<migration>-<date>`).
7. Apply against production:
   ```bash
   pnpm --filter @dr-bak/api db:migrate -- --env production
   ```
8. Smoke-check: `curl /healthz`, sample a real read query in Neon SQL
   editor, then re-enable any traffic that was paused.

### 3.2 Restore from snapshot

Neon point-in-time restore: dashboard → Project → Branches → Restore.
Choose timestamp; restore creates a *new branch* — switch the production
Worker's `DATABASE_URL` Hyperdrive to that branch's connection string,
verify, then promote the branch to `main`.

```bash
# After restore branch is ready in Neon UI:
wrangler secret put DATABASE_URL --env production  # paste new conn string
# Smoke test, then in Neon: Promote restored branch → main
```

KVKK note: if restoring rolls back a `dsarErase` event, you must replay
the erasure immediately. The audit log captures every erasure; query
`audit_events WHERE action='dsar_erase' AND timestamp > <restore_point>`.

### 3.3 Hyperdrive cache invalidation

Hyperdrive caches connection pools per Worker isolate. After a key rotation
or DB migration that changes auth, you may need to force a refresh:

```bash
# Bumps the Worker version; new isolates get fresh Hyperdrive pools
wrangler deploy --env production
```

---

## 4. Key + secret rotation

All Worker secrets are managed via `wrangler secret put <name> --env <env>`.
**Never** commit secrets. Never paste secrets in Slack.

### 4.1 JWT signing key (ES256, P-256)

Rotation cadence: **quarterly**. The Worker reads `JWT_SIGNING_KID` to
identify the active key; old tokens (15min TTL) drain naturally.

```bash
# 1. Generate new key pair (locally, in a tmpdir)
openssl ecparam -name prime256v1 -genkey -noout -out priv.pem
openssl ec -in priv.pem -pubout -out pub.pem

# 2. Stage as the *next* key (don't activate yet)
wrangler secret put JWT_SIGNING_PRIVATE_KEY_NEXT --env production < priv.pem
wrangler secret put JWT_SIGNING_PUBLIC_KEY_NEXT --env production < pub.pem
NEW_KID=$(date -u +%Y%m%d)
echo "$NEW_KID" | wrangler secret put JWT_SIGNING_KID_NEXT --env production

# 3. Deploy a release that accepts both keys (kid-aware verifier)
# Already implemented: app verifies any kid in the JWKS array.

# 4. Promote — flip _NEXT into the current slot
wrangler secret put JWT_SIGNING_PRIVATE_KEY --env production < priv.pem
wrangler secret put JWT_SIGNING_PUBLIC_KEY --env production < pub.pem
echo "$NEW_KID" | wrangler secret put JWT_SIGNING_KID --env production

# 5. Wait > TOKEN_ACCESS_TTL_SECONDS (15min). Then drop _NEXT.
wrangler secret delete JWT_SIGNING_PRIVATE_KEY_NEXT --env production
wrangler secret delete JWT_SIGNING_PUBLIC_KEY_NEXT --env production
wrangler secret delete JWT_SIGNING_KID_NEXT --env production

# 6. Securely destroy local copies
shred -u priv.pem pub.pem
```

### 4.2 Other credentials

| Secret | Vendor | Rotation | How |
|---|---|---|---|
| `DATABASE_URL` | Neon | On compromise / yearly | Neon dashboard → Roles → Reset password → `wrangler secret put` |
| `RESEND_API_KEY` | Resend | Yearly | Resend dashboard → API Keys → Rotate |
| `NETGSM_USERNAME` / `NETGSM_PASSWORD` | NetGSM | Yearly | NetGSM portal; sender ID İYS-bound, do not change ID |
| `TWILIO_AUTH_TOKEN` | Twilio | Yearly | Twilio console → Account → Auth Tokens (use secondary token rotation) |
| `META_WA_ACCESS_TOKEN` | Meta WhatsApp | 60d (Meta enforces) | Meta Business → System User → Refresh access token |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud | Yearly | Google Cloud Console → OAuth credentials |
| `JITSI_APP_SECRET` | Jitsi-as-a-Service | Yearly | JaaS console → Apps → Regenerate secret |
| `ADMIN_BOOTSTRAP_EMAIL` | n/a | One-time | Set, used to grant first admin role, then remove |

### 4.3 Compromise drill

If a secret is suspected to have leaked:

1. Rotate immediately (don't wait for the cadence window).
2. Audit: query `audit_events` for any unusual access in the suspected
   leak window.
3. If JWT signing key: short-circuit by setting
   `wrangler secret put SESSION_INVALIDATE_BEFORE --env production` to a
   timestamp that forces all sessions to re-auth.
4. Notify clinic lead within 1 hour of confirmation.
5. KVKK Madde 12 requires breach notification to the data protection
   authority (KVKK Kurulu) within 72 hours of becoming aware. The clinic
   data protection officer files this; engineering provides the technical
   facts (what was exposed, for how long, mitigation).

---

## 5. Notifications pipeline

### 5.1 Channel-by-channel troubleshooting

**Email (Resend)**
- 422 from Resend: domain auth (DKIM/SPF) drifted. Check Resend dashboard
  → Domains; redo DNS at Cloudflare DNS.
- Bounce rate > 5%: pause the producer, check `outbound_emails` rows for
  malformed addresses (regression guard); add to suppression list.

**SMS (NetGSM, TR-domestic)**
- 401 / "yetkisiz gönderici": sender ID got de-İYS'd. Re-verify İYS
  binding via NetGSM support. **Do not send marketing SMS until restored**
  — TR fines are personal-data-level.
- Reaches but not delivered: check `audit_events` for SMS provider
  response code; consult NetGSM error map.

**SMS (Twilio, non-TR)**
- 21610 unsubscribed: respect, mark in `consent_records`.
- 30007 message filtered: typically content-pattern; review template.

**WhatsApp (Meta Cloud API)**
- "Template paused": Meta paused our template due to user reports. Open a
  case in Meta Business Support; submit a new template variant; wait 24h
  for review.
- "Phone number quality medium/low": review last 7d delivery; lower the
  send rate; wait for quality to recover (2–7 days typical).

**Telehealth (Jitsi-as-a-Service)**
- Room JWT rejected: `JITSI_APP_ID` or `JITSI_APP_SECRET` mismatch with
  the JaaS app config. Re-check both, regenerate secret if uncertain.
- "Room not found": the `appointments.telehealth_join_url` HMAC has a
  short TTL; if the patient clicks the link far before the appointment,
  it's expected.

### 5.2 DLQ drain

The notifications queue retries 5 times then routes to a DLQ
(`drbak-notifications-dlq`). To drain manually after the cause is fixed:

```bash
# List DLQ messages (admin route, requires admin auth)
curl -H "Cookie: __Secure-drbak_at=..." \
     https://api.uzmdroguzbak.com/api/v1/admin/queues/notifications/dlq

# Re-enqueue all
curl -X POST -H "Cookie: ..." \
     https://api.uzmdroguzbak.com/api/v1/admin/queues/notifications/dlq/redrive
```

---

## 6. KVKK breach drill

**Trigger:** any of the following happen — special-category data leaves the
EU boundary; an unauthorised third party accesses patient data; admin
credentials are lost without immediate rotation.

### Steps (in order)

1. **Stabilise** — rotate the leaked secret, pull the offending Worker
   version, freeze the `dsarErase` flow if applicable.
2. **Quantify** — query `audit_events` for the exposure window. Pull a
   list of affected `user_ids`. **Do not** export this list outside the
   EU region.
3. **Notify clinic data protection officer.**
4. **Within 72h:** clinic DPO files breach notification with KVKK Kurulu
   (https://www.kvkk.gov.tr/) — engineering supplies:
   - Date/time of exposure window
   - Categories of data (auth, contact, medical, imaging, etc.)
   - Number of affected data subjects
   - Mitigation taken
5. **Within 72h–7d:** affected data subjects notified individually if the
   exposure included special-category data, by email + SMS in the
   patient's locale.
6. **Within 30d:** postmortem published in `docs/postmortems/`; controls
   added to prevent recurrence.

GDPR (for AR/EN/FR/ES visitors from EU): the timing windows match KVKK; the
notification destination is the lead supervisory authority (likely
Ireland's DPC if hosting goes through CF EU edge).

---

## 7. WAF + abuse playbook

### 7.1 Live attack mitigation

CF Bot Score < 30 + spike on `/auth/login` → already rate-limited (see
`infrastructure/wal-rules.md` §3). If the attacker shifts to a
non-rate-limited endpoint:

```bash
# Open Cloudflare → Security → WAF → Custom Rules
# Add (block) rule:
#   (cf.threat_score gt 50 and http.request.uri.path contains "<path>")
# Note the rule id; remove it after the attack abates.
```

### 7.2 Patient receiving spam SMS

If a patient reports unsolicited SMS:

1. Confirm consent state: `SELECT * FROM consent_records WHERE user_id =
   '...' ORDER BY created_at DESC`. The most recent
   `marketing_communications` record is the source of truth.
2. If consent is `revoked` and an SMS still went out, this is a Sev-1
   compliance issue — pause the SMS notifier:
   ```bash
   wrangler secret put NOTIFICATIONS_PAUSE_SMS --env production
   # Set value to "1"; the consumer checks this on every dispatch.
   ```
3. Investigate the regression in code review.

---

## 8. Admin bootstrap (first-admin)

The first admin account is bootstrapped via the
`ADMIN_BOOTSTRAP_EMAIL` secret. After register:

```bash
# 1. The admin self-registers via the public flow with this exact email
# 2. The Worker grants admin role on first verified login (one-time)
# 3. Remove the bootstrap secret immediately
wrangler secret delete ADMIN_BOOTSTRAP_EMAIL --env production
```

After the first admin exists, additional admins are promoted via the
existing admin (`POST /api/v1/admin/users/:id/role`).

---

## 9. Cron schedule

The API runs three cron triggers (see `apps/api/wrangler.toml`):

| Cron | Job | Backfill on miss? |
|---|---|---|
| `*/5 * * * *` | Appointment-reminder dispatcher (T-24h, T-1h sweeps) | Yes — picks up missed sweeps from `outbound_*` tables |
| `0 3 * * *` | KVKK audit-log archival (move > 30d to R2) | Yes — picks up next run |
| `*/10 * * * *` | Slot-hold reaper (also done lazily on read) | No-op if up to date |

To pause crons in an incident:

```bash
# Worker won't accept cron events while paused; fetch traffic continues.
wrangler triggers list --env production
# CF dashboard → Workers → dr-bak-api → Settings → Triggers → Disable
```

Re-enable from the same UI when the incident clears.

---

## 10. Common one-liners

```bash
# Tail prod logs filtered to a correlation id
wrangler tail --env production --format pretty | grep <correlation-id>

# Count 5xx in last hour from CF logs
# (Use CF Workers Observability UI — no CLI for this yet)

# Recent migrations
ls apps/api/src/infrastructure/db/migrations/

# Force-revoke a single user's sessions (logout everywhere)
curl -X POST -H "Cookie: <admin-cookie>" \
  https://api.uzmdroguzbak.com/api/v1/admin/users/<id>/sessions/revoke

# DSAR / right-to-erasure (admin only; double-confirmation required)
curl -X POST -H "Cookie: <admin-cookie>" \
  -H "X-Confirm-Erase: EVET, KALICI OLARAK SİL" \
  https://api.uzmdroguzbak.com/api/v1/admin/users/<id>/erase
```

---

## 11. What this runbook deliberately doesn't cover

- **Patient-clinical decisions** — that's the doctor, not engineering.
- **Aesthetic services site** (`/estetik`) — Phase 3+ sub-brand split; not
  in this runbook scope.
- **Marketing campaign lifecycle** — see `marketing/launch-plan.md` and
  `marketing/content-calendar.csv`.
- **Specific patient contact procedures** — handled by clinic, not ops.

When in doubt: **prefer rollback. Prefer transparency in the incident
channel. Prefer ack the on-call SLA over solving the problem alone.**
