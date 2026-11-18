#!/bin/bash
# autobyteus-432 API/E2E: test-environment builds from a fresh clone of d76be54fb0
set -uo pipefail
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen
COMMIT=d76be54fb0
DIR=/private/tmp/abx432-api/fresh-clone
PKG=/private/tmp/abx432-api/server-package
echo "# builds; commit ${COMMIT}; $(date -u +%FT%TZ); macOS $(sw_vers -productVersion) $(uname -m); docker $(docker version --format '{{.Server.Version}}')"
rm -rf "$DIR" "$PKG"
git clone --no-local --quiet "$WT" "$DIR" && cd "$DIR" && git checkout --quiet "$COMMIT" || exit 1
echo "== HEAD: $(git rev-parse HEAD)"
# Docker Desktop cannot reach Docker Hub on this machine (a pull hangs), so the '# syntax=docker/dockerfile:1' frontend
# cannot be resolved; a copy without that first line uses BuildKit's built-in frontend (same stages; as the implementation did).
grep -v '^# syntax=' autobyteus-server-ts/docker/Dockerfile.monorepo > /private/tmp/abx432-api/Dockerfile.monorepo.nosyntax
diff autobyteus-server-ts/docker/Dockerfile.monorepo /private/tmp/abx432-api/Dockerfile.monorepo.nosyntax
echo "== step: buildx server-package"
docker buildx build --builder desktop-linux --platform linux/arm64 -f /private/tmp/abx432-api/Dockerfile.monorepo.nosyntax --target server-package --output type=local,dest=$PKG --progress plain . 2>&1 | tail -12; rc=${PIPESTATUS[0]}; echo "exit=$rc"; [ $rc -eq 0 ] || exit $rc
ls $PKG | head; grep -l "desktopFullScreen" -r $PKG/mobile-web 2>/dev/null | head -2
echo "== step: Android :app:testDebugUnitTest :app:assembleDebug"
cd autobyteus-android && ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :app:testDebugUnitTest :app:assembleDebug < /dev/null 2>&1 | tail -5; echo "exit=${PIPESTATUS[0]}"
ls -la app/build/outputs/apk/debug/app-debug.apk
for f in app/build/test-results/testDebugUnitTest/*.xml; do grep -o '<testsuite name="[^"]*" tests="[0-9]*" skipped="[0-9]*" failures="[0-9]*" errors="[0-9]*"' "$f"; done
echo "== ALL DONE $(date -u +%FT%TZ)"
