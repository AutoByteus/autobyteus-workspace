#!/bin/bash
# Temporary, ticket-owned fresh-start build proof for autobyteus-277 (TESTING.md "Fresh-start build"): a fresh clone of
# the commit under test, `pnpm install --frozen-lockfile` alone, then the release workflow's macOS ARM64 job
# (`.github/workflows/release-desktop.yml`: "Build Electron macOS ARM64", "Verify bundled Prisma ARM64 engine target",
# "Verify packaged terminal runtime ARM64"). Signing and notarization need the runner's secrets: not run.
# Usage: fresh-start-build.sh <commit> <log dir>
set -uo pipefail
COMMIT="$1"; LOGS="$2"
WORKTREE=/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign
mkdir -p "$LOGS"
ROOT="$(cd "$(mktemp -d /tmp/autobyteus277-fresh-XXXXXX)" && pwd -P)"
step() { echo "== $(date '+%H:%M:%S') $*" | tee -a "$LOGS/steps.log"; }
finish() { step "result: $1"; rm -rf "$ROOT"; step "clone removed: $([ -d "$ROOT" ] && echo no || echo yes)"; exit "$2"; }

step "clone $COMMIT into $ROOT"
git clone --quiet --no-local "$WORKTREE" "$ROOT/repo" >"$LOGS/clone.log" 2>&1 || finish "clone failed" 1
cd "$ROOT/repo" && git checkout --quiet "$COMMIT" && git submodule update --init --recursive >>"$LOGS/clone.log" 2>&1 || finish "checkout failed" 1
step "build outputs before install: $(ls -d autobyteus-*/dist autobyteus-web/.output autobyteus-web/electron-dist autobyteus-server-ts/dist 2>/dev/null | tr '\n' ' ')"

step "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile >"$LOGS/install.log" 2>&1 || finish "install failed (see install.log)" 1

step "Build Electron macOS ARM64 (autobyteus-web: pnpm build:electron:mac -- --arm64)"
cd autobyteus-web
ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x \
  CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace \
  pnpm build:electron:mac -- --arm64 >"$LOGS/build.log" 2>&1 || finish "build failed (see build.log)" 1
cd ..

step "Verify bundled Prisma ARM64 engine target"
{
  ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"
  test -n "$ENGINES_DIR" && echo "Prisma engines dir: $ENGINES_DIR" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" \
  && CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)" \
  && test -n "$CLIENT_DIR" && echo "Prisma client dir: $CLIENT_DIR" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" && echo "PRISMA OK"
} >"$LOGS/verify-prisma.log" 2>&1 || finish "Prisma verification failed" 1

step "Verify packaged terminal runtime ARM64"
{
  node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64 \
  && APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)" \
  && test -n "$APP_SERVER_ROOT" \
  && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 \
  && APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}" \
  && ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs \
       --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe \
  && echo "TERMINAL RUNTIME OK"
} >"$LOGS/verify-terminal.log" 2>&1 || finish "terminal runtime verification failed" 1

finish "Pass" 0
