#!/bin/bash
set -e
SRC=/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids
DIR=/tmp/fresh526-clone
rm -rf "$DIR"
git clone -q --no-local "$SRC" "$DIR"
cd "$DIR"
git checkout -q 491395b89f
echo "commit: $(git rev-parse HEAD)"
echo "node: $(node -v)"
pnpm install --frozen-lockfile > /tmp/fresh526-install.log 2>&1
echo "install ok"
cd autobyteus-web
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 > /tmp/fresh526-build.log 2>&1
echo "build ok"
cd "$DIR"
ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"
test -n "$ENGINES_DIR"
test -f "$ENGINES_DIR/schema-engine-darwin-arm64"
CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"
test -n "$CLIENT_DIR"
test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node"
echo "verify prisma ok"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64
APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"
test -n "$APP_SERVER_ROOT"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64
echo "verify terminal runtime ok"
APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}"
ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe
echo "spawn probe ok"
