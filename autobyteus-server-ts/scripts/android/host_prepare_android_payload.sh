#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MONOREPO_ROOT="$(cd "${SERVER_ROOT}/.." && pwd)"

PAYLOAD_NAME="autobyteus_android_payload.tar.gz"
REMOTE_DIR="/sdcard/Download"
REMOTE_PAYLOAD_PATH="${REMOTE_DIR}/${PAYLOAD_NAME}"
REMOTE_BOOTSTRAP_PATH="${REMOTE_DIR}/autobyteus_termux_bootstrap.sh"

info() {
  printf '[android-bootstrap] %s\n' "$*"
}

fail() {
  printf '[android-bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

require_cmd adb
require_cmd tar

if ! adb get-state >/dev/null 2>&1; then
  fail "No authorized Android device found. Enable USB debugging and run: adb devices"
fi

if ! adb shell pm path com.termux >/dev/null 2>&1; then
  cat >&2 <<'EOF'
[android-bootstrap] ERROR: Termux is not installed on the device.
Install Termux first, then re-run this script.
EOF
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT
payload_path="${tmp_dir}/${PAYLOAD_NAME}"

info "Building workspace payload from ${MONOREPO_ROOT}"
tar -C "${MONOREPO_ROOT}" -czf "${payload_path}" \
  --exclude='.git' \
  --exclude='*/.git/*' \
  --exclude='node_modules' \
  --exclude='*/node_modules/*' \
  --exclude='dist' \
  --exclude='*/dist/*' \
  --exclude='db' \
  --exclude='*/db/*' \
  --exclude='logs' \
  --exclude='*/logs/*' \
  --exclude='media' \
  --exclude='*/media/*' \
  --exclude='download' \
  --exclude='*/download/*' \
  --exclude='temp_workspace' \
  --exclude='*/temp_workspace/*' \
  --exclude='.env' \
  --exclude='*/.env' \
  autobyteus-server-ts \
  autobyteus-ts \
  repository_prisma \
  pnpm-workspace.yaml \
  pnpm-lock.yaml

info "Pushing payload to ${REMOTE_PAYLOAD_PATH}"
adb push "${payload_path}" "${REMOTE_PAYLOAD_PATH}" >/dev/null

info "Pushing Termux bootstrap script to ${REMOTE_BOOTSTRAP_PATH}"
adb push "${SCRIPT_DIR}/termux_bootstrap.sh" "${REMOTE_BOOTSTRAP_PATH}" >/dev/null

adb shell am start -n com.termux/com.termux.app.TermuxActivity >/dev/null 2>&1 || true

payload_bytes="$(wc -c < "${payload_path}" | tr -d ' ')"
info "Done. Payload size: ${payload_bytes} bytes"
cat <<EOF

Next steps on phone:
1) Open Termux (launched automatically if possible).
2) Run:
   bash ${REMOTE_BOOTSTRAP_PATH}

When bootstrap finishes on the phone, verify from this computer:
  adb shell 'run-as com.termux /data/data/com.termux/files/usr/bin/proot-distro login debian --shared-tmp -- /bin/bash -lc "curl -sS http://127.0.0.1:8000/rest/health"'

Startup can take ~20-40 seconds before health returns 200.
EOF
