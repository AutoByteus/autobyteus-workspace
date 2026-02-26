#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

DISTRO_NAME="${DISTRO_NAME:-debian}"
SESSION_NAME="${SESSION_NAME:-autobyteus-server}"
SOURCE_PAYLOAD="${SOURCE_PAYLOAD:-/sdcard/Download/autobyteus_android_payload.tar.gz}"
SETUP_DIR="${HOME}/.autobyteus-android"
LOCAL_PAYLOAD="${SETUP_DIR}/payload.tar.gz"
PROOT_SETUP_SCRIPT="${SETUP_DIR}/proot_setup.sh"

TERMUX_HOME_IN_PROOT="/data/data/com.termux/files/home"

log() {
  printf '[termux-bootstrap] %s\n' "$*"
}

die() {
  printf '[termux-bootstrap] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

if [[ ! -f "${SOURCE_PAYLOAD}" ]]; then
  die "Payload not found at ${SOURCE_PAYLOAD}. Run the host script first."
fi

require_cmd pkg

log "Installing base Termux packages"
export DEBIAN_FRONTEND=noninteractive
export APT_LISTCHANGES_FRONTEND=none
PKG_INSTALL_OPTS=(
  -y
  -o Dpkg::Options::=--force-confdef
  -o Dpkg::Options::=--force-confold
)

# Recover from interrupted package operations before update/install.
dpkg --configure -a --force-confdef --force-confold >/dev/null 2>&1 || true
pkg update -y
pkg install "${PKG_INSTALL_OPTS[@]}" proot-distro tar coreutils grep sed curl git
require_cmd proot-distro

rootfs_dir="${PREFIX}/var/lib/proot-distro/installed-rootfs/${DISTRO_NAME}"
if [[ ! -d "${rootfs_dir}" ]]; then
  log "Installing ${DISTRO_NAME} rootfs (first run only)"
  if ! proot-distro install "${DISTRO_NAME}"; then
    if [[ -d "${rootfs_dir}" ]]; then
      log "proot-distro install exited non-zero but rootfs exists; continuing."
    else
      die "Failed to install ${DISTRO_NAME} rootfs."
    fi
  fi
else
  log "${DISTRO_NAME} rootfs already installed"
fi

mkdir -p "${SETUP_DIR}"
cp -f "${SOURCE_PAYLOAD}" "${LOCAL_PAYLOAD}"

cat > "${PROOT_SETUP_SCRIPT}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SESSION_NAME:-autobyteus-server}"
TERMUX_HOME_IN_PROOT="${TERMUX_HOME_IN_PROOT:-/data/data/com.termux/files/home}"
SETUP_DIR="${TERMUX_HOME_IN_PROOT}/.autobyteus-android"
PAYLOAD_PATH="${SETUP_DIR}/payload.tar.gz"
MONOREPO_ROOT="/root/autobyteus_org"
SERVER_DIR="${MONOREPO_ROOT}/autobyteus-server-ts"

if [[ ! -f "${PAYLOAD_PATH}" ]]; then
  echo "[proot-setup] ERROR: Payload missing at ${PAYLOAD_PATH}" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export APT_LISTCHANGES_FRONTEND=none
dpkg --configure -a --force-confdef --force-confold || true
# Recover from partially configured/broken npm states from previous interrupted runs.
dpkg --remove --force-remove-reinstreq npm >/dev/null 2>&1 || true
apt update
apt install -y \
  -o Dpkg::Options::=--force-confdef \
  -o Dpkg::Options::=--force-confold \
  ca-certificates curl git build-essential python3 python-is-python3 pkg-config ripgrep tmux nodejs

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  echo "[proot-setup] ERROR: Node.js >= 18 is required." >&2
  exit 1
fi

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  # Workspace lockfile is v9; pin pnpm 9 to avoid pnpm 10 build-approval defaults.
  corepack prepare pnpm@9 --activate
elif command -v npm >/dev/null 2>&1; then
  npm install -g pnpm@9
else
  apt install -y \
    -o Dpkg::Options::=--force-confdef \
    -o Dpkg::Options::=--force-confold \
    npm
  npm install -g pnpm@9
fi

mkdir -p "${MONOREPO_ROOT}"
rm -rf "${MONOREPO_ROOT}/autobyteus-server-ts"
rm -rf "${MONOREPO_ROOT}/autobyteus-ts"
rm -rf "${MONOREPO_ROOT}/repository_prisma"
rm -f "${MONOREPO_ROOT}/pnpm-workspace.yaml"
rm -f "${MONOREPO_ROOT}/pnpm-lock.yaml"
tar -xzf "${PAYLOAD_PATH}" -C "${MONOREPO_ROOT}"

# The payload intentionally excludes .env; provide Android-safe defaults.
mkdir -p "${SERVER_DIR}/db" "${SERVER_DIR}/memory"
if [[ ! -f "${SERVER_DIR}/.env" ]]; then
  cat > "${SERVER_DIR}/.env" <<ENV_EOF
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000
PERSISTENCE_PROVIDER=sqlite
DB_TYPE=sqlite
DATABASE_URL=file:/root/autobyteus_org/autobyteus-server-ts/db/production.db
AUTOBYTEUS_MEMORY_DIR=/root/autobyteus_org/autobyteus-server-ts/memory
ENV_EOF
fi

cd "${MONOREPO_ROOT}"
pnpm install
pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma
pnpm -C autobyteus-server-ts build

cat > /root/start-autobyteus-server.sh <<'INNER_EOF'
#!/usr/bin/env bash
set -euo pipefail
cd /root/autobyteus_org
export AUTOBYTEUS_SERVER_HOST="${AUTOBYTEUS_SERVER_HOST:-http://127.0.0.1:8000}"
export PERSISTENCE_PROVIDER="${PERSISTENCE_PROVIDER:-sqlite}"
export DB_TYPE="${DB_TYPE:-sqlite}"
node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port "${PORT:-8000}"
INNER_EOF
chmod +x /root/start-autobyteus-server.sh

if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  tmux kill-session -t "${SESSION_NAME}"
fi
tmux new-session -d -s "${SESSION_NAME}" "/root/start-autobyteus-server.sh"
echo "[proot-setup] Server started in tmux session: ${SESSION_NAME}"
EOF

chmod +x "${PROOT_SETUP_SCRIPT}"

log "Running setup inside ${DISTRO_NAME} proot"
proot-distro login "${DISTRO_NAME}" --shared-tmp -- env \
  SESSION_NAME="${SESSION_NAME}" \
  TERMUX_HOME_IN_PROOT="${TERMUX_HOME_IN_PROOT}" \
  /bin/bash "${TERMUX_HOME_IN_PROOT}/.autobyteus-android/proot_setup.sh"

cat > "${HOME}/autobyteus_attach_server.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
proot-distro login "${DISTRO_NAME}" --shared-tmp -- /bin/bash -lc '
if ! tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  tmux new-session -d -s "${SESSION_NAME}" "/root/start-autobyteus-server.sh"
fi
tmux attach -t "${SESSION_NAME}"
'
EOF
chmod +x "${HOME}/autobyteus_attach_server.sh"

log "Bootstrap complete."
cat <<EOF

Server is running in proot tmux session: ${SESSION_NAME}

From your computer:
  adb shell 'run-as com.termux /data/data/com.termux/files/usr/bin/proot-distro login ${DISTRO_NAME} --shared-tmp -- /bin/bash -lc "curl -sS http://127.0.0.1:8000/rest/health"'

Startup can take ~20-40 seconds before health returns 200.

From Termux later (to inspect logs/session):
  ~/autobyteus_attach_server.sh
EOF
