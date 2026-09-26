#!/usr/bin/env bash
# Local, isolated manual test of the current-worktree unsigned macOS ARM64 build.
set -euo pipefail
APP='/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus'
PACKAGE='/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-codex-skill-bundle-20260926'
[ -x "$APP" ] || { echo "Missing Electron executable: $APP" >&2; exit 1; }
[ -f "$PACKAGE/agents/codex/skills/software-engineering-workflow-skill/SKILL.md" ] || { echo "Missing current Codex skill package: $PACKAGE" >&2; exit 1; }
DATA_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/agy-electron-manual.XXXXXX")"
PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"
printf 'Isolated data root (retained for your inspection): %s\n' "$DATA_ROOT"
printf 'Bundled backend loopback port: %s\n' "$PORT"
printf 'Current Codex package root: %s\n' "$PACKAGE"
printf 'Close the app to stop it. Remove only the printed data root later if you no longer need the test state.\n'
exec env -u APP_ENV -u DATABASE_URL -u ELECTRON_RUN_AS_NODE \
  AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e \
  AUTOBYTEUS_ELECTRON_SERVER_PORT="$PORT" \
  AUTOBYTEUS_ELECTRON_DATA_ROOT="$DATA_ROOT" \
  AUTOBYTEUS_AGENT_PACKAGE_ROOTS="$PACKAGE" \
  "$APP"
