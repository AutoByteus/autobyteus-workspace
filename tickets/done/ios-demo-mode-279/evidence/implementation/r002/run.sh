#!/bin/bash
# R-002 premise check (autobyteus-279): builds the check page and the harness app, runs it on a simulator of its own
# (created here, deleted at the end) and prints the reports.
# Usage: run.sh <autobyteus-web dir> <work dir> [device type, default "iPhone 17 Pro Max"]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WEB="$(cd "$1" && pwd)"
WORK="$2"
DEVICE_TYPE="${3:-iPhone 17 Pro Max}"
rm -rf "$WORK" && mkdir -p "$WORK"
(cd "$WEB" && node "$HERE/build.mjs" . "$WORK/web")
cp -R "$HERE/ios" "$WORK/ios"
cp -R "$WORK/web" "$WORK/ios/Web"
(cd "$WORK/ios" && xcodegen generate --quiet)
DEVICE="$(xcrun simctl create "r002-279-$(date +%s)" "$DEVICE_TYPE")"
cleanup() { xcrun simctl shutdown "$DEVICE" >/dev/null 2>&1 || true; xcrun simctl delete "$DEVICE" >/dev/null 2>&1 || true; }
trap cleanup EXIT
xcodebuild -quiet -project "$WORK/ios/R002Harness.xcodeproj" -scheme R002Harness -sdk iphonesimulator \
  -destination "id=$DEVICE" -derivedDataPath "$WORK/dd" CODE_SIGNING_ALLOWED=NO build
APP="$(find "$WORK/dd/Build/Products" -name 'R002Harness.app' -maxdepth 3 | head -1)"
xcrun simctl boot "$DEVICE"
xcrun simctl bootstatus "$DEVICE" -b >/dev/null
xcrun simctl install "$DEVICE" "$APP"
xcrun simctl launch --console-pty --terminate-running-process "$DEVICE" org.autobyteus.r002harness > "$WORK/console.log" 2>&1 &
LAUNCH=$!
# The app's files, found in the simulator's own data folder (simctl calls can hang on a loaded machine).
DATA="$HOME/Library/Developer/CoreSimulator/Devices/$DEVICE/data/Containers/Data/Application"
for _ in $(seq 1 900); do
  PROGRESS="$(find "$DATA" -name r002-progress.txt 2>/dev/null | head -1)"
  [ -n "$PROGRESS" ] && grep -q "done" "$PROGRESS" && break
  sleep 1
done
kill "$LAUNCH" >/dev/null 2>&1 || true
DOCS="$(dirname "${PROGRESS:-/nonexistent/x}")"
cp "$DOCS/r002.json" "$WORK/r002.json" 2>/dev/null || true
cp "$DOCS/r002-served.txt" "$WORK/r002-served.txt" 2>/dev/null || true
cp "$DOCS/r002-progress.txt" "$WORK/r002-progress.txt" 2>/dev/null || true
echo "device type: $DEVICE_TYPE"
echo "progress:"; cat "$WORK/r002-progress.txt" 2>/dev/null || echo "(none)"
echo "reports:"; cat "$WORK/r002.json" 2>/dev/null || echo "(none)"
