#!/bin/bash
# API-FS fresh-start desktop build (TESTING.md § Fresh-start build), as the release-desktop build-macos-arm64 job runs it.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437; E=$W/tickets/in-progress/node-universal-authentication-437/evidence/api-e2e; L=$E/API-FS-fresh-start-build.log
C=/tmp/abtest437r2/fs-clone; SHA=$(git -C $W rev-parse HEAD); rm -rf $C
step() { echo; echo "## $1 ($(date -u +%T))"; }
{
echo "# API-FS fresh-start desktop build; commit $SHA; macOS $(sw_vers -productVersion) arm64, node $(node -v), pnpm $(pnpm -v); $(date -u +%FT%TZ)"
step "git clone --no-local <worktree> && git checkout <commit> && git submodule update --init --recursive"
git clone -q --no-local $W $C && git -C $C checkout -q $SHA && git -C $C submodule update --init --recursive 2>&1 | tail -3; echo "clone exit $?; HEAD $(git -C $C rev-parse --short HEAD); dist folders before install: $(find $C -maxdepth 3 -type d -name dist -not -path '*/node_modules/*' | wc -l | tr -d ' ') (the contract packages track their dist)"
step "pnpm install --frozen-lockfile"
(cd $C && pnpm install --frozen-lockfile 2>&1 | tail -4); echo "install exit ${PIPESTATUS[0]}"
step "cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64"
(cd $C/autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 > $E/API-FS-build-electron.full.log 2>&1); bs=$?; grep -E "typecheck|production errors|guard|Exit|error TS| ERROR |building  *target" $E/API-FS-build-electron.full.log | tail -15; echo "build exit $bs"
step "Verify bundled Prisma ARM64 engine target"
(cd $C && ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" && CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" && echo "prisma engines ok: $ENGINES_DIR, $CLIENT_DIR"); echo "prisma verify exit $?"
step "Verify packaged terminal runtime ARM64 (resources, app bundle, spawn probe)"
(cd $C && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64 2>&1 | tail -2 && APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)" && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 2>&1 | tail -2 && APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}" && ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe 2>&1 | tail -2); echo "terminal verify exit $?"
step "Not tested: Apple signing/notarization and the signing-policy step (runner secrets); macOS x64, Linux, Windows jobs (other runners)"
} > $L 2>&1
gzip -f $E/API-FS-build-electron.full.log
rm -rf $C
echo DONE > /tmp/abtest437r2/api-fs.done
