#!/usr/bin/env python3
"""
Generate an ES256 (P-256 ECDSA) keypair for JWT signing and write the
PEMs into apps/api/.dev.vars. Used by the auth use-cases via the
Es256TokenIssuer adapter.

Production keys are different from dev: each environment gets its own
keypair via `wrangler secret put`. This script only seeds the local
.dev.vars values used by Miniflare during `wrangler dev`.
"""

from __future__ import annotations

import re
import secrets
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

ROOT = Path(__file__).resolve().parent.parent
DEV_VARS = ROOT / "apps" / "api" / ".dev.vars"


def main() -> int:
    private = ec.generate_private_key(ec.SECP256R1())
    public = private.public_key()

    private_pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("ascii").strip()
    public_pem = public.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii").strip()

    # 16-char hex KID; rotated quarterly per locked decisions
    kid = "dev-" + secrets.token_hex(8)

    text = DEV_VARS.read_text(encoding="utf-8")
    # Store as single-line strings with whitespace-collapsed bodies. The
    # Es256TokenIssuer.pemToDer() helper strips header/footer + all
    # whitespace before base64-decoding, so any single-line form works.
    private_oneline = private_pem.replace("\n", " ")
    public_oneline = public_pem.replace("\n", " ")

    # `re.sub` here matches just the line; we use a non-greedy match to
    # avoid eating multiple lines if the file ever has multi-line values.
    text = re.sub(
        r"^JWT_SIGNING_PRIVATE_KEY=[^\n]*",
        f"JWT_SIGNING_PRIVATE_KEY={private_oneline}",
        text,
        flags=re.M,
        count=1,
    )
    text = re.sub(
        r"^JWT_SIGNING_PUBLIC_KEY=[^\n]*",
        f"JWT_SIGNING_PUBLIC_KEY={public_oneline}",
        text,
        flags=re.M,
        count=1,
    )
    text = re.sub(
        r"^JWT_SIGNING_KID=.*$",
        f"JWT_SIGNING_KID={kid}",
        text,
        flags=re.M,
    )
    DEV_VARS.write_text(text, encoding="utf-8", newline="\n")
    print(f"JWT keypair generated. KID: {kid}")
    print("Production: rotate via `wrangler secret put` for each env.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
