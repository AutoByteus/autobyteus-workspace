#!/bin/bash
# Script to prepare the server files for Electron packaging

# Exit on error
set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${WEB_ROOT}/.." && pwd)"
SERVER_REPO_DIR="${WORKSPACE_ROOT}/autobyteus-server-ts"
TARGET_DIR="${WEB_ROOT}/resources/server"
export TMPDIR="${TMPDIR:-/tmp}"
LOCKFILE_MODE="${PREPARE_SERVER_LOCKFILE_MODE:-auto}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}   Preparing AutoByteus Server Files   ${NC}"
echo -e "${GREEN}=======================================${NC}"

resolve_pnpm_lockfile_flag() {
  case "$LOCKFILE_MODE" in
    frozen)
      echo "--frozen-lockfile"
      ;;
    relaxed|no-frozen)
      echo "--no-frozen-lockfile"
      ;;
    auto)
      if [ "${CI:-}" = "true" ] || [ "${CI:-}" = "1" ]; then
        echo "--frozen-lockfile"
      else
        echo "--no-frozen-lockfile"
      fi
      ;;
    *)
      echo -e "${RED}Error: Invalid PREPARE_SERVER_LOCKFILE_MODE='$LOCKFILE_MODE'. Use: auto, frozen, relaxed, or no-frozen.${NC}"
      exit 1
      ;;
  esac
}

python_supports_distutils() {
  local python_bin="$1"
  "$python_bin" - <<'PY' >/dev/null 2>&1
import importlib.util
import sys
sys.exit(0 if importlib.util.find_spec("distutils") else 1)
PY
}

resolve_node_gyp_python() {
  local candidates=(
    "${npm_config_python:-}"
    "${PYTHON:-}"
    "/opt/homebrew/bin/python3.11"
    "python3.11"
    "python3"
    "python"
  )
  local candidate resolved

  for candidate in "${candidates[@]}"; do
    if [ -z "$candidate" ]; then
      continue
    fi
    if [[ "$candidate" = /* ]]; then
      resolved="$candidate"
      [ -x "$resolved" ] || continue
    else
      resolved="$(command -v "$candidate" 2>/dev/null || true)"
      [ -n "$resolved" ] || continue
    fi
    if python_supports_distutils "$resolved"; then
      echo "$resolved"
      return 0
    fi
  done

  return 1
}

# Check if server repository exists
if [ ! -d "$SERVER_REPO_DIR" ]; then
  echo -e "${RED}Error: Server repository not found at $SERVER_REPO_DIR${NC}"
  echo "Please specify the correct path to the server repository"
  exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"
echo -e "${GREEN}✓${NC} Created target directory: $TARGET_DIR"

echo -e "\n${YELLOW}Building server and dependencies...${NC}"
if [ -f "${WORKSPACE_ROOT}/pnpm-workspace.yaml" ]; then
  pnpm -C "$WORKSPACE_ROOT" -r --filter autobyteus-ts build
else
  if [ -d "${WORKSPACE_ROOT}/autobyteus-ts" ]; then
    pnpm -C "${WORKSPACE_ROOT}/autobyteus-ts" install --no-frozen-lockfile
    pnpm -C "${WORKSPACE_ROOT}/autobyteus-ts" build
  else
    echo -e "${RED}Error: autobyteus-ts not found at ${WORKSPACE_ROOT}/autobyteus-ts${NC}"
    exit 1
  fi
fi

if [ -f "${SERVER_REPO_DIR}/pnpm-lock.yaml" ]; then
  LOCKFILE_FLAG="$(resolve_pnpm_lockfile_flag)"
  echo -e "${YELLOW}Installing server dependencies with ${LOCKFILE_FLAG} (mode: ${LOCKFILE_MODE}, CI: ${CI:-unset}, workspace: ignored)...${NC}"
  pnpm -C "$SERVER_REPO_DIR" install "$LOCKFILE_FLAG" --ignore-workspace
else
  pnpm -C "$SERVER_REPO_DIR" install --no-frozen-lockfile
fi

echo -e "\n${YELLOW}Generating Prisma client for server build...${NC}"
pnpm -C "$SERVER_REPO_DIR" exec prisma generate --schema prisma/schema.prisma

pnpm -C "$SERVER_REPO_DIR" build

echo -e "\n${YELLOW}Deploying server package into Electron resources...${NC}"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
if [ -f "${WORKSPACE_ROOT}/pnpm-workspace.yaml" ]; then
  pnpm -C "$WORKSPACE_ROOT" --filter autobyteus-server-ts deploy "$TARGET_DIR" --legacy
else
  pnpm -C "$SERVER_REPO_DIR" deploy "$TARGET_DIR" --legacy
fi

echo -e "\n${YELLOW}Cleaning workspace symlinks in deployment...${NC}"
if [ -d "${TARGET_DIR}/node_modules/.pnpm/node_modules" ]; then
  python3 - "$TARGET_DIR" <<'PY'
import os
import sys

root = os.path.realpath(sys.argv[1])
scan_root = os.path.join(root, "node_modules", ".pnpm", "node_modules")

removed = 0
for dirpath, dirnames, filenames in os.walk(scan_root, topdown=True, followlinks=False):
    # Combine files and dir entries for symlink detection.
    entries = list(dirnames) + list(filenames)
    for name in entries:
        path = os.path.join(dirpath, name)
        if not os.path.islink(path):
            continue
        target = os.path.realpath(path)
        if not target.startswith(root + os.sep):
            os.unlink(path)
            removed += 1

print(f"Removed {removed} external symlinks from {scan_root}")
PY
fi

echo -e "\n${YELLOW}Generating Prisma client (ensures engines are bundled)...${NC}"
PRISMA_BIN="${TARGET_DIR}/node_modules/.bin/prisma"
if [ ! -x "$PRISMA_BIN" ] && [ -f "${PRISMA_BIN}.cmd" ]; then
  PRISMA_BIN="${PRISMA_BIN}.cmd"
fi
if [ -x "$PRISMA_BIN" ]; then
  "$PRISMA_BIN" generate --schema "${TARGET_DIR}/prisma/schema.prisma"
else
  echo -e "${YELLOW}Warning: Prisma CLI not found at ${PRISMA_BIN}; skipping generate.${NC}"
fi

if [ -f "$SERVER_REPO_DIR/.env" ]; then
  cp "$SERVER_REPO_DIR/.env" "$TARGET_DIR/.env"
fi

echo -e "\n${YELLOW}Pruning native prebuilds for host platform...${NC}"
if [ -d "${TARGET_DIR}/node_modules/node-pty/prebuilds" ]; then
  HOST_OS="$(uname -s)"
  KEEP_PREFIX=""
  case "${HOST_OS}" in
    Darwin)
      KEEP_PREFIX="darwin-"
      ;;
    Linux)
      KEEP_PREFIX="linux-"
      ;;
  esac

  if [ -n "${KEEP_PREFIX}" ]; then
    find "${TARGET_DIR}/node_modules/node-pty/prebuilds" -maxdepth 1 -type d \
      ! -name "${KEEP_PREFIX}*" ! -name "." -exec rm -rf {} +
    echo -e "${GREEN}✓${NC} Kept native prebuild folders matching ${KEEP_PREFIX}*"
  else
    echo -e "${YELLOW}Warning: Unknown host OS (${HOST_OS}); skipping prebuild pruning.${NC}"
  fi
fi

if [ -d "$SERVER_REPO_DIR/download" ]; then
  mkdir -p "$TARGET_DIR/download"
  cp -R "$SERVER_REPO_DIR/download/." "$TARGET_DIR/download/"
fi

echo -e "\n${YELLOW}Removing dangling symlinks from web node_modules...${NC}"
python3 - "${WEB_ROOT}/node_modules" <<'PY'
import os
import sys

root = sys.argv[1]
removed = 0
for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
    for name in dirnames + filenames:
        path = os.path.join(dirpath, name)
        if os.path.islink(path) and not os.path.exists(path):
            try:
                os.unlink(path)
                removed += 1
            except FileNotFoundError:
                pass
print(f"Removed {removed} dangling symlinks from {root}")
PY

echo -e "\n${YELLOW}Rebuilding native modules for Electron...${NC}"
ELECTRON_VERSION=$(node -p "require('${WEB_ROOT}/package.json').devDependencies.electron.replace(/^\\^/, '')")
NODE_GYP_PYTHON="$(resolve_node_gyp_python || true)"
if [ -n "$NODE_GYP_PYTHON" ]; then
  export npm_config_python="$NODE_GYP_PYTHON"
  export PYTHON="$NODE_GYP_PYTHON"
  echo -e "${GREEN}✓${NC} Using Python for node-gyp: ${NODE_GYP_PYTHON}"
else
  echo -e "${YELLOW}Warning: Could not find a Python interpreter with distutils; electron-rebuild may fail.${NC}"
fi
if pnpm -C "$WEB_ROOT" exec electron-rebuild --version >/dev/null 2>&1; then
  pnpm -C "$WEB_ROOT" exec electron-rebuild -v "$ELECTRON_VERSION" -m "$TARGET_DIR" -w node-pty
else
  echo -e "${YELLOW}electron-rebuild not found in project dependencies; using pnpm dlx fallback...${NC}"
  pnpm -C "$WEB_ROOT" dlx electron-rebuild -v "$ELECTRON_VERSION" -m "$TARGET_DIR" -w node-pty
fi

echo -e "\n${YELLOW}Removing symlinks that point outside the bundle...${NC}"
python3 - "$TARGET_DIR" <<'PY'
import os
import sys

root = os.path.realpath(sys.argv[1])
removed = 0

for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
    for name in dirnames + filenames:
        path = os.path.join(dirpath, name)
        if not os.path.islink(path):
            continue
        target = os.path.realpath(path)
        if not target.startswith(root + os.sep):
            try:
                os.unlink(path)
                removed += 1
            except FileNotFoundError:
                pass

print(f"Removed {removed} external symlinks from {root}")
PY

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}   Server files prepared successfully!   ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "Target directory: ${YELLOW}$TARGET_DIR${NC}"
echo -e "You can now build the Electron app with the server included"
