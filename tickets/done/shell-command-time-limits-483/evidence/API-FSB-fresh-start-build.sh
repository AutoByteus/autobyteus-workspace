#!/bin/bash
# API-FSB fresh-start build (TESTING.md "Fresh-start build"; release-desktop.yml macOS ARM64 job order).
# usage: fresh-start-build.sh <worktree> <commit> <clone dir>
set -u
WT="$1"; COMMIT="$2"; CLONE="$3"
echo "# API-FSB fresh-start build; commit $COMMIT; $(date -u +%Y-%m-%dT%H:%M:%SZ); node $(node --version); pnpm $(pnpm --version); $(uname -sm)"
rm -rf "$CLONE"
git clone --no-local "$WT" "$CLONE" && cd "$CLONE" && git checkout --detach "$COMMIT" || exit 10
echo "## step: pnpm install --frozen-lockfile"; pnpm install --frozen-lockfile || exit 11
echo "## step: build:electron:mac -- --arm64"
cd autobyteus-web
ulimit -n 65536 2>/dev/null || ulimit -n 10240 || true
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 || exit 12
cd "$CLONE"
echo "## step: Verify bundled Prisma ARM64 engine target"
ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"
test -n "$ENGINES_DIR" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" || exit 13
CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"
test -n "$CLIENT_DIR" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" || exit 14
echo "Prisma OK: $ENGINES_DIR ; $CLIENT_DIR"
echo "## step: Verify packaged terminal runtime ARM64"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64 || exit 15
APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"
test -n "$APP_SERVER_ROOT" || exit 16
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 || exit 17
APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}"
ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe || exit 18
echo "## RESULT: PASS"
