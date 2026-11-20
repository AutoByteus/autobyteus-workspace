#!/bin/bash
# ios-demo-mode-279 API/E2E (temporary): runs one temporary UI test on my own simulator. The test file is copied into a clone's
# `AutoByteusMobileUITests/` (never the worktree), the project regenerated, then `xcodebuild test -only-testing:<test>`.
# Values the test needs come from TEST_RUNNER_API279_* in the environment (xcodebuild passes them to the test runner without
# the prefix); they are never written to the log.
# Usage: run-ui.sh <ios dir of the clone> <test file> <Class/testName> <simulator name> <evidence dir> <case id>
set -uo pipefail
IOS=$1; FILE=$2; TEST=$3; SIM=$4; OUT=$5; ID=$6
UDID="$(xcrun simctl list devices available | awk -v name="$SIM" '$0 ~ name && $0 ~ /Shutdown|Booted/ { gsub(/[()]/,"",$0); print $(NF-1); exit }')"
cp "$FILE" "$IOS/AutoByteusMobileUITests/"
( cd "$IOS" && IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share xcodegen generate --spec project.yml >/dev/null )
LOG="$OUT/$ID.log"; RES="$OUT/$ID.xcresult"; rm -rf "$RES"
{ echo "# $ID: $TEST on $SIM ($UDID); $(date -u +%FT%TZ); load $(uptime | sed 's/.*load averages: //')"; echo "# test file: $(basename "$FILE"), copied into $IOS/AutoByteusMobileUITests (temporary)"; } > "$LOG"
xcodebuild -project "$IOS/AutoByteusMobile.xcodeproj" -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath "$RES" -only-testing:"AutoByteusMobileUITests/$TEST" \
  IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=1.3.83 CURRENT_PROJECT_VERSION=2 test 2>&1 \
  | sed -E 's#(pairing=)[^&" ]+#\1…#g' | grep -E "Test Case|error:|XCTAssert|Executed|\*\* TEST|API279|failed|passed" >> "$LOG"
echo "# exit: ${PIPESTATUS[0]}" >> "$LOG"
tail -4 "$LOG"
