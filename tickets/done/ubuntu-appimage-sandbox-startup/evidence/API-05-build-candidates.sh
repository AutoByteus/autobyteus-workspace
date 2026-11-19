#!/bin/bash
set -euo pipefail
RUN=/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5
R=$(cat "$RUN/active-continuation")
export PATH=/tmp/autobyteus-5-toolchain/bin:/tmp/autobyteus-5-toolchain/go/bin:/tmp/autobyteus-5-toolchain/cxx/root/usr/bin:$PATH
export LD_LIBRARY_PATH=/tmp/autobyteus-5-toolchain/cxx/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
export CPLUS_INCLUDE_PATH=/tmp/autobyteus-5-toolchain/cxx/root/usr/include/c++/15:/tmp/autobyteus-5-toolchain/cxx/root/usr/include/x86_64-linux-gnu/c++/15
export LIBRARY_PATH=/tmp/autobyteus-5-toolchain/cxx/root/usr/lib/gcc/x86_64-linux-gnu/15
export CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace AUTOBYTEUS_BUILD_FLAVOR=personal
export AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE="$RUN/trust/desktop-public.pem" AUTOBYTEUS_DESKTOP_TEST_KEY_FILE="$RUN/trust/desktop-test-private.pem"
cd "$RUN/fresh"
test "$(git rev-parse --short=10 HEAD)" = 0df0c901e4
mkdir -p "$R/original"
cp autobyteus-web/package.json "$R/original/"
cp autobyteus-web/electron-dist/{*.AppImage,*.release.json,*.release.json.sig,latest-linux.yml} "$R/original/"
trap 'cp "$R/original/package.json" autobyteus-web/package.json' EXIT
for V in 1.5.14 1.5.15;do
  mkdir "$R/$V"
  node -e 'const fs=require("node:fs"),p="autobyteus-web/package.json"; const src=fs.readFileSync(p,"utf8"); fs.writeFileSync(p,src.replace(/("version":\s*")[^"]+/, "$1"+process.argv[1]))' "$V"
  test "$(node -p "require('./autobyteus-web/package.json').version")" = "$V"
  pnpm -C autobyteus-web build:electron:linux:x64
  A="autobyteus-web/electron-dist/AutoByteus_personal_linux-x64-$V.AppImage"
  node scripts/desktop-package/sign-release.mjs "$A" "$V" x64 "$AUTOBYTEUS_DESKTOP_TEST_KEY_FILE" "$AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE"
  node scripts/desktop-package/verify-release.mjs "$A" "$V" x64 "$AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE"
  node scripts/desktop-package/verify-layout.mjs "$A" "$AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE"
  python3 scripts/validate_linux_updater_metadata.py --metadata autobyteus-web/electron-dist/latest-linux.yml --arch-token linux-x64 --image "$A"
  cp "$A" "$A.release.json" "$A.release.json.sig" autobyteus-web/electron-dist/latest-linux.yml "$R/$V/"
  sha256sum "$A"; echo "API-05-CANDIDATE-READY $V"
done
