#!/usr/bin/env bash
set -euo pipefail

MEMORY_DIR="/app/autobyteus-message-gateway/memory"
DATA_DIR="${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}"
LOG_DIR="${AUTOBYTEUS_LOG_DIR:-${DATA_DIR}/logs}"
LOG_FILE="${LOG_DIR}/gateway.log"

mkdir -p "${MEMORY_DIR}"
mkdir -p "${LOG_DIR}"
touch "${LOG_FILE}"
rm -f "${MEMORY_DIR}/inbox.lock.json" "${MEMORY_DIR}/dead-letter.lock.json"

exec > >(tee -a "${LOG_FILE}") 2>&1

exec node /app/autobyteus-message-gateway/dist/index.js
