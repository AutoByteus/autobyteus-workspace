#!/bin/bash
# autobyteus-407 API/E2E: test-environment builds from a fresh clone of 165de82af4
set -uo pipefail
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/node-desktop-on-phone
COMMIT=165de82af4
DIR=/private/tmp/abx407-api/fresh-clone
PKG=/private/tmp/abx407-api/server-package
echo "# builds; commit ${COMMIT}; $(date -u +%FT%TZ); macOS $(sw_vers -productVersion) $(uname -m); node $(node -v); pnpm $(pnpm -v); docker $(docker version --format '{{.Server.Version}}')"
rm -rf "$DIR" "$PKG"
git clone --no-local --quiet "$WT" "$DIR" && cd "$DIR" && git checkout --quiet "$COMMIT" || exit 1
echo "== HEAD: $(git rev-parse HEAD)"
echo "== step: buildx server-package"
docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=$PKG --progress plain . 2>&1 | tail -15; rc=${PIPESTATUS[0]}; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc
ls $PKG/dist/node-desktop; ls $PKG | head -20
echo "== step: pnpm install --frozen-lockfile"; pnpm install --frozen-lockfile > /private/tmp/abx407-api/install.log 2>&1; rc=$?; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc
cd autobyteus-web
echo "== step: pnpm build:electron:mac -- --arm64"
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 > /private/tmp/abx407-api/desktop-build.log 2>&1; rc=$?; echo "exit=$rc"
grep -E "\[typecheck\]|guard:.*Passed|building +target=DMG" /private/tmp/abx407-api/desktop-build.log
echo "== ALL DONE $(date -u +%FT%TZ)"
