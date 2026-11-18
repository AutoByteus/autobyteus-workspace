#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

DATA_DIR="${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}"
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
DB_TYPE=${DB_TYPE:-sqlite}
LOG_LEVEL=${LOG_LEVEL:-INFO}
ENVEOF
fi

# If base image has an entrypoint, handover to it. Otherwise start supervisord.
if [[ -f "/entrypoint.sh" ]]; then
  log "Handing over to base entrypoint"
  exec /entrypoint.sh
else
  log "Starting supervisord directly (no base entrypoint found)"
  exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
fi
