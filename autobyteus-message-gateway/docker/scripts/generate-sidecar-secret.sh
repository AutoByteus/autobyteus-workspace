#!/usr/bin/env bash
set -euo pipefail

if command -v openssl >/dev/null 2>&1; then
  openssl rand -hex 32
  exit 0
fi

node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
