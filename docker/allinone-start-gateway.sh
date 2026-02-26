#!/usr/bin/env bash
set -euo pipefail

MEMORY_DIR="/app/memory"
DATA_DIR="${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}"
LOG_DIR="${AUTOBYTEUS_LOG_DIR:-${DATA_DIR}/logs}"
LOG_FILE="${LOG_DIR}/gateway.log"
QUEUE_ROOT_DIR="${MEMORY_DIR}/reliability-queue"
LOCK_DIR="${QUEUE_ROOT_DIR}/locks"

mkdir -p "${MEMORY_DIR}"
mkdir -p "${LOG_DIR}"
mkdir -p "${QUEUE_ROOT_DIR}/inbox" "${QUEUE_ROOT_DIR}/outbox" "${LOCK_DIR}"
touch "${LOG_FILE}"
rm -f "${LOCK_DIR}/inbox.lock.json" "${LOCK_DIR}/outbox.lock.json" "${LOCK_DIR}/dead-letter.lock.json"

exec > >(tee -a "${LOG_FILE}") 2>&1

exec node /app/autobyteus-message-gateway/dist/index.js
