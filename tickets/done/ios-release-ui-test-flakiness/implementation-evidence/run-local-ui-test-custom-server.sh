#!/usr/bin/env bash
# Local UI-test run against the repo fake server with an optional status delay.
# Usage: run.sh <delay-seconds> <label> [only-testing...]
set -uo pipefail
DELAY="$1"; LABEL="$2"; shift 2
ROOT=/Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/autobyteus-ios
OUT=/tmp/ios-fix/$LABEL; rm -rf "$OUT"; mkdir -p "$OUT"
export IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1
"$ROOT/scripts/generate-project.sh" > "$OUT/generate.log" 2>&1
python3 "${FAKE_SERVER:-$ROOT/scripts/fake-mobile-server.py}" --port 29876 --status-delay-seconds "$DELAY" > "$OUT/fake-mobile-server.log" 2>&1 &
SP=$!; trap 'kill $SP 2>/dev/null' EXIT; sleep 1
UDID=AED15013-49CB-4DEE-9FCA-5A94B0E5650B
xcrun simctl boot $UDID >/dev/null 2>&1 || true; xcrun simctl bootstatus $UDID -b > /dev/null
ONLY=()
for t in "${@:-AutoByteusMobileUITests}"; do ONLY+=("-only-testing:$t"); done
xcodebuild -project "$ROOT/AutoByteusMobile.xcodeproj" -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath "$OUT/result.xcresult" "${ONLY[@]}" \
  IOS_BUNDLE_ID=$IOS_BUNDLE_ID IOS_SHARE_EXTENSION_BUNDLE_ID=$IOS_SHARE_EXTENSION_BUNDLE_ID MARKETING_VERSION=$MARKETING_VERSION CURRENT_PROJECT_VERSION=$CURRENT_PROJECT_VERSION \
  AUTOBYTEUS_TEST_NODE_URL="http://127.0.0.1:29876/mobile" AUTOBYTEUS_SMOKE_TESTS_REQUIRED=1 test > "$OUT/xcodebuild-test.log" 2>&1
echo "exit=$?" >> "$OUT/xcodebuild-test.log"
grep -E "Test Case .*(passed|failed)|error:|TEST (SUCCEEDED|FAILED)|^exit=" "$OUT/xcodebuild-test.log"
