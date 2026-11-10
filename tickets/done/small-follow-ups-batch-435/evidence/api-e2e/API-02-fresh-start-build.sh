#!/bin/bash
# autobyteus-435 API/E2E API-02: fresh-start build of the commit under test, as the release runner does (TESTING.md
# § Fresh-start build): a fresh clone, `pnpm install --frozen-lockfile` alone, then the desktop job's macOS ARM64 build
# command and its "Verify bundled Prisma" and "Verify packaged terminal runtime" steps from the clone's root.
# Usage: API-02-fresh-start-build.sh <commit>
set -uo pipefail
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435
COMMIT=${1:?commit}
DIR=/private/tmp/abx435-api/fresh-clone
echo "# API-02 fresh-start build; commit ${COMMIT}; $(date -u +%FT%TZ); macOS $(sw_vers -productVersion) $(uname -m); node $(node -v); pnpm $(pnpm -v)"
rm -rf "$DIR"
git clone --no-local --quiet "$WT" "$DIR" && cd "$DIR" && git checkout --quiet "$COMMIT" || exit 1
echo "== HEAD: $(git rev-parse HEAD); untracked dist folders: $(find . -maxdepth 2 -name dist -type d -not -path './node_modules/*' | sort | tr '\n' ' ')"
echo "== step: pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile > /private/tmp/abx435-api/API-02-install.log 2>&1; rc=$?; tail -5 /private/tmp/abx435-api/API-02-install.log; echo "install exit=$rc"; [ $rc -eq 0 ] || exit $rc
echo "== step: build:electron:mac --arm64 (autobyteus-web)"
ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
( cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 ) > /private/tmp/abx435-api/API-02-build.log 2>&1; rc=$?
grep -E '\[typecheck\]|guard:|production errors|test-file errors|Passed|error TS|ERR_|Error:' /private/tmp/abx435-api/API-02-build.log | head -30; tail -8 /private/tmp/abx435-api/API-02-build.log; echo "build exit=$rc"; [ $rc -eq 0 ] || exit $rc
echo "== step: Verify bundled Prisma ARM64 engine target"
( set -e
  ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"; test -n "$ENGINES_DIR"
  test -f "$ENGINES_DIR/schema-engine-darwin-arm64"
  CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"; test -n "$CLIENT_DIR"
  test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" ); echo "PRISMA exit=$?"
echo "== step: Verify packaged terminal runtime ARM64"
( set -e
  node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64
  APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"; test -n "$APP_SERVER_ROOT"
  node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64
  APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}"
  ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe ) 2>&1 | tail -6; echo "TERMINAL exit=${PIPESTATUS[0]}"
ls -d autobyteus-web/electron-dist/*/AutoByteus.app
grep -c 'window_refused\|windowRefused' -r autobyteus-web/.output 2>/dev/null | grep -v ':0' | head -3
echo "== ALL DONE $(date -u +%FT%TZ)"
