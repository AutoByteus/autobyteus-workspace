#!/usr/bin/env bash
# API/E2E local UI-test run. Usage: local-run.sh <app-root> <delay|none> <label> [only-testing...]
# The fake server always comes from the fix worktree (it owns --status-delay-seconds).
set -uo pipefail
ROOT="$1"; DELAY="$2"; LABEL="$3"; shift 3
SERVER=/Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/autobyteus-ios/scripts/fake-mobile-server.py
OUT=/Users/normy/autobyteus_org/autobyteus-worktrees/ios-release-ui-test-flakiness/tickets/in-progress/ios-release-ui-test-flakiness/api-e2e-evidence/local/$LABEL
rm -rf "$OUT"; mkdir -p "$OUT"
export IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1
(cd "$ROOT" && ./scripts/generate-project.sh) > "$OUT/generate.log" 2>&1
SP=""
if [ "$DELAY" != "none" ]; then
  python3 "$SERVER" --port 29876 --status-delay-seconds "$DELAY" > "$OUT/fake-mobile-server.log" 2>&1 & SP=$!
  sleep 1
fi
trap '[ -n "$SP" ] && kill $SP 2>/dev/null' EXIT
UDID=AED15013-49CB-4DEE-9FCA-5A94B0E5650B
xcrun simctl boot $UDID >/dev/null 2>&1 || true; xcrun simctl bootstatus $UDID -b > /dev/null
ONLY=(); for t in "${@:-AutoByteusMobileUITests}"; do ONLY+=("-only-testing:$t"); done
start=$(date +%s)
xcodebuild -project "$ROOT/AutoByteusMobile.xcodeproj" -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath "$OUT/result.xcresult" "${ONLY[@]}" \
  IOS_BUNDLE_ID=$IOS_BUNDLE_ID IOS_SHARE_EXTENSION_BUNDLE_ID=$IOS_SHARE_EXTENSION_BUNDLE_ID MARKETING_VERSION=$MARKETING_VERSION CURRENT_PROJECT_VERSION=$CURRENT_PROJECT_VERSION \
  AUTOBYTEUS_TEST_NODE_URL="http://127.0.0.1:29876/mobile" AUTOBYTEUS_SMOKE_TESTS_REQUIRED=1 test > "$OUT/xcodebuild-test.log" 2>&1
echo "exit=$? wall=$(( $(date +%s) - start ))s" >> "$OUT/xcodebuild-test.log"
echo "== $LABEL"; grep -E "Test Case .*(passed|failed)|error: |TEST (SUCCEEDED|FAILED)|^exit=" "$OUT/xcodebuild-test.log" | cut -c1-240
