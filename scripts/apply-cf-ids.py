#!/usr/bin/env python3
"""
Reads scripts/cf-resources.json and patches apps/api/wrangler.toml,
replacing every `REPLACE_WITH_*` placeholder with the actual CF
resource ID.

Idempotent: running on an already-patched wrangler.toml leaves real
IDs untouched (placeholders are gone after first run).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "scripts" / "cf-resources.json"
WRANGLER = ROOT / "apps" / "api" / "wrangler.toml"


def main() -> int:
    if not RES.exists():
        print("missing scripts/cf-resources.json — run provision-cf.py first")
        return 2
    res = json.loads(RES.read_text(encoding="utf-8"))
    text = WRANGLER.read_text(encoding="utf-8")

    # Walk env-by-env. wrangler.toml structure:
    #   [env.<name>]
    #   ... bindings ...
    # Rather than parse TOML, we use targeted regex against well-known
    # placeholder patterns. Each [[env.<env>.kv_namespaces]] block has:
    #   binding = "KV_FOO"
    #   id = "REPLACE_WITH_<ENV>_KV_ID"
    # We scan top-down, tracking current env, and patch each placeholder
    # using the binding name to look up the right namespace ID.

    lines = text.splitlines(keepends=False)
    out: list[str] = []
    cur_env: str | None = None
    cur_section: str | None = None  # 'kv_namespaces' | 'hyperdrive' | None
    cur_binding: str | None = None

    section_re = re.compile(r"^\s*\[(?:\[)?env\.([a-z]+)(?:\.([a-z_]+))?(?:\])?\]\]?")
    binding_re = re.compile(r'^\s*binding\s*=\s*"([^"]+)"')
    id_placeholder_re = re.compile(r'^(\s*)id\s*=\s*"REPLACE_WITH[^"]*"')

    for line in lines:
        m = section_re.match(line)
        if m:
            cur_env = m.group(1)
            cur_section = m.group(2)
            cur_binding = None
            out.append(line)
            continue
        bm = binding_re.match(line)
        if bm and cur_section in ("kv_namespaces", "durable_objects", "hyperdrive"):
            cur_binding = bm.group(1)
            out.append(line)
            continue
        pm = id_placeholder_re.match(line)
        if pm and cur_env and cur_section:
            indent = pm.group(1)
            real_id: str | None = None
            if cur_section == "kv_namespaces" and cur_binding:
                key = f"{cur_env}.{cur_binding}"
                real_id = res["kv"].get(key)
            elif cur_section == "hyperdrive":
                real_id = res["hyperdrive"].get(cur_env)
            if real_id:
                out.append(f'{indent}id = "{real_id}"')
                continue
        out.append(line)

    new_text = "\n".join(out) + ("\n" if text.endswith("\n") else "")
    WRANGLER.write_text(new_text, encoding="utf-8", newline="\n")

    # Sanity: count remaining placeholders
    remaining = re.findall(r"REPLACE_WITH[^\"]*", new_text)
    if remaining:
        print(f"WARNING: {len(remaining)} placeholder(s) still in wrangler.toml:")
        for r in set(remaining):
            print(f"  - {r}")
    else:
        print("✓ all REPLACE_WITH_* placeholders patched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
