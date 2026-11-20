#!/bin/bash
# ios-demo-mode-279 API/E2E round 2 (temporary): API-04a. A clean install of the shipped app (8430d9ef12, built for testing
# into ~/.cache/abtest279/dd-base with ApiE2E279ShippedAppUITests) on my iPhone simulator pairs with the node by a fresh
# link (made just before, never logged), then its saved entry's name and address are decoded from the app group.
# Usage: run-base.sh <evidence dir> <case id>
set -uo pipefail
OUT=$1; ID=$2
B=$HOME/.cache/abtest279/base/autobyteus-ios
UDID=$(grep -o "iphone=[^ ]*" /tmp/abtest279-sims.txt | cut -d= -f2)
xcrun simctl boot "$UDID" 2>/dev/null
xcrun simctl uninstall "$UDID" org.autobyteus.mobile
tag=base-$(date +%s); touch /tmp/abtest279/node/pair-$tag
until [ -f /tmp/abtest279/node/link-$tag.txt ]; do sleep 0.3; done
export TEST_RUNNER_API279_LINK="$(cat /tmp/abtest279/node/link-$tag.txt)"
RES=$HOME/.cache/abtest279/$ID.xcresult; rm -rf "$RES"
echo "# $ID: the shipped app (base 8430d9ef12, MARKETING_VERSION 1.3.82), a clean install on apie2e279-iphone ($UDID); $(date -u +%FT%TZ); load $(uptime | sed 's/.*load averages: //')" > "$OUT/$ID.log"
xcodebuild -project "$B/AutoByteusMobile.xcodeproj" -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath "$HOME/.cache/abtest279/dd-base" -resultBundlePath "$RES" -only-testing:AutoByteusMobileUITests/ApiE2E279ShippedAppUITests \
  IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=1.3.82 CURRENT_PROJECT_VERSION=1 \
  test-without-building 2>&1 | sed -E 's#(pairing=)[^&" ]+#\1…#g' | grep -E "Test Case|error:|Executed|\*\* TEST" >> "$OUT/$ID.log"
echo "# exit: ${PIPESTATUS[0]}" >> "$OUT/$ID.log"
mkdir -p "$OUT/$ID-shots"; xcrun xcresulttool export attachments --path "$RES" --output-path "$OUT/$ID-shots" >/dev/null 2>&1
for f in "$OUT/$ID-shots"/*.png; do [ -f "$f" ] && mv "$f" "$OUT/$ID-shots/shipped-app-paired.png"; done; rm -f "$OUT/$ID-shots/manifest.json"; rm -rf "$RES"
G=$(xcrun simctl get_app_container "$UDID" org.autobyteus.mobile groups | awk '/group.org.autobyteus.mobile/{print $2}')
python3 -I -c "
import plistlib, json, sys
d = plistlib.load(open(sys.argv[1], 'rb')); e = json.loads(d['autobyteus.saved-node-entries'])
print('saved entries:', [{k: v for k, v in x.items() if k in ('displayName', 'baseURL')} for x in e])" "$G/Library/Preferences/group.org.autobyteus.mobile.plist" >> "$OUT/$ID.log"
tail -3 "$OUT/$ID.log"
