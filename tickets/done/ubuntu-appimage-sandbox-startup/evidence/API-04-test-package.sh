#!/bin/bash
set -euo pipefail
RUN=/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5
export PATH=/tmp/autobyteus-5-toolchain/go/bin:$PATH
cd "$RUN/fresh"
echo 'API-04 test-origin package | 2026-11-18 | source 0df0c901e4 | full fresh renderer/server; native desktop_test loopback-only; disposable key'
mkdir -p "$RUN/test-package/stage"
cp -a autobyteus-web/electron-dist/linux-unpacked "$RUN/test-package/app"
node --input-type=module - <<'JS'
import {buildNative} from './scripts/desktop-package/build-native.mjs';
buildNative({version:'1.5.13',arch:'x64',publicKeyFile:'/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5/trust/desktop-public.pem',output:'/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5/test-package/native',asset:'AutoByteus_personal_linux-x64-1.5.13.AppImage',testOrigin:'http://127.0.0.1:18889'});
JS
for name in AppRun autobyteus-provision autobyteus-install-client;do cp "$RUN/test-package/native/$name" "$RUN/test-package/app/$name";done
cp "$RUN/test-package/native/identity.json" "$RUN/test-package/app/resources/linux-install-identity.json"
BUILDER=$(find node_modules/.pnpm -path '*/app-builder-bin/linux/x64/app-builder' -print -quit)
IMAGE="$RUN/test-package/AutoByteus_personal_linux-x64-1.5.13.AppImage"
"$BUILDER" appimage --stage "$RUN/test-package/stage" --arch x64 --output "$IMAGE" --app "$RUN/test-package/app" --configuration "$(cat /tmp/autobyteus-5-native/fixture-config.json)"
node scripts/desktop-package/sign-release.mjs "$IMAGE" 1.5.13 x64 "$RUN/trust/desktop-test-private.pem" "$RUN/trust/desktop-public.pem"
node scripts/desktop-package/verify-layout.mjs "$IMAGE" "$RUN/trust/desktop-public.pem"
sha256sum "$IMAGE" "$RUN/test-package/native/autobyteus-provision"
echo API-04-FULL-TEST-PACKAGE-READY
