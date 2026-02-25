#!/usr/bin/env bash
set -euo pipefail

MEMORY_DIR="/app/autobyteus-message-gateway/memory"
mkdir -p "${MEMORY_DIR}"
rm -f "${MEMORY_DIR}/inbox.lock.json" "${MEMORY_DIR}/dead-letter.lock.json"

exec node /app/autobyteus-message-gateway/dist/index.js
