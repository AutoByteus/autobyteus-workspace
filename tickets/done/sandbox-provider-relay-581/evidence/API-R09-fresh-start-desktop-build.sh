#!/bin/bash
# API-R09 fresh-start desktop build (TESTING.md § Fresh-start build): fresh --no-local clone, frozen install, the macOS
# ARM64 job's build and verify steps (signing and notarization need the runner: not tested).
set -u
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay
COMMIT=$(git -C $WT rev-parse HEAD)
D=/tmp/api581/fresh/clone
rm -rf /tmp/api581/fresh && mkdir -p /tmp/api581/fresh
echo "# API-R09 fresh-start desktop build"; echo "# commit: $COMMIT (code d624f09ce6); Node $(node -v); date $(date -u +%FT%TZ)"; echo
git clone --no-local --quiet $WT $D && git -C $D checkout --quiet $COMMIT && echo "clone at $(git -C $D rev-parse --short HEAD)"
cd $D && echo "== pnpm install --frozen-lockfile" && pnpm install --frozen-lockfile 2>&1 | tail -4; echo "install exit ${PIPESTATUS[0]}"
cd $D/autobyteus-web && echo "== build:electron:mac -- --arm64" && ulimit -n 65536 2>/dev/null || ulimit -n 10240
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 > /tmp/api581/fresh/build.log 2>&1
B=$?; grep -E "\[typecheck\]|guard|PASS|error TS|ERR_|Error:" /tmp/api581/fresh/build.log | tail -15; tail -5 /tmp/api581/fresh/build.log; echo "build exit $B"
cd $D && echo "== Verify bundled Prisma ARM64 engine target" && (
  ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"; test -n "$ENGINES_DIR" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" &&
  CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"; test -n "$CLIENT_DIR" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" ); echo "prisma verify exit $?"
echo "== Verify packaged terminal runtime ARM64" && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64 2>&1 | tail -2; echo "terminal verify (resources) exit ${PIPESTATUS[0]}"
APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"; test -n "$APP_SERVER_ROOT" && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 2>&1 | tail -2; echo "terminal verify (app) exit $?"
APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}"; env -u ELECTRON_RUN_AS_NODE ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe 2>&1 | tail -2; echo "spawn probe exit ${PIPESTATUS[0]}"
