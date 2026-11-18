#!/bin/bash
# autobyteus-435 API/E2E API-04 (server package of Dockerfile.monorepo, as the server Docker job builds it) and API-05
# (Android debug APK and its instrumented-test APK) from the fresh clone of the commit under test.
set -uo pipefail
DIR=/private/tmp/abx435-api/fresh-clone
PKG=/private/tmp/abx435-api/server-package
cd "$DIR" || exit 1
echo "# API-04/05 builds; commit $(git rev-parse HEAD); $(date -u +%FT%TZ); macOS $(sw_vers -productVersion) $(uname -m); docker $(docker version --format '{{.Server.Version}}')"
rm -rf "$PKG"
echo "== API-04: buildx server-package (linux/arm64)"
docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=$PKG --progress plain . > /private/tmp/abx435-api/API-04-buildx.log 2>&1; rc=$?
if [ $rc -ne 0 ] && grep -q 'docker/dockerfile' /private/tmp/abx435-api/API-04-buildx.log; then
  echo "frontend image unreachable; retry with a copy without the '# syntax' line (as autobyteus-432 API-02)"
  grep -v '^# syntax=' autobyteus-server-ts/docker/Dockerfile.monorepo > /private/tmp/abx435-api/Dockerfile.monorepo.nosyntax
  docker buildx build --builder desktop-linux --platform linux/arm64 -f /private/tmp/abx435-api/Dockerfile.monorepo.nosyntax --target server-package --output type=local,dest=$PKG --progress plain . > /private/tmp/abx435-api/API-04-buildx.log 2>&1; rc=$?
fi
tail -6 /private/tmp/abx435-api/API-04-buildx.log; echo "API-04 exit=$rc"
ls $PKG | head; echo "taskExecutionReferenceKey in the package's contracts: $(grep -rl 'taskExecutionReferenceKey' $PKG/node_modules/@autobyteus/collaboration-stream-contracts/dist 2>/dev/null | head -2 | tr '\n' ' ')"
echo "phone bundle with the row restore: $(grep -rl 'mobile-run-opening' $PKG/mobile-web 2>/dev/null | head -1)"
echo "== API-05: Android :app:assembleDebug :app:assembleDebugAndroidTest"
cd autobyteus-android && ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest < /dev/null > /private/tmp/abx435-api/API-05-gradle.log 2>&1; rc=$?
tail -4 /private/tmp/abx435-api/API-05-gradle.log; echo "API-05 exit=$rc"
for f in app/build/outputs/apk/debug/app-debug.apk app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk; do echo "$f sha256 $(shasum -a 256 $f | cut -c1-16)"; done
echo "== ALL DONE $(date -u +%FT%TZ)"
