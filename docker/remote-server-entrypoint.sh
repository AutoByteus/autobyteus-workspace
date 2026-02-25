#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}"
SERVER_PORT="${AUTOBYTEUS_SERVER_PORT:-8000}"
BIND_HOST="${AUTOBYTEUS_BIND_HOST:-0.0.0.0}"
DEFAULT_LOG_DIR="/home/autobyteus/logs"
LOG_DIR="${AUTOBYTEUS_LOG_DIR:-${DEFAULT_LOG_DIR}}"

mkdir -p "${DATA_DIR}"
mkdir -p "${LOG_DIR}"
export AUTOBYTEUS_LOG_DIR="${LOG_DIR}"

ENV_FILE="${DATA_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<EOF_INNER
APP_ENV=${APP_ENV:-production}
AUTOBYTEUS_SERVER_HOST=${AUTOBYTEUS_SERVER_HOST:-http://127.0.0.1:${SERVER_PORT}}
PERSISTENCE_PROVIDER=${PERSISTENCE_PROVIDER:-sqlite}
DB_TYPE=${DB_TYPE:-sqlite}
LOG_LEVEL=${AUTOBYTEUS_LOG_LEVEL:-INFO}
AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=${AUTOBYTEUS_HTTP_ACCESS_LOG_MODE:-errors}
AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY=${AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY:-false}
EOF_INNER
fi

upsert_env_var() {
  local key="$1"
  local value="$2"
  local tmp_file
  tmp_file="$(mktemp)"
  awk -v k="${key}" -v v="${value}" '
    BEGIN { updated = 0 }
    {
      if ($0 ~ ("^" k "=")) {
        print k "=" v
        updated = 1
      } else {
        print $0
      }
    }
    END {
      if (updated == 0) {
        print k "=" v
      }
    }
  ' "${ENV_FILE}" > "${tmp_file}"
  mv "${tmp_file}" "${ENV_FILE}"
}

upsert_env_var "AUTOBYTEUS_LLM_SERVER_HOSTS" "${AUTOBYTEUS_LLM_SERVER_HOSTS:-}"
upsert_env_var "OLLAMA_HOSTS" "${OLLAMA_HOSTS:-http://host.docker.internal:11434}"
upsert_env_var "LMSTUDIO_HOSTS" "${LMSTUDIO_HOSTS:-http://host.docker.internal:1234}"
upsert_env_var "AUTOBYTEUS_LOG_DIR" "${AUTOBYTEUS_LOG_DIR}"

exec node /app/autobyteus-server-ts/dist/app.js \
  --host "${BIND_HOST}" \
  --port "${SERVER_PORT}" \
  --data-dir "${DATA_DIR}"
