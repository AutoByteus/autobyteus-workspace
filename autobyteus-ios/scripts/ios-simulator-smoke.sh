#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE_DIR="${1:-$ROOT_DIR/build/simulator-smoke-evidence}"
SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-iPhone 17}"
PORT="${AUTOBYTEUS_FAKE_NODE_PORT:-29876}"
FAKE_NODE_URL="http://127.0.0.1:$PORT/mobile"
IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-org.autobyteus.mobile}"
IOS_SHARE_EXTENSION_BUNDLE_ID="${IOS_SHARE_EXTENSION_BUNDLE_ID:-org.autobyteus.mobile.share}"
MARKETING_VERSION="${MARKETING_VERSION:-0.1.0}"
CURRENT_PROJECT_VERSION="${CURRENT_PROJECT_VERSION:-1}"
mkdir -p "$EVIDENCE_DIR"

if [[ ! "$MARKETING_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Simulator smoke requires MARKETING_VERSION to be MAJOR.MINOR.PATCH digits only; received '$MARKETING_VERSION'." >&2
  exit 64
fi
if [[ ! "$CURRENT_PROJECT_VERSION" =~ ^[0-9]+$ ]]; then
  echo "Simulator smoke requires CURRENT_PROJECT_VERSION to be numeric only; received '$CURRENT_PROJECT_VERSION'." >&2
  exit 64
fi

export IOS_BUNDLE_ID IOS_SHARE_EXTENSION_BUNDLE_ID MARKETING_VERSION CURRENT_PROJECT_VERSION
"$ROOT_DIR/scripts/generate-project.sh"
python3 "$ROOT_DIR/scripts/fake-mobile-server.py" --port "$PORT" >"$EVIDENCE_DIR/fake-mobile-server.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT
sleep 1

UDID="$(xcrun simctl list devices available | awk -v name="$SIMULATOR_NAME" '$0 ~ name && $0 ~ /Shutdown|Booted/ { gsub(/[()]/,"",$0); print $(NF-1); exit }')"
if [[ -z "$UDID" ]]; then
  UDID="$(xcrun simctl list devices available | awk '/iPhone/ && /Shutdown|Booted/ { gsub(/[()]/,"",$0); print $(NF-1); exit }')"
fi
if [[ -z "$UDID" ]]; then
  echo "No available iOS simulator found." >&2
  exit 1
fi
xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b

rm -rf "$EVIDENCE_DIR/AutoByteusMobile.xcresult"
xcodebuild \
  -project "$ROOT_DIR/AutoByteusMobile.xcodeproj" \
  -scheme AutoByteusMobile \
  -destination "platform=iOS Simulator,id=$UDID" \
  -resultBundlePath "$EVIDENCE_DIR/AutoByteusMobile.xcresult" \
  -only-testing:AutoByteusMobileUITests \
  IOS_BUNDLE_ID="$IOS_BUNDLE_ID" \
  IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID" \
  MARKETING_VERSION="$MARKETING_VERSION" \
  CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION" \
  AUTOBYTEUS_TEST_NODE_URL="$FAKE_NODE_URL" \
  AUTOBYTEUS_SMOKE_TESTS_REQUIRED=1 \
  test | tee "$EVIDENCE_DIR/xcodebuild-test.log"

if grep -Eq 'Test skipped|with [1-9][0-9]* tests skipped' "$EVIDENCE_DIR/xcodebuild-test.log"; then
  echo "Simulator smoke failed: UI smoke tests were skipped." >&2
  exit 2
fi
for test_name in testFakeNodeOpensAndRestoresWithFakeMobileMarker testUnreachableNodeShowsNativeDiagnosticWhenSmokeEnvironmentIsPresent; do
  if ! grep -Eq "Test Case .*${test_name}.* passed" "$EVIDENCE_DIR/xcodebuild-test.log"; then
    echo "Simulator smoke failed: expected UI test ${test_name} did not pass." >&2
    exit 3
  fi
done
if ! grep -q 'AUTOBYTEUS_FAKE_MOBILE_READY' "$EVIDENCE_DIR/fake-mobile-server.log" "$EVIDENCE_DIR/xcodebuild-test.log" 2>/dev/null; then
  # The marker assertion lives inside the result bundle screenshot/evaluation. This note keeps the
  # text log honest without requiring WebKit accessibility text to be logged by xcodebuild.
  echo "Fake mobile marker assertion executed by UI test; marker text may only appear in xcresult attachments." > "$EVIDENCE_DIR/fake-mobile-marker-note.txt"
fi

"$ROOT_DIR/scripts/ios-signing-readiness.sh" "$EVIDENCE_DIR/signing-readiness" | tee "$EVIDENCE_DIR/signing-readiness.log"
cat > "$EVIDENCE_DIR/summary.txt" <<SUMMARY
Simulator UDID: $UDID
Fake node URL: $FAKE_NODE_URL
App bundle ID: $IOS_BUNDLE_ID
Share extension bundle ID: $IOS_SHARE_EXTENSION_BUNDLE_ID
iOS marketing version: $MARKETING_VERSION
iOS build number: $CURRENT_PROJECT_VERSION
Smoke UI tests: executed and passed without skips
Expected fake marker: AUTOBYTEUS_FAKE_MOBILE_READY
Xcode result bundle: $EVIDENCE_DIR/AutoByteusMobile.xcresult
Test log: $EVIDENCE_DIR/xcodebuild-test.log
Signing readiness: $EVIDENCE_DIR/signing-readiness/ios-signing-readiness.txt
SUMMARY
cat "$EVIDENCE_DIR/summary.txt"
