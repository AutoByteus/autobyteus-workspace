#!/bin/bash
# ios-demo-mode-279 API/E2E (temporary): FS-iOS, the Fresh-start build of `release-ios.yml`'s `build-ios` job (TESTING.md
# Fresh-start build). A fresh clone of the commit under test (no `dist/`, no Prisma client, no generated `DemoWeb/`), then the
# job's steps in the job's order with the workflow's default values; the simulator is my own (IOS_SIMULATOR_NAME).
# Usage: fs-ios.sh <worktree> <commit> <clone dir> <evidence dir> <simulator name>
set -uo pipefail
WT=$1; COMMIT=$2; CLONE=$3; OUT=$4; SIM=$5
mkdir -p "$OUT"; LOG="$OUT/FS-iOS.log"; : > "$LOG"
step() { local name=$1; shift; echo "## $(date -u +%FT%TZ) $name: $*" | tee -a "$LOG"; local t0=$SECONDS; "$@" >> "$LOG" 2>&1; local rc=$?; echo "## $name exit=$rc ($((SECONDS - t0)) s)" | tee -a "$LOG"; return $rc; }
export IOS_APP_SCHEME=AutoByteusMobile IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share
export MARKETING_VERSION=1.3.83 CURRENT_PROJECT_VERSION=1 IOS_SIMULATOR_NAME="$SIM"
UDID="$(xcrun simctl list devices available | awk -v name="$SIM" '$0 ~ name && $0 ~ /Shutdown|Booted/ { gsub(/[()]/,"",$0); print $(NF-1); exit }')"
export IOS_SIMULATOR_DESTINATION="platform=iOS Simulator,id=$UDID"
echo "# FS-iOS: commit $COMMIT; clone $CLONE; simulator $SIM ($UDID); Xcode $(xcodebuild -version | head -1); node $(node -v); pnpm $(pnpm -v)" | tee -a "$LOG"
rm -rf "$CLONE"
step clone git clone --no-local --quiet "$WT" "$CLONE" || exit 1
cd "$CLONE" || exit 1
step checkout git checkout --quiet "$COMMIT" || exit 1
echo "# fresh: $(ls -d autobyteus-web/dist autobyteus-web/dist-mobile-demo autobyteus-ios/DemoWeb autobyteus-server-ts/dist 2>/dev/null | wc -l | tr -d ' ') prior build folders" | tee -a "$LOG"
step install pnpm install --frozen-lockfile || exit 1
step prepare-demo-web autobyteus-ios/scripts/prepare-demo-web.sh --build || exit 1
step contract-check autobyteus-ios/scripts/ios-release-contract-check.py || exit 1
step generate-project autobyteus-ios/scripts/generate-project.sh || exit 1
step simulator-build xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme "$IOS_APP_SCHEME" -destination "$IOS_SIMULATOR_DESTINATION" \
  IOS_BUNDLE_ID="$IOS_BUNDLE_ID" IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID" MARKETING_VERSION="$MARKETING_VERSION" CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION" build || exit 1
step core-tests xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme "$IOS_APP_SCHEME" -destination "$IOS_SIMULATOR_DESTINATION" \
  -resultBundlePath "$OUT/FS-iOS-AutoByteusMobileCoreTests.xcresult" -only-testing:AutoByteusMobileCoreTests \
  IOS_BUNDLE_ID="$IOS_BUNDLE_ID" IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID" MARKETING_VERSION="$MARKETING_VERSION" CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION" test || exit 1
step simulator-smoke autobyteus-ios/scripts/ios-simulator-smoke.sh "$OUT/FS-iOS-smoke" || exit 1
echo "## FS-iOS done" | tee -a "$LOG"
