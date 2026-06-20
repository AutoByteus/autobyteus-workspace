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

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

normalize_linux_arch() {
  case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
    x64|amd64|x86_64)
      echo "x64"
      ;;
    arm64|aarch64)
      echo "arm64"
      ;;
    *)
      return 1
      ;;
  esac
}

resolve_linux_package_target_arch() {
  if [ "$(uname -s)" != "Linux" ]; then
    return 0
  fi

  local host_arch
  host_arch="$(normalize_linux_arch "$(uname -m)")" || {
    echo -e "${RED}Error: Unsupported Linux host architecture for Electron server preparation: $(uname -m)${NC}" >&2
    exit 1
  }

  local requested_arch="${AUTOBYTEUS_ELECTRON_LINUX_TARGET_ARCH:-$host_arch}"
  requested_arch="$(normalize_linux_arch "$requested_arch")" || {
    echo -e "${RED}Error: Unsupported AUTOBYTEUS_ELECTRON_LINUX_TARGET_ARCH='${AUTOBYTEUS_ELECTRON_LINUX_TARGET_ARCH}'. Use x64 or arm64.${NC}" >&2
    exit 1
  }

  if [ "$requested_arch" != "$host_arch" ]; then
    echo -e "${RED}Error: Unsupported Linux cross-architecture server preparation: host is ${host_arch}, requested ${requested_arch}. Use a native ${requested_arch} Linux host/runner.${NC}" >&2
    exit 1
  fi

  echo "$requested_arch"
}

linux_prisma_binary_targets() {
  case "$1" in
    x64)
      echo "debian-openssl-1.1.x,debian-openssl-3.0.x"
      ;;
    arm64)
      echo "linux-arm64-openssl-3.0.x"
      ;;
    *)
      echo ""
      ;;
  esac
}

LINUX_PACKAGE_TARGET_ARCH="$(resolve_linux_package_target_arch)"
LINUX_PRISMA_BINARY_TARGETS="$(linux_prisma_binary_targets "$LINUX_PACKAGE_TARGET_ARCH")"

normalize_node_pty_spawn_helpers() {
  if [ ! -d "${TARGET_DIR}/node_modules" ]; then
    echo -e "${YELLOW}Warning: node_modules not found; skipping node-pty spawn-helper mode normalization.${NC}"
    return
  fi

  local normalized=0
  while IFS= read -r helper_path; do
    chmod a+x "${helper_path}"
    normalized=$((normalized + 1))
  done < <(find "${TARGET_DIR}/node_modules" -type f -name spawn-helper -path "*/node-pty/*" -print)

  if [ "${normalized}" -eq 0 ]; then
    echo -e "${YELLOW}Warning: No node-pty spawn-helper files found to normalize.${NC}"
  else
    echo -e "${GREEN}✓${NC} Normalized execute bits on ${normalized} node-pty spawn-helper file(s)"
  fi
}

validate_prisma_client_engine_file() {
  local client_dir="$1"
  local expected_name="$2"
  local allow_generic_alias="${3:-false}"
  local expected_engine="${client_dir}/${expected_name}"
  local generic_engine="${client_dir}/libquery-engine"

  if [ -f "${expected_engine}" ]; then
    return 0
  fi

  if [ "${allow_generic_alias}" != "true" ]; then
    echo -e "${RED}Error: Missing required Prisma client engine in bundle: ${expected_name}${NC}"
    return 1
  fi

  if [ ! -f "${generic_engine}" ]; then
    echo -e "${RED}Error: Missing required Prisma client engine in bundle: ${expected_name}${NC}"
    return 1
  fi

  if command -v file >/dev/null 2>&1; then
    local file_output
    file_output="$(file "${generic_engine}")"
    case "$LINUX_PACKAGE_TARGET_ARCH" in
      arm64)
        echo "$file_output" | grep -Eq 'ARM aarch64|aarch64|ARM64' || {
          echo -e "${RED}Error: Prisma client generic engine is not ARM64: ${file_output}${NC}"
          return 1
        }
        ;;
      x64)
        echo "$file_output" | grep -Eq 'x86-64|x86_64' || {
          echo -e "${RED}Error: Prisma client generic engine is not x64: ${file_output}${NC}"
          return 1
        }
        ;;
    esac
  fi

  cp -p "${generic_engine}" "${expected_engine}"
  echo -e "${GREEN}✓${NC} Prisma client generic engine matches Linux ${LINUX_PACKAGE_TARGET_ARCH}; copied ${generic_engine} to expected runtime filename ${expected_engine}"
}

# Banner
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}   Preparing AutoByteus Server Files   ${NC}"
echo -e "${GREEN}=======================================${NC}"
if [ "$(uname -s)" = "Linux" ]; then
  echo -e "${GREEN}✓${NC} Linux server preparation target architecture: ${LINUX_PACKAGE_TARGET_ARCH}"
fi

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
if [ -f "${SERVER_REPO_DIR}/pnpm-lock.yaml" ]; then
  pnpm -C "$SERVER_REPO_DIR" install --frozen-lockfile
else
  pnpm -C "$SERVER_REPO_DIR" install --no-frozen-lockfile
fi
pnpm -C "$SERVER_REPO_DIR" exec prisma generate --schema prisma/schema.prisma
pnpm -C "$SERVER_REPO_DIR" build

echo -e "\n${YELLOW}Building mobile web assets...${NC}"
pnpm -C "$WEB_ROOT" build:mobile-web

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

echo -e "\n${YELLOW}Removing non-runtime test fixtures from deployed dependencies...${NC}"
if [ -d "${TARGET_DIR}/node_modules" ]; then
  find "${TARGET_DIR}/node_modules" -type d \( -name test -o -name tests -o -name __tests__ \) -prune -exec rm -rf {} +
fi

echo -e "\n${YELLOW}Generating Prisma client (ensures engines are bundled)...${NC}"
PRISMA_BIN="${TARGET_DIR}/node_modules/.bin/prisma"
if [ ! -x "$PRISMA_BIN" ] && [ -f "${PRISMA_BIN}.cmd" ]; then
  PRISMA_BIN="${PRISMA_BIN}.cmd"
fi
if [ -x "$PRISMA_BIN" ]; then
  PRISMA_GENERATE_BINARY_TARGETS="${PRISMA_CLI_BINARY_TARGETS:-}"
  if [ -z "${PRISMA_GENERATE_BINARY_TARGETS}" ] && [ "$(uname -s)" = "Linux" ]; then
    PRISMA_GENERATE_BINARY_TARGETS="$LINUX_PRISMA_BINARY_TARGETS"
  fi

  if [ -n "${PRISMA_GENERATE_BINARY_TARGETS}" ]; then
    echo -e "${GREEN}✓${NC} Using PRISMA_CLI_BINARY_TARGETS=${PRISMA_GENERATE_BINARY_TARGETS}"
    PRISMA_CLI_BINARY_TARGETS="${PRISMA_GENERATE_BINARY_TARGETS}" \
      "$PRISMA_BIN" generate --schema "${TARGET_DIR}/prisma/schema.prisma"
  else
    "$PRISMA_BIN" generate --schema "${TARGET_DIR}/prisma/schema.prisma"
  fi
else
  echo -e "${YELLOW}Warning: Prisma CLI not found at ${PRISMA_BIN}; skipping generate.${NC}"
fi

if [ "$(uname -s)" = "Linux" ]; then
  echo -e "\n${YELLOW}Validating bundled Prisma Linux engine targets...${NC}"
  ENGINES_DIR=""
  if [ -d "${TARGET_DIR}/node_modules/@prisma/engines" ]; then
    ENGINES_DIR="${TARGET_DIR}/node_modules/@prisma/engines"
  else
    ENGINES_DIR="$(find "${TARGET_DIR}/node_modules/.pnpm" -maxdepth 4 -type d -path "*/@prisma/engines" | head -n1 || true)"
  fi

  if [ -z "${ENGINES_DIR}" ] || [ ! -d "${ENGINES_DIR}" ]; then
    echo -e "${RED}Error: Prisma engines directory not found in packaged server bundle.${NC}"
    exit 1
  fi

  if [ "$LINUX_PACKAGE_TARGET_ARCH" = "arm64" ]; then
    REQUIRED_ENGINES=(
      "libquery_engine-linux-arm64-openssl-3.0.x.so.node"
      "schema-engine-linux-arm64-openssl-3.0.x"
    )
  else
    REQUIRED_ENGINES=(
      "libquery_engine-debian-openssl-1.1.x.so.node"
      "libquery_engine-debian-openssl-3.0.x.so.node"
      "schema-engine-debian-openssl-1.1.x"
      "schema-engine-debian-openssl-3.0.x"
    )
  fi
  for engine in "${REQUIRED_ENGINES[@]}"; do
    if [ ! -f "${ENGINES_DIR}/${engine}" ]; then
      echo -e "${RED}Error: Missing required Prisma engine in bundle: ${engine}${NC}"
      exit 1
    fi
  done
  echo -e "${GREEN}✓${NC} Prisma Linux ${LINUX_PACKAGE_TARGET_ARCH} engine targets verified in ${ENGINES_DIR}"

  CLIENT_DIR="$(find "${TARGET_DIR}/node_modules/.pnpm" -maxdepth 6 -type d -path "*/@prisma+client@*/node_modules/.prisma/client" | head -n1 || true)"
  if [ -z "${CLIENT_DIR}" ] || [ ! -d "${CLIENT_DIR}" ]; then
    echo -e "${RED}Error: Prisma client runtime directory not found in packaged server bundle.${NC}"
    exit 1
  fi

  if [ "$LINUX_PACKAGE_TARGET_ARCH" = "arm64" ]; then
    REQUIRED_CLIENT_ENGINES=(
      "libquery_engine-linux-arm64-openssl-3.0.x.so.node"
    )
  else
    REQUIRED_CLIENT_ENGINES=(
      "libquery_engine-debian-openssl-1.1.x.so.node"
      "libquery_engine-debian-openssl-3.0.x.so.node"
    )
  fi
  for engine in "${REQUIRED_CLIENT_ENGINES[@]}"; do
    ALLOW_GENERIC_ALIAS="false"
    if [ "$LINUX_PACKAGE_TARGET_ARCH" = "arm64" ]; then
      ALLOW_GENERIC_ALIAS="true"
    fi
    validate_prisma_client_engine_file "${CLIENT_DIR}" "${engine}" "${ALLOW_GENERIC_ALIAS}" || exit 1
  done
  echo -e "${GREEN}✓${NC} Prisma client Linux ${LINUX_PACKAGE_TARGET_ARCH} runtime engines verified in ${CLIENT_DIR}"
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

if [ -d "$WEB_ROOT/dist-mobile/public" ]; then
  mkdir -p "$TARGET_DIR/mobile-web"
  cp -R "$WEB_ROOT/dist-mobile/public/." "$TARGET_DIR/mobile-web/"
fi

echo -e "\n${YELLOW}Rebuilding native modules for Electron...${NC}"
ELECTRON_VERSION=$(node -p "require('${WEB_ROOT}/package.json').devDependencies.electron.replace(/^\\^/, '')")
pnpm -C "$WEB_ROOT" exec electron-rebuild -v "$ELECTRON_VERSION" -m "$TARGET_DIR" -w node-pty

echo -e "\n${YELLOW}Normalizing node-pty spawn-helper execute bits...${NC}"
normalize_node_pty_spawn_helpers

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
