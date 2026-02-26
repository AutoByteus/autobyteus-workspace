#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_TEMPLATE="${ROOT_DIR}/env.example"
ENV_FILE="${ROOT_DIR}/.env"

if ! command -v node >/dev/null 2>&1; then
  echo "[setup] node is required but not installed."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[setup] pnpm is required but not installed."
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  cp "${ENV_TEMPLATE}" "${ENV_FILE}"
  echo "[setup] created ${ENV_FILE} from template"
else
  echo "[setup] existing ${ENV_FILE} found"
fi

if grep -q '^SIDECAR_SHARED_SECRET=CHANGE_ME$' "${ENV_FILE}"; then
  SECRET="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
  TMP_FILE="$(mktemp)"
  awk -v secret="${SECRET}" '
    BEGIN { replaced = 0 }
    /^SIDECAR_SHARED_SECRET=/ {
      print "SIDECAR_SHARED_SECRET=" secret
      replaced = 1
      next
    }
    { print }
    END {
      if (replaced == 0) {
        print "SIDECAR_SHARED_SECRET=" secret
      }
    }
  ' "${ENV_FILE}" > "${TMP_FILE}"
  mv "${TMP_FILE}" "${ENV_FILE}"
  echo "[setup] generated SIDECAR_SHARED_SECRET in ${ENV_FILE}"
fi

echo "[setup] installing sidecar dependencies..."
pnpm install --dir "${ROOT_DIR}" --ignore-workspace

echo

echo "[setup] done"
echo "[setup] next:"
echo "  1) review ${ENV_FILE}"
echo "  2) run: pnpm --dir ${ROOT_DIR} run preflight"
echo "  3) run: pnpm --dir ${ROOT_DIR} run start"
