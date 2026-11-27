#!/bin/bash
cd /tmp/661-api && rm -rf fresh && git clone -q --no-local /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-661-private-network fresh && cd fresh && git checkout -q b59628b4bf && git log --oneline -1
echo "## pnpm install --frozen-lockfile"; pnpm install --frozen-lockfile || exit 1
cd autobyteus-web
echo "## build:electron:mac"; NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace env -u ELECTRON_RUN_AS_NODE pnpm build:electron:mac -- --arm64; echo "build exit $?"
cd ..
echo "## Verify bundled Prisma ARM64 engine target"
ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"
CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"
test -f "$ENGINES_DIR/schema-engine-darwin-arm64" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" && echo "prisma verify: PASS" || echo "prisma verify: FAIL"
echo "## Verify packaged terminal runtime ARM64"
APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64 && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 && ELECTRON_RUN_AS_NODE=1 "${APP_SERVER_ROOT%/Contents/Resources/server}/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe && echo "terminal runtime verify: PASS" || echo "terminal runtime verify: FAIL"
