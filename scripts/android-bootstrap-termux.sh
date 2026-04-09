#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$ROOT_DIR"
CHECK_ONLY=0
SKIP_WORKSPACE_INSTALL=0
SKIP_VERIFY=0
SKIP_BUILD=0
ANDROID_INSTALL_FILTERS=(
  "--filter=./autobyteus-ts..."
  "--filter=./autobyteus-server-ts..."
  "--filter=./autobyteus-message-gateway..."
)

usage() {
  cat <<'EOF'
Usage: scripts/android-bootstrap-termux.sh [options]

Options:
  --check-only              Validate environment only (do not install/build)
  --skip-workspace-install  Skip Android-scoped `pnpm install --no-optional --filter ...`
  --skip-verify             Skip `pnpm verify:android-profile`
  --skip-build              Skip `pnpm --filter autobyteus-server-ts run build`
  --workspace-root <path>   Override workspace root (default: repo root)
  -h, --help                Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      break
      ;;
    --check-only)
      CHECK_ONLY=1
      shift
      ;;
    --skip-workspace-install)
      SKIP_WORKSPACE_INSTALL=1
      shift
      ;;
    --skip-verify)
      SKIP_VERIFY=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --workspace-root)
      WORKSPACE_ROOT="${2:-}"
      if [[ -z "$WORKSPACE_ROOT" ]]; then
        echo "Missing value for --workspace-root" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v pkg >/dev/null 2>&1; then
  echo "This script must run inside Termux (missing 'pkg')." >&2
  exit 1
fi

if [[ ! -d "/data/data/com.termux/files/usr" ]]; then
  echo "Termux prefix not found at /data/data/com.termux/files/usr." >&2
  exit 1
fi

if [[ ! -f "$WORKSPACE_ROOT/package.json" ]]; then
  echo "Workspace root not found: $WORKSPACE_ROOT" >&2
  exit 1
fi

MISSING_PACKAGES=()
for package_name in nodejs termux-api git; do
  if ! dpkg -s "$package_name" >/dev/null 2>&1; then
    MISSING_PACKAGES+=("$package_name")
  fi
done

if [[ ${#MISSING_PACKAGES[@]} -gt 0 ]]; then
  if [[ $CHECK_ONLY -eq 1 ]]; then
    echo "Missing Termux packages: ${MISSING_PACKAGES[*]}" >&2
    exit 1
  fi

  echo "Installing missing Termux packages: ${MISSING_PACKAGES[*]}"
  pkg update -y
  pkg install -y "${MISSING_PACKAGES[@]}"
else
  echo "Termux packages are present: nodejs termux-api git"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not available after package install." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not available after package install." >&2
  exit 1
fi

PNPM_VERSION="$(
  node -e "const fs=require('node:fs');const pkg=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const pm=pkg.packageManager||'';const m=pm.match(/^pnpm@(.*)$/);if(m)process.stdout.write(m[1]);" \
    "$WORKSPACE_ROOT/package.json" || true
)"
if [[ -z "$PNPM_VERSION" ]]; then
  PNPM_VERSION="10.28.2"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if [[ $CHECK_ONLY -eq 1 ]]; then
    echo "pnpm is missing in check-only mode." >&2
    exit 1
  fi
  echo "Installing pnpm@$PNPM_VERSION"
  npm install -g "pnpm@$PNPM_VERSION"
fi

MISSING_TERMUX_API_COMMANDS=()
for command_name in termux-battery-status termux-torch termux-media-player termux-volume; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    MISSING_TERMUX_API_COMMANDS+=("$command_name")
  fi
done

if [[ ${#MISSING_TERMUX_API_COMMANDS[@]} -gt 0 ]]; then
  echo "Missing termux-api commands: ${MISSING_TERMUX_API_COMMANDS[*]}" >&2
  echo "Install/repair with: pkg install -y termux-api" >&2
  exit 1
fi

if ! termux-battery-status >/dev/null 2>&1; then
  cat >&2 <<'EOF'
termux-api command bridge is not responding.
Ensure the Android app "Termux:API" is installed and permissions are granted.
EOF
  exit 1
fi

if [[ $CHECK_ONLY -eq 1 ]]; then
  echo "Check-only validation passed."
  exit 0
fi

cd "$WORKSPACE_ROOT"

if [[ $SKIP_WORKSPACE_INSTALL -eq 0 ]]; then
  echo "Running Android workspace install (server/core/gateway only)..."
  pnpm install --no-optional --frozen-lockfile=false "${ANDROID_INSTALL_FILTERS[@]}"
else
  echo "Skipping workspace install (--skip-workspace-install)."
fi

if [[ $SKIP_VERIFY -eq 0 ]]; then
  echo "Running Android profile verification..."
  pnpm verify:android-profile
else
  echo "Skipping Android profile verification (--skip-verify)."
fi

if [[ $SKIP_BUILD -eq 0 ]]; then
  echo "Building Android server..."
  pnpm --filter autobyteus-server-ts run build
else
  echo "Skipping build (--skip-build)."
fi

cat <<'EOF'
Android bootstrap complete.

Next:
  pnpm android:server:start            # foreground
  pnpm android:server:start:bg         # background
  pnpm android:server:status
EOF
