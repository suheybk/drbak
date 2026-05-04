#!/usr/bin/env python3
"""
One-shot Cloudflare provisioning for drbak.

Reads CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, DATABASE_URL_STAGING,
DATABASE_URL_PRODUCTION from apps/api/.dev.vars (gitignored). Creates:

  - 12 KV namespaces (4 bindings × 3 envs: dev / staging / production)
  - 6  R2 buckets    (2 bindings × 3 envs)
  - 12 Queues        (4 queues × 3 envs — 2 producers + 2 DLQs each)
  - 2  Hyperdrive configs (staging + production; dev uses local DB)
  - 2  Pages projects (dr-bak-web-staging + dr-bak-web)

Idempotent: if a resource with the target name already exists, reuses
its ID instead of failing.

Outputs `scripts/cf-resources.json` with the full ID map. The patch
step (apply-cf-ids.py) reads that and rewrites apps/api/wrangler.toml.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Optional
from urllib import error as urlerror
from urllib import request

ROOT = Path(__file__).resolve().parent.parent
DEV_VARS = ROOT / "apps" / "api" / ".dev.vars"
RESULTS = ROOT / "scripts" / "cf-resources.json"


def load_dev_vars() -> dict[str, str]:
    out: dict[str, str] = {}
    for line in DEV_VARS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip()
    return out


def cf_call(
    token: str,
    method: str,
    path: str,
    body: Optional[dict] = None,
    *,
    quiet: bool = False,
) -> dict:
    url = f"https://api.cloudflare.com/client/v4{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urlerror.HTTPError as e:
        body_str = e.read().decode("utf-8", errors="replace")
        if not quiet:
            print(f"  ! HTTP {e.code} on {method} {path}: {body_str[:200]}")
        try:
            return json.loads(body_str)
        except json.JSONDecodeError:
            return {"success": False, "errors": [{"code": e.code, "message": body_str[:300]}]}


def get_or_create_kv(token: str, account: str, title: str) -> str:
    page = 1
    while True:
        r = cf_call(
            token,
            "GET",
            f"/accounts/{account}/storage/kv/namespaces?page={page}&per_page=100",
            quiet=True,
        )
        for ns in r.get("result") or []:
            if ns.get("title") == title:
                return ns["id"]
        if (r.get("result_info") or {}).get("count", 0) < 100:
            break
        page += 1
    r = cf_call(
        token, "POST", f"/accounts/{account}/storage/kv/namespaces", {"title": title}
    )
    if not r.get("success"):
        raise RuntimeError(f"KV create failed for {title}: {r.get('errors')}")
    return r["result"]["id"]


def ensure_r2(token: str, account: str, name: str, location_hint: str = "weur") -> None:
    r = cf_call(token, "GET", f"/accounts/{account}/r2/buckets", quiet=True)
    existing = {b["name"] for b in (r.get("result") or {}).get("buckets", [])}
    if name in existing:
        return
    r = cf_call(
        token,
        "POST",
        f"/accounts/{account}/r2/buckets",
        {"name": name, "locationHint": location_hint},
    )
    if not r.get("success"):
        raise RuntimeError(f"R2 create failed for {name}: {r.get('errors')}")


def get_or_create_queue(token: str, account: str, name: str) -> str:
    r = cf_call(token, "GET", f"/accounts/{account}/workers/queues", quiet=True)
    for q in r.get("result") or []:
        if q.get("queue_name") == name:
            return q["queue_id"]
    r = cf_call(
        token,
        "POST",
        f"/accounts/{account}/workers/queues",
        {"queue_name": name},
    )
    if not r.get("success"):
        raise RuntimeError(f"Queue create failed for {name}: {r.get('errors')}")
    return r["result"]["queue_id"]


def get_or_create_hyperdrive(
    token: str, account: str, name: str, conn: str
) -> str:
    r = cf_call(token, "GET", f"/accounts/{account}/hyperdrive/configs", quiet=True)
    for h in r.get("result") or []:
        if h.get("name") == name:
            return h["id"]
    # Parse connection string into Hyperdrive-expected fields
    # postgres://user:pass@host:port/db?...  (port optional; Neon uses default 5432)
    from urllib.parse import urlparse, parse_qs

    p = urlparse(conn)
    body = {
        "name": name,
        "origin": {
            "scheme": "postgres",
            "host": p.hostname,
            "port": p.port or 5432,
            "user": p.username,
            "password": p.password,
            "database": (p.path or "/").lstrip("/") or "neondb",
        },
        "caching": {"disabled": False, "stale_while_revalidate": 15, "max_age": 60},
    }
    r = cf_call(token, "POST", f"/accounts/{account}/hyperdrive/configs", body)
    if not r.get("success"):
        raise RuntimeError(f"Hyperdrive create failed for {name}: {r.get('errors')}")
    return r["result"]["id"]


def get_or_create_pages(
    token: str, account: str, name: str, prod_branch: str = "main"
) -> dict:
    r = cf_call(
        token, "GET", f"/accounts/{account}/pages/projects/{name}", quiet=True
    )
    if r.get("success"):
        return r["result"]
    r = cf_call(
        token,
        "POST",
        f"/accounts/{account}/pages/projects",
        {"name": name, "production_branch": prod_branch},
    )
    if not r.get("success"):
        raise RuntimeError(f"Pages create failed for {name}: {r.get('errors')}")
    return r["result"]


def main() -> int:
    vars_ = load_dev_vars()
    token = vars_.get("CLOUDFLARE_API_TOKEN")
    account = vars_.get("CLOUDFLARE_ACCOUNT_ID")
    db_staging = vars_.get("DATABASE_URL_STAGING")
    db_production = vars_.get("DATABASE_URL_PRODUCTION")
    if not token or not account:
        print("missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID in .dev.vars")
        return 2
    if not db_staging or not db_production:
        print("missing DATABASE_URL_STAGING / DATABASE_URL_PRODUCTION in .dev.vars")
        return 2

    print(f"== drbak CF provisioning ==  account={account[:8]}...")
    out: dict[str, dict] = {"kv": {}, "r2": {}, "queues": {}, "hyperdrive": {}, "pages": {}}

    bindings = ["KV_SESSIONS", "KV_RATELIMIT", "KV_IDEMPOTENCY", "KV_CACHE"]
    envs = [("dev", "-dev"), ("staging", "-staging"), ("production", "")]

    print("\n-- KV namespaces --")
    for env_name, suffix in envs:
        for binding in bindings:
            slug = binding.lower().replace("kv_", "")
            title = f"drbak-{slug}{suffix}" if suffix else f"drbak-{slug}"
            ns_id = get_or_create_kv(token, account, title)
            print(f"  {title:40s} -> {ns_id}")
            out["kv"][f"{env_name}.{binding}"] = ns_id

    print("\n-- R2 buckets --")
    r2_bindings = ["R2_DOCUMENTS", "R2_MEDIA"]
    for env_name, suffix in envs:
        for binding in r2_bindings:
            stem = binding.lower().replace("r2_", "")
            name = f"drbak-{stem}{suffix}" if suffix else f"drbak-{stem}"
            ensure_r2(token, account, name)
            print(f"  {name:40s} -> created/exists")
            out["r2"][f"{env_name}.{binding}"] = name

    print("\n-- Queues --")
    queue_stems = ["notifications", "notifications-dlq", "webhooks", "webhooks-dlq"]
    for env_name, suffix in envs:
        for stem in queue_stems:
            name = f"drbak-{stem}{suffix}" if suffix else f"drbak-{stem}"
            q_id = get_or_create_queue(token, account, name)
            print(f"  {name:40s} -> {q_id}")
            out["queues"][f"{env_name}.{stem}"] = {"id": q_id, "name": name}

    print("\n-- Hyperdrive --")
    for env_name, conn in [("staging", db_staging), ("production", db_production)]:
        h_id = get_or_create_hyperdrive(
            token, account, f"drbak-{env_name}", conn
        )
        print(f"  drbak-{env_name:30s} -> {h_id}")
        out["hyperdrive"][env_name] = h_id
    # dev env: reuse staging Hyperdrive (local Miniflare uses the same)
    out["hyperdrive"]["dev"] = out["hyperdrive"]["staging"]

    print("\n-- Pages projects --")
    for env_name, name in [("staging", "dr-bak-web-staging"), ("production", "dr-bak-web")]:
        proj = get_or_create_pages(token, account, name)
        print(f"  {name:40s} -> subdomain={proj.get('subdomain')}")
        out["pages"][env_name] = {
            "name": name,
            "subdomain": proj.get("subdomain"),
            "id": proj.get("id"),
        }

    RESULTS.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\n== wrote {RESULTS} ==")
    return 0


if __name__ == "__main__":
    sys.exit(main())
