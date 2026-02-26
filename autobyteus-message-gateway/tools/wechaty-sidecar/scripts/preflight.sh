#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ ! -f "${ENV_FILE}" ]; then
  echo "[preflight] missing ${ENV_FILE}. Run setup first: pnpm --dir ${ROOT_DIR} run setup"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

failures=0

check_required() {
  local key="$1"
  local value="${!key:-}"
  if [ -z "${value}" ]; then
    echo "[preflight] missing required env: ${key}"
    failures=$((failures + 1))
  fi
}

check_required "GATEWAY_BASE_URL"
check_required "SIDECAR_SHARED_SECRET"
check_required "WECHATY_PUPPET"

if [ "${WECHATY_PUPPET:-}" = "wechaty-puppet-service" ] && [ -z "${WECHATY_PUPPET_SERVICE_TOKEN:-}" ]; then
  echo "[preflight] WECHATY_PUPPET is wechaty-puppet-service but WECHATY_PUPPET_SERVICE_TOKEN is empty"
  echo "[preflight] if you do not have a token, switch to a different provider (for example wechaty-puppet-xp on Windows)."
fi

if [ -n "${GATEWAY_BASE_URL:-}" ]; then
  health_status=""
  if command -v curl >/dev/null 2>&1; then
    health_status="$(curl -s -o /dev/null -w "%{http_code}" "${GATEWAY_BASE_URL%/}/health" || true)"
  fi
  if [ -z "${health_status}" ]; then
    echo "[preflight] gateway health check skipped (curl unavailable or request failed)."
  elif [ "${health_status}" = "200" ]; then
    echo "[preflight] gateway health check passed (${GATEWAY_BASE_URL%/}/health -> 200)"
  else
    echo "[preflight] gateway health check returned ${health_status} (${GATEWAY_BASE_URL%/}/health)"
    echo "[preflight] continue after gateway starts."
  fi
fi

if [ "${failures}" -gt 0 ]; then
  echo "[preflight] failed with ${failures} hard error(s)."
  exit 1
fi

echo "[preflight] passed"
echo "[preflight] ensure gateway env includes:"
echo "  GATEWAY_WECHAT_PERSONAL_ENABLED=true"
echo "  GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL=http://localhost:${SIDECAR_PORT:-8788}"
echo "  GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET=<same SIDECAR_SHARED_SECRET>"
