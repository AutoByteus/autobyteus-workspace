#!/bin/bash
set -euo pipefail
SOURCE=/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup
RUN=/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5
export PATH=/tmp/autobyteus-5-toolchain/bin:/tmp/autobyteus-5-toolchain/go/bin:/tmp/autobyteus-5-toolchain/cxx/root/usr/bin:$PATH
export LD_LIBRARY_PATH=/tmp/autobyteus-5-toolchain/cxx/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
export CPLUS_INCLUDE_PATH=/tmp/autobyteus-5-toolchain/cxx/root/usr/include/c++/15:/tmp/autobyteus-5-toolchain/cxx/root/usr/include/x86_64-linux-gnu/c++/15
export LIBRARY_PATH=/tmp/autobyteus-5-toolchain/cxx/root/usr/lib/gcc/x86_64-linux-gnu/15
export CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace AUTOBYTEUS_BUILD_FLAVOR=personal
printf 'API-02 | %s | source 0df0c901e4 | Ubuntu26 x64 fresh clone, disposable trust only\n' "$(date -u +%FT%TZ)"
node --version; pnpm --version; go version
set -x
git clone --no-local "$SOURCE" "$RUN/fresh"
cd "$RUN/fresh"
git checkout --detach 0df0c901e4
pnpm install --frozen-lockfile
node scripts/desktop-package/prepare-build-trust.mjs build-only "$RUN/trust"
export AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE="$RUN/trust/desktop-public.pem"
export AUTOBYTEUS_DESKTOP_TEST_KEY_FILE="$RUN/trust/desktop-test-private.pem"
node --test scripts/desktop-package/*.test.mjs
(cd autobyteus-web/linux-install && go test ./...)
pnpm -C autobyteus-web build:electron:linux:x64
VERSION=$(node -p "require('./autobyteus-web/package.json').version")
IMAGE="autobyteus-web/electron-dist/AutoByteus_personal_linux-x64-$VERSION.AppImage"
node scripts/desktop-package/sign-release.mjs "$IMAGE" "$VERSION" x64 "$AUTOBYTEUS_DESKTOP_TEST_KEY_FILE" "$AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE"
node scripts/desktop-package/verify-release.mjs "$IMAGE" "$VERSION" x64 "$AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE"
node scripts/desktop-package/verify-layout.mjs "$IMAGE" "$AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE"
python3 scripts/validate_linux_updater_metadata.py --metadata autobyteus-web/electron-dist/latest-linux.yml --arch-token linux-x64 --image "$IMAGE"
node autobyteus-web/scripts/verify-packaged-server-startup.mjs --server-root "$PWD/autobyteus-web/electron-dist/linux-unpacked/resources/server" --runtime-executable "$PWD/autobyteus-web/electron-dist/linux-unpacked/autobyteus"
sha256sum "$IMAGE"
echo API-02-CURRENT-PACKAGE-COMPLETE
