#!/bin/bash
# autobyteus-405 API-E2E fresh-start: server-package image stage + desktop release job, from a fresh clone
set -uo pipefail
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-through-node-server
COMMIT=952bc1fcd0
DIR=/private/tmp/abx405-api/fresh-clone
PKG=/private/tmp/abx405-api/server-package
echo "# fresh-start; commit ${COMMIT}; $(date -u +%FT%TZ); macOS $(sw_vers -productVersion) $(uname -m); node $(node -v); pnpm $(pnpm -v); docker $(docker version --format '{{.Server.Version}}')"
rm -rf "$DIR" "$PKG"
git clone --no-local --quiet "$WT" "$DIR" && cd "$DIR" && git checkout --quiet "$COMMIT" || exit 1
echo "== HEAD: $(git rev-parse HEAD); untracked files: $(git status --porcelain | wc -l | tr -d ' ')"
echo "== step: docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=$PKG ."
docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=$PKG --progress plain . 2>&1 | tail -40; rc=${PIPESTATUS[0]}; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc
ls $PKG | head; echo "server package version: $(node -p "require('$PKG/package.json').version" 2>/dev/null)"; ls $PKG/dist/node-desktop 2>&1
echo "== step: python3 scripts/check_repository_artifact_hygiene.py"; python3 scripts/check_repository_artifact_hygiene.py; echo "exit=$?"
echo "== step: python3 scripts/check_licensing.py"; python3 scripts/check_licensing.py; echo "exit=$?"
echo "== step: pnpm install --frozen-lockfile"; pnpm install --frozen-lockfile; rc=$?; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc
cd autobyteus-web
echo "== step: pnpm build:electron:mac -- --arm64"
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64; rc=$?; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc
cd "$DIR"
echo "== step: Verify bundled Prisma ARM64 engine target"
ENGINES_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 6 -type d -path '*/@prisma/engines' | head -n1)"
test -n "$ENGINES_DIR" && test -f "$ENGINES_DIR/schema-engine-darwin-arm64" && echo "prisma engine ok: $ENGINES_DIR" || echo "prisma engine MISSING"
CLIENT_DIR="$(find autobyteus-web/resources/server/node_modules -maxdepth 10 -type d -path '*/node_modules/.prisma/client' | head -n1)"
test -n "$CLIENT_DIR" && test -f "$CLIENT_DIR/libquery_engine-darwin-arm64.dylib.node" && echo "prisma client ok: $CLIENT_DIR" || echo "prisma client MISSING"
echo "== step: Verify packaged terminal runtime ARM64"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root autobyteus-web/resources/server --platform darwin --arch arm64; echo "exit=$?"
APP_SERVER_ROOT="$(find autobyteus-web/electron-dist -path '*/AutoByteus.app/Contents/Resources/server' -type d -print -quit)"
node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64; echo "exit=$?"
APP_BUNDLE="${APP_SERVER_ROOT%/Contents/Resources/server}"
ELECTRON_RUN_AS_NODE=1 "$APP_BUNDLE/Contents/MacOS/AutoByteus" autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root "$APP_SERVER_ROOT" --platform darwin --arch arm64 --spawn-probe; echo "exit=$?"
echo "APP_BUNDLE=$APP_BUNDLE"
echo "== ALL DONE $(date -u +%FT%TZ)"
