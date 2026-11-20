#!/bin/bash
# followup-cleanups-568 API/E2E IOS-01 (temporary): the iOS core tests from a checkout under /tmp (a symlink to /private/tmp on
# macOS: the path that failed SavedNodeEntryKeysMigrationTests in autobyteus-279, FU-005), then the simulator smoke on my own
# simulator, chosen by its exact name through select-ios-simulator.py (IOS_SIMULATOR_NAME).
# Usage: ios-01.sh <worktree> <commit> <evidence dir> <simulator name>
set -uo pipefail
WT=$1; COMMIT=$2; OUT=$3; SIM=$4; CLONE=/tmp/abtest568/ios
LOG="$OUT/IOS-01.log"; : > "$LOG"
step() { local name=$1; shift; echo "## $(date -u +%FT%TZ) $name: $*" | tee -a "$LOG"; local t0=$SECONDS; "$@" >> "$LOG" 2>&1; local rc=$?; echo "## $name exit=$rc ($((SECONDS - t0)) s)" | tee -a "$LOG"; return $rc; }
export IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=1.5.14 CURRENT_PROJECT_VERSION=1
export IOS_SIMULATOR_NAME="$SIM"
UDID=$(IOS_SIMULATOR_NAME="$SIM" "$WT/autobyteus-ios/scripts/select-ios-simulator.py" 2>/dev/null)
echo "# IOS-01: clone $CLONE (realpath $(cd /tmp && pwd -P)/abtest568/ios) at $COMMIT; $(xcodebuild -version | head -1); simulator $SIM ($UDID); load $(uptime | sed 's/.*load averages: //')" | tee -a "$LOG"
rm -rf "$CLONE"; mkdir -p /tmp/abtest568
step clone git clone --no-local --quiet "$WT" "$CLONE" || exit 1
cd "$CLONE" || exit 1
step checkout git checkout --quiet "$COMMIT" || exit 1
echo "# pwd: $(pwd) (logical), $(pwd -P) (physical)" | tee -a "$LOG"
step install pnpm install --frozen-lockfile || exit 1
step prepare-demo-web autobyteus-ios/scripts/prepare-demo-web.sh --build || exit 1
step contract-check autobyteus-ios/scripts/ios-release-contract-check.py || exit 1
step generate-project autobyteus-ios/scripts/generate-project.sh || exit 1
step core-tests xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath /tmp/abtest568/dd -only-testing:AutoByteusMobileCoreTests \
  IOS_BUNDLE_ID="$IOS_BUNDLE_ID" IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID" MARKETING_VERSION="$MARKETING_VERSION" CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION" test
step simulator-smoke autobyteus-ios/scripts/ios-simulator-smoke.sh "$OUT/IOS-01-smoke"
echo "## IOS-01 done" | tee -a "$LOG"
