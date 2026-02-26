#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

WORKSPACE_ROOT="${AUTOBYTEUS_WORKSPACE_ROOT:-/home/autobyteus/workspace}"
DATA_DIR="${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}"
BIND_HOST="${AUTOBYTEUS_BIND_HOST:-0.0.0.0}"
SERVER_PORT="${AUTOBYTEUS_SERVER_PORT:-8000}"

mkdir -p "${DATA_DIR}"

if [[ -z "${AUTOBYTEUS_SERVER_HOST:-}" ]]; then
  export AUTOBYTEUS_SERVER_HOST="http://localhost:${SERVER_PORT}"
fi

ENV_FILE="${DATA_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  log "Creating ${ENV_FILE} with default server configuration"
  cat > "${ENV_FILE}" <<ENVEOF
APP_ENV=${APP_ENV:-production}
AUTOBYTEUS_SERVER_HOST=${AUTOBYTEUS_SERVER_HOST}
PERSISTENCE_PROVIDER=${PERSISTENCE_PROVIDER:-sqlite}
DB_TYPE=${DB_TYPE:-sqlite}
LOG_LEVEL=${LOG_LEVEL:-INFO}
ENVEOF
fi

/usr/local/bin/autobyteus-bootstrap.sh

SERVER_ENTRY="${WORKSPACE_ROOT}/src/autobyteus-server-ts/dist/app.js"
if [[ ! -f "${SERVER_ENTRY}" ]]; then
  log "error: server entrypoint not found at ${SERVER_ENTRY}"
  exit 1
fi

log "Starting autobyteus-server-ts on ${BIND_HOST}:${SERVER_PORT}"
exec node "${SERVER_ENTRY}" --host "${BIND_HOST}" --port "${SERVER_PORT}" --data-dir "${DATA_DIR}"
