# DNS migration plan — `uzmdroguzbak.com` → Cloudflare

**Goal:** cut over `uzmdroguzbak.com` from the current host (the legacy
WordPress-style site) to Cloudflare Pages + Workers without a downtime
window the patient can see.

**Approval:** clinic lead + on-call engineer; T-1 week of launch.

**Reversibility:** *fully reversible* up to the moment we delete the old
DNS records at the legacy registrar. The plan keeps the old site warm
through T+48h of launch as a fallback.

---

## 1. Current state (T-2 weeks)

Inferred from `whois uzmdroguzbak.com` and a HEAD request to the live
site:

| Record | Type | Value (current) | TTL |
|---|---|---|---|
| `uzmdroguzbak.com` | A | (legacy host IP) | 86400 (24h) |
| `www.uzmdroguzbak.com` | CNAME | `uzmdroguzbak.com` | 86400 |
| MX | (legacy mail provider) | — | 86400 |
| TXT (SPF/DKIM/DMARC) | various | — | 86400 |

**Registrar:** to be confirmed; whois says GoDaddy. **Authoritative DNS:**
currently the registrar's nameservers, NOT Cloudflare yet.

**Plan:** move authoritative DNS to Cloudflare; keep MX + email TXT
intact; add CF Pages + Workers records pointing to the new app.

## 2. Target state (post-cutover)

| Record | Type | Value | Proxy | TTL |
|---|---|---|---|---|
| `uzmdroguzbak.com` | A | (CF Pages internal) | Proxied (orange cloud) | Auto |
| `www.uzmdroguzbak.com` | CNAME | `uzmdroguzbak.com` | Proxied | Auto |
| `api.uzmdroguzbak.com` | CNAME | `uzmdroguzbak.com` (Worker route) | Proxied | Auto |
| `staging.uzmdroguzbak.com` | CNAME | `dr-bak-web-staging.pages.dev` | Proxied | Auto |
| `staging-api.uzmdroguzbak.com` | CNAME | `uzmdroguzbak.com` (Worker route) | Proxied | Auto |
| MX | (legacy mail) | unchanged | DNS-only (grey cloud) | Auto |
| TXT — SPF | `v=spf1 include:resend.com -all` | DNS-only | Auto |
| TXT — DKIM (Resend) | (provided by Resend) | DNS-only | Auto |
| TXT — DMARC | `v=DMARC1; p=quarantine; rua=mailto:dmarc@uzmdroguzbak.com` | DNS-only | Auto |
| CAA | `0 issue "letsencrypt.org"`, `0 issue "pki.goog"`, `0 issuewild ";"` | DNS-only | Auto |

The `dmarc` mailbox lives at the existing legacy mail provider; reports
go there for now. SPF includes Resend; if NetGSM/Twilio need email,
they'll be added when we onboard them.

CAA whitelists the cert authorities CF uses (Let's Encrypt and Google
PKI) and explicitly forbids any wildcard issuance.

## 3. Timeline

```
T-2 weeks (Mon)  Confirm registrar credentials. Onboard zone to CF.
T-12 days        TTL pre-lower: drop all current TTLs to 300s.
T-7 days         Verify TTL drop has propagated globally (use dig +trace from 5 geos).
T-7 days         Add staging records first; verify staging-api + staging web work end-to-end.
T-3 days         Final dry-run of cutover steps in §4 against staging-api → fresh CNAMEs.
T-1 day  04:00   CUTOVER WINDOW START (lowest patient-traffic window).
T-1 day  04:30   Switch authoritative NS at registrar to Cloudflare.
T-1 day  05:00   Verify resolution from 5 external resolvers (1.1.1.1, 8.8.8.8, 9.9.9.9, 208.67.222.222, regional TR DNS).
T-1 day  06:00   Smoke-test the live site (5 locales, booking flow, login).
T-0 day          LAUNCH — see marketing/launch-plan.md.
T+48h            Old host can be decommissioned.
T+1 week         TTLs raised back to "Auto" (CF default 1h proxied).
```

## 4. Cutover steps (the actual procedure)

### 4.1 T-2 weeks — Onboard zone to Cloudflare

```bash
# Cloudflare dashboard → Add a Site → enter `uzmdroguzbak.com`
# CF imports current records via DNS scrape (manually verify completeness
# against the legacy registrar's record list — scrapes can miss MX or TXT
# that don't resolve at scrape time).

# Verify import is exhaustive:
dig +noall +answer uzmdroguzbak.com ANY @<legacy-ns>
# Cross-reference every line against the CF DNS dashboard.
```

### 4.2 T-12 days — Pre-lower TTL

In the **legacy registrar's** DNS panel, drop every TTL to 300s. This
gives caches 5 minutes to flush by cutover time.

```bash
# Verify TTL drop has hit upstream resolvers:
dig +noall +answer uzmdroguzbak.com    # Should show "300" instead of "86400"
dig +noall +answer www.uzmdroguzbak.com
```

If the legacy registrar enforces a min TTL > 300s, document the actual
value and add equivalent buffer to the cutover window.

### 4.3 T-7 days — Add CF records (zone still on legacy NS)

Add the staging + production records in CF (they won't resolve yet
because the zone is authoritative on the legacy NS, but CF stages them
ready):

- `uzmdroguzbak.com` A → CF Pages
- `www` CNAME → root
- `api` CNAME → Worker route
- `staging` CNAME → `dr-bak-web-staging.pages.dev`
- `staging-api` CNAME → Worker route

In `wrangler.toml` (already configured), routes are:
- `staging-api.uzmdroguzbak.com/*`
- `api.uzmdroguzbak.com/*`

### 4.4 T-7 days — Test against staging

```bash
# Add a hosts override locally to test before NS switch:
# 127.0.0.1 staging.uzmdroguzbak.com  → won't work for HTTPS
# Better: use --resolve to force the host header path:
curl -v --resolve staging.uzmdroguzbak.com:443:<cf-anycast-ip> \
  https://staging.uzmdroguzbak.com/

# Or just visit the *.pages.dev URL directly; record this as a known
# working baseline before switching production.
```

Verify all 5 locales return 200; verify a sample booking flow on
staging.

### 4.5 T-1 day 04:00 — Cutover window begins

1. Brief the on-call channel: cutover starting; expected window 60min.
2. Have the legacy registrar's panel + CF dashboard open in parallel
   tabs.
3. Have rollback runbook (this file §5) printed / pinned.

### 4.6 T-1 day 04:30 — Switch authoritative NS at registrar

In the legacy registrar's panel:

```
Current NS:
  ns01.legacyhost.com.
  ns02.legacyhost.com.

New NS (from CF dashboard → DNS → API tokens; CF assigns 2 NS):
  rita.ns.cloudflare.com.   (example — CF assigns the actual values)
  hugo.ns.cloudflare.com.
```

Replace, save. Propagation begins.

### 4.7 T-1 day 05:00 — Verify resolution

```bash
# Check NS propagation from 5 geos:
for resolver in 1.1.1.1 8.8.8.8 9.9.9.9 208.67.222.222 195.175.39.49; do
  echo "=== $resolver ==="
  dig +short NS uzmdroguzbak.com @$resolver
  dig +short uzmdroguzbak.com @$resolver
done

# Should resolve to CF anycast IPs (104.x.x.x or 172.x.x.x range with
# the proxied orange-cloud).
```

If any resolver is still on the old NS after 60min, that resolver has
its own caching — usually ISP-level. Wait or escalate to the ISP's NOC;
do *not* attempt to fix this by reverting CF.

### 4.8 T-1 day 06:00 — Smoke test

```bash
# 5 locale homepages
for path in / /ar /en /fr /es; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://uzmdroguzbak.com${path}")
  echo "$path → $code"
done

# API healthz
curl https://api.uzmdroguzbak.com/healthz

# Booking flow (anon path)
curl https://api.uzmdroguzbak.com/api/v1/public/services
curl "https://api.uzmdroguzbak.com/api/v1/public/availability?serviceId=svc_neuro_consult&date=2026-05-15&deliveryMode=in_person&locale=tr"

# Cookie-bearing login (manual via browser)
# Email send (trigger via dry-run booking on staging if production is too risky)
```

### 4.9 T-0 — Launch announcements (separate runbook)

See `marketing/launch-plan.md` Launch Day timeline. DNS is settled before
the announcement goes out.

### 4.10 T+48h — Decommission old host

Only after 48h of clean prod operation:
- Cancel hosting at the legacy host
- Keep the registrar account (we still use them for the domain itself)
- Remove the legacy A record (it's already not authoritative; this is
  housekeeping)

### 4.11 T+1 week — Raise TTLs back

In CF dashboard, set every record's TTL to "Auto" (CF default for
proxied records is ~5 min, which is fine).

## 5. Rollback

If at any point during the cutover something is wrong:

1. **Don't panic.** TTL is 300s — even with full cache, propagation back
   is at most 5 minutes.
2. **Revert NS at registrar:**
   ```
   ns01.legacyhost.com.
   ns02.legacyhost.com.
   ```
3. **Notify on-call channel:** "Rolling back DNS; legacy site live again
   in ~5min."
4. **Verify rollback:**
   ```bash
   for resolver in 1.1.1.1 8.8.8.8; do
     dig +short uzmdroguzbak.com @$resolver
   done
   # Should be the legacy IP again.
   ```
5. **Diagnose** what went wrong; fix; retry the next night's window.

The CF zone stays staged — it's not destructive, it's just paused.

## 6. Email + Resend domain auth

Resend uses DKIM + Return-Path subdomain delegation. Add **before** the
first transactional email send:

```
TXT  resend._domainkey.uzmdroguzbak.com  → (Resend dashboard provides)
TXT  send.uzmdroguzbak.com               → (Resend dashboard provides — for return-path)
MX   send.uzmdroguzbak.com  10 → feedback-smtp.eu-west-1.amazonses.com
SPF  uzmdroguzbak.com:  add "include:amazonses.com" if not present
DMARC v=DMARC1; p=quarantine; rua=mailto:dmarc@uzmdroguzbak.com
```

Wait for Resend to verify (5min–4h). Send a test email to a Gmail
address and inspect the headers — DKIM=pass, SPF=pass, DMARC=pass.

## 7. Subdomain TLS (CF Universal SSL)

CF issues universal SSL automatically when a record is proxied (orange
cloud). One subtle gotcha: CF universal SSL covers `*.uzmdroguzbak.com`
but **only one level deep**. If we ever add `staging.api.uzmdroguzbak.com`
(two levels), we need an Advanced Certificate (paid). Right now we don't.

## 8. CAA — what to set, why

```
0  issue       letsencrypt.org
0  issue       pki.goog
0  issue       digicert.com    ← only if a paid CF cert is purchased; remove otherwise
0  issuewild   ;               ← bans wildcard issuance
0  iodef       mailto:security@uzmdroguzbak.com
```

CAA tells the world which CAs are allowed to issue certificates for our
domain. Without it, any compromised CA can mint a valid cert; with it, a
wider compromise is required.

## 9. Verification matrix

After cutover, walk through this checklist:

- [ ] `dig NS uzmdroguzbak.com` returns CF nameservers from 3 different resolvers
- [ ] HTTPS works for `https://uzmdroguzbak.com` (no cert warning)
- [ ] HTTPS works for `https://www.uzmdroguzbak.com` (redirect to root)
- [ ] HTTPS works for `https://api.uzmdroguzbak.com/healthz`
- [ ] HTTPS works for `https://staging.uzmdroguzbak.com`
- [ ] All 5 locale homepages return 200
- [ ] HSTS header is present (`curl -I` and grep `strict-transport-security`)
- [ ] CSP header is present and complete
- [ ] Email smoke send: from `info@uzmdroguzbak.com` → external Gmail
      passes DKIM + SPF + DMARC
- [ ] Inbound mail to `info@uzmdroguzbak.com` still works
- [ ] CF Pages "Custom domains" tab shows "Active" for both
      `uzmdroguzbak.com` and `staging.uzmdroguzbak.com`
- [ ] CF dashboard → Workers → `dr-bak-api` shows the `api.` route as
      bound

## 10. What this plan deliberately doesn't include

- **Email migration to a new provider** — staying on the legacy mail
  host through launch; only Resend (transactional from `info@`) is
  added.
- **Multi-region DNS / GeoDNS** — not needed at our scale.
- **DNSSEC** — supported by CF; enable post-launch (T+30 days) once the
  zone is stable. Document signing-key rotation in the runbook when
  enabled.
- **DDoS-specific config** — CF default DDoS protection is on by
  default; specific rules are in `infrastructure/waf-rules.md`.
