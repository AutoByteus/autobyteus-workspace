#!/usr/bin/env bash
set -euo pipefail

WEB_PORT="${WEB_PORT:-3000}"
SERVER_PORT="${AUTOBYTEUS_SERVER_PORT:-8000}"
BACKEND_PROXY_URL="${BACKEND_PROXY_URL:-http://127.0.0.1:${SERVER_PORT}}"
BACKEND_PROXY_URL="${BACKEND_PROXY_URL%/}"
INTERNAL_BACKEND_GRAPHQL_URL="${INTERNAL_BACKEND_GRAPHQL_URL:-${BACKEND_PROXY_URL}/graphql}"
DATA_DIR="${AUTOBYTEUS_DATA_DIR:-/home/autobyteus/data}"
LOG_DIR="${AUTOBYTEUS_LOG_DIR:-${DATA_DIR}/logs}"
LOG_FILE="${LOG_DIR}/web.log"

mkdir -p "${LOG_DIR}"
touch "${LOG_FILE}"

exec > >(tee -a "${LOG_FILE}") 2>&1

wait_for_backend_graphql() {
  local attempts=30
  local sleep_seconds=1
  local payload='{"query":"query { __typename }"}'

  for ((i=1; i<=attempts; i+=1)); do
    if curl -fsS \
      -H "content-type: application/json" \
      --data "${payload}" \
      "${INTERNAL_BACKEND_GRAPHQL_URL}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${sleep_seconds}"
  done

  echo "Backend GraphQL endpoint not ready: ${INTERNAL_BACKEND_GRAPHQL_URL}" >&2
  return 1
}

wait_for_backend_graphql

BACKEND_GRAPHQL_BASE_URL="${INTERNAL_BACKEND_GRAPHQL_URL}" pnpm -C /app/autobyteus-web codegen

exec pnpm -C /app/autobyteus-web dev --host 0.0.0.0 --port "${WEB_PORT}"
