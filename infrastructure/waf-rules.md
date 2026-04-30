# Cloudflare WAF + rate-limit rules — Dr. Bak

**Apply at:** Cloudflare dashboard → `uzmdroguzbak.com` → Security → WAF /
Rate Limiting / Custom Rules. The free + Pro plans cover everything below;
no Enterprise feature is required.

**Why this file exists:** WAF state is invisible in source unless we
mirror it here. Every change in the dashboard gets a one-line PR appending
to §10 (changelog) so we can correlate a behaviour shift with a config
shift after the fact.

---

## 1. Edge defaults (Security Level)

| Zone | Setting |
|---|---|
| `uzmdroguzbak.com` | Security level: **High** |
| Browser Integrity Check | **On** |
| Challenge Passage | **30 minutes** |
| Always Use HTTPS | **On** |
| Min TLS Version | **1.2** |
| TLS 1.3 | **On** |
| Automatic HTTPS Rewrites | **On** |
| Opportunistic Encryption | **On** |
| HSTS | `max-age=31536000; includeSubDomains; preload` (after T+30 days) |

The HSTS preload commitment is a one-way door — only enable
`includeSubDomains` after every subdomain (api., staging., staging-api.)
is verified HTTPS-clean.

## 2. Bot management

We use the free **Bot Fight Mode** at launch; upgrade to Super Bot Fight
Mode if abuse persists.

- Bot Fight Mode: **On**
- Static resources challenge: **On**
- AI bots (training scrapers): **Block** — except the LLM-citation
  crawlers we explicitly want (GPTBot, ChatGPT-User, PerplexityBot,
  ClaudeBot, Google-Extended) which are allowed via robots.txt.

**Why we allow some "AI bots":** AEO/GEO posture (`marketing/seo-plan.md`
§7). We want our practitioner-voiced content cited in AI answers.

## 3. Rate-limit rules

These run *before* the Worker handler — they shed traffic at the edge.

### 3.1 Auth login (anti-credential-stuffing)

```
Name:        rl-auth-login
Match:       (http.request.uri.path eq "/api/v1/auth/login" and http.request.method eq "POST")
Characteristics: ip.src
Period:      10s
Requests:    5
Action:      Managed Challenge (then Block on second offense)
```

Mirrors the per-(IP+email) 5/15min limit inside the Worker; this catches
slow grinds that the Worker's per-account lockout would only flag at
account-level.

### 3.2 Auth refresh

```
Name:        rl-auth-refresh
Match:       (http.request.uri.path eq "/api/v1/auth/refresh")
Characteristics: ip.src
Period:      60s
Requests:    20
Action:      Managed Challenge
```

### 3.3 Public booking (slot-hold abuse)

```
Name:        rl-booking-holds
Match:       (http.request.uri.path eq "/api/v1/public/booking/holds" and http.request.method eq "POST")
Characteristics: ip.src
Period:      60s
Requests:    10
Action:      Managed Challenge
```

DO-level slot lock prevents double-bookings; this prevents an attacker
from exhausting the hold pool for a single day.

### 3.4 Public availability (scraping)

```
Name:        rl-public-availability
Match:       (http.request.uri.path eq "/api/v1/public/availability")
Characteristics: ip.src
Period:      60s
Requests:    60
Action:      JS Challenge
```

60/min per IP is generous for legitimate users (browsing 14 days × 5 svcs
= 70 ideally caches), tight for a scraper.

### 3.5 Patient writes (idempotency-key required)

```
Name:        rl-patient-writes
Match:       (starts_with(http.request.uri.path, "/api/v1/patient/me") and
              (http.request.method eq "POST" or http.request.method eq "PUT" or http.request.method eq "DELETE"))
Characteristics: ip.src + http.request.headers["x-correlation-id"]
Period:      60s
Requests:    30
Action:      Block
```

## 4. Custom firewall rules (block / challenge)

### 4.1 Idempotency-Key required on writes

Server middleware also enforces this, but defence-in-depth:

```
Name:    block-no-idempotency-key
Match:
  (http.request.method in {"POST" "PUT" "PATCH"} and
   starts_with(http.request.uri.path, "/api/v1/") and
   not http.request.uri.path in {"/api/v1/auth/login" "/api/v1/auth/refresh" "/api/v1/auth/logout" "/api/v1/auth/email/verify"} and
   not any(http.request.headers["idempotency-key"][*] != ""))
Action: Block
Description: every mutating endpoint requires Idempotency-Key
```

The exception list above covers auth endpoints which intentionally don't
take an idempotency key (they're naturally idempotent or single-use).

### 4.2 Admin route geofence

Admin routes restricted to TR + (clinic engineer's home country). This is
a tripwire — if a stolen admin session is used from outside the geo
allow-list, it gets challenged.

```
Name:    challenge-admin-non-tr
Match:
  (starts_with(http.request.uri.path, "/api/v1/admin") and
   not ip.geoip.country in {"TR"})
Action:  Managed Challenge
Description: admin routes geofenced — challenge non-TR access
```

If the on-call engineer is travelling abroad and needs admin access:
either (a) connect through a TR VPN exit, or (b) temporarily disable the
rule from the dashboard and re-enable on return. Document each disable
in §10 with start/end timestamps.

### 4.3 Block known abusive paths

```
Name:    block-php-wp-probes
Match:
  (http.request.uri.path matches "(?i).*\\.(php|asp|aspx|cgi|jsp)$" or
   http.request.uri.path matches "(?i)/(wp-admin|wp-login|xmlrpc|phpmyadmin|.env|.git|\\.aws).*")
Action:  Block
Description: noisy probes; we don't run any of these
```

### 4.4 Block invalid Host header

```
Name:    block-bad-host
Match:
  (not http.host in {"uzmdroguzbak.com" "api.uzmdroguzbak.com" "staging.uzmdroguzbak.com" "staging-api.uzmdroguzbak.com"})
Action:  Block
Description: requests with arbitrary Host headers are scanners
```

### 4.5 Allow EU/MENA, challenge known-abuse geos

We don't outright block any country — the patient base includes
medical-tourism visitors from many places. But high-abuse countries get
Managed Challenge:

```
Name:    challenge-high-abuse-geos
Match:
  (ip.geoip.country in {"CN" "RU" "KP" "VN"})
  and
  not http.request.uri.path matches "^/(robots\\.txt|sitemap\\.xml|favicon\\.ico|fonts/.*)"
Action:  Managed Challenge
Description: high-abuse geos challenged at edge; static assets pass through
```

(Static-asset exception so legitimate AI training crawlers from those
geos can still grab `robots.txt` and `sitemap.xml`.)

## 5. Page rules / Cache rules

```
Cache rule: cache-static-assets
Match:      (http.request.uri.path matches "^/(fonts|og|images|icons)/.*")
Edge TTL:   1 month
Browser TTL: 1 week

Cache rule: bypass-cache-auth
Match:      (starts_with(http.request.uri.path, "/api/v1/auth") or
             starts_with(http.request.uri.path, "/api/v1/patient") or
             starts_with(http.request.uri.path, "/api/v1/admin"))
Cache:      Bypass

Cache rule: cache-public-readonly
Match:      (http.request.uri.path matches "^/api/v1/public/(services|content|testimonials)$" and
             http.request.method eq "GET")
Edge TTL:   60 seconds
Cache key:  include "Accept-Language" + Cookie:locale
```

Public availability is **not** cached (slot grid changes minute-to-minute).

## 6. Managed Rulesets

Enable:
- **Cloudflare Managed Ruleset** (default sensitivities)
- **OWASP Core Ruleset** at *paranoia level 2*
- **Cloudflare Exposed Credentials Check** — blocks logins with
  known-leaked passwords (defence-in-depth on top of our Argon2id hashing
  + rate limiter)

## 7. CSP / security headers

These are emitted by the Worker (`securityHeadersMiddleware`), not by CF.
Listed here for cross-reference:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.uzmdroguzbak.com https://staging-api.uzmdroguzbak.com;
  frame-src https://challenges.cloudflare.com https://8x8.vc;  /* CF Turnstile + Jitsi */
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(self), geolocation=()
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

If a CSP violation report arrives from a real user, it's logged through
the Worker's structured-JSON logger; CF's Page Shield (Pro+) would also
surface it.

## 8. Origin server isolation

The api Worker sits behind a Worker route; there is no traditional origin
to lock down. The web is on CF Pages — same posture.

The Neon Postgres connection is locked to:
- IP allow-list: Cloudflare Hyperdrive egress IPs only (Neon dashboard →
  IP Allow → paste from https://www.cloudflare.com/ips-v4)
- Connection requires SSL (sslmode=require)

## 9. Verification commands

After every WAF rule change:

```bash
# 1. Sample request: confirm rate-limit fires
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    https://api.uzmdroguzbak.com/api/v1/auth/login \
    -H 'Content-Type: application/json' -d '{"email":"x@x","password":"x"}'
done
# Expected: first 5 → 401, then Managed Challenge HTML response

# 2. Geofence: hit /admin without TR IP (use a non-TR proxy)
#    Expected: Managed Challenge

# 3. Idempotency-Key: write without the header
curl -X POST https://api.uzmdroguzbak.com/api/v1/patient/me/appointments \
  -H "Cookie: __Secure-drbak_at=..." \
  -H "Content-Type: application/json" -d '{}'
# Expected: blocked at edge (CF block page) — never reaches the Worker
```

## 10. Changelog

Append a one-liner here on every WAF change. Keep dashboard ↔ runbook in
sync.

```
2026-04-30  Initial ruleset authored (this file).
```

## 11. What this doesn't include

- **Enterprise-only features** (Bot Score thresholds, Page Shield deep
  inspection) — note for upgrade decision in 6 months once we have an
  abuse baseline.
- **Geographic blocking** (vs Managed Challenge) — we keep the door open
  for medical-tourism patients; we challenge, not block.
- **Per-account IP allow-listing** for admin sessions — adds friction; we
  rely on geofence + WebAuthn 2FA + short admin session TTL instead.
