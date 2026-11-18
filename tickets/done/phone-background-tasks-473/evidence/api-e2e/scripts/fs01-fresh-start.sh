#!/bin/bash
# autobyteus-473 FS-01 (TESTING.md, Fresh-start build): a fresh clone of the commit under test, the release job's install
# alone, then release-desktop.yml's macOS ARM64 build command and its two verify steps, in the job's order. Signing and
# notarization need the runner's secrets (not set: CSC_IDENTITY_AUTO_DISCOVERY=false). The changed build input is
# autobyteus-web/generated/graphql.ts (read by the build's typecheck). Usage: fs01-fresh-start.sh <commit> <clone dir>
set -u
W=/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473; C=$1; D=$2
echo "# FS-01 fresh-start build; commit $C; clone $D; $(date -u +%FT%TZ)"
rm -rf "$D"; git clone --no-local --quiet "$W" "$D" && git -C "$D" checkout --quiet "$C"; echo "clone exit $? at $(git -C "$D" rev-parse --short HEAD)"
ls "$D/autobyteus-web/electron-dist" "$D/autobyteus-server-ts/dist" 2>&1 | head -2
cd "$D" && echo "## pnpm install --frozen-lockfile" && pnpm install --frozen-lockfile > "$D.install.log" 2>&1; echo "install exit $?"; tail -2 "$D.install.log"
cd "$D/autobyteus-web" && echo "## build:electron:mac -- --arm64" && ulimit -n 65536 2>/dev/null || ulimit -n 10240
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace \
  pnpm build:electron:mac -- --arm64 > "$D.build.log" 2>&1; echo "build exit $?"; grep -E "\[typecheck\]|production errors|PASS|FAIL|error" "$D.build.log" | head -12; tail -3 "$D.build.log"
cd "$D" && echo "## Verify bundled Prisma ARM64 engine target"
ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"; test -n "$ENGINES_DIR" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" && echo "schema engine darwin-arm64: present"
CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"; test -n "$CLIENT_DIR" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" && echo "query engine darwin-arm64: present"
echo "## Verify packaged terminal runtime ARM64"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64; echo "verify resources exit $?"
APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"; test -n "$APP_SERVER_ROOT" && node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64; echo "verify app exit $?"
echo "FS-01 done $(date -u +%FT%TZ)"
