#!/bin/bash
# autobyteus-435 API/E2E round 2 environment builds from the worktree at HEAD (no build input changed since round 1's
# fresh-start proof): the server package of Dockerfile.monorepo for the test node, and the Android debug + test APKs.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435; PKG=/private/tmp/abx435-api2/server-package
cd $W || exit 1
echo "# round-2 builds; commit $(git rev-parse --short HEAD); $(date -u +%FT%TZ)"
grep -v '^# syntax=' autobyteus-server-ts/docker/Dockerfile.monorepo > /dev/null
docker buildx build --builder desktop-linux --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=$PKG --progress plain . > /private/tmp/abx435-api2/buildx.log 2>&1; echo "server-package exit=$?"
grep -c "you can't delegate to yourself" $PKG/dist/agent-collaboration/collaborators/collaborator-errors.js 2>/dev/null | sed 's/^/self words in the package: /'
cd autobyteus-android && ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest < /dev/null > /private/tmp/abx435-api2/gradle.log 2>&1; echo "android exit=$?"
for f in app/build/outputs/apk/debug/app-debug.apk app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk; do echo "$f sha256 $(shasum -a 256 $f | cut -c1-16)"; done
echo "== ALL DONE $(date -u +%FT%TZ)"
