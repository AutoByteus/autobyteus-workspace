#!/bin/bash
# ios-icon-compliance-594 API/E2E FS-iOS (temporary): the release workflow's build-ios steps after its Xcode 27 gate, from a
# fresh clone (TESTING.md Fresh-start build), on this Mac's Xcode 26.1.1: the frozen install, the icon check, the demo
# build, the contract check, project generation, the simulator build (Debug, as the job) and the core tests. Then the
# built app's Info.plist and compiled icon (plutil, assetutil), sips on the 18 committed PNGs, and a Release build for
# iphoneos without signing (the archive's configuration) with the same two reads.
# Usage: fs-ios.sh <worktree> <commit> <clone> <evidence dir> <simulator name>
set -uo pipefail
WT=$1; COMMIT=$2; CLONE=$3; OUT=$4; SIM=$5
LOG="$OUT/FS-iOS.log"; : > "$LOG"
step() { local name=$1; shift; echo "## $(date -u +%FT%TZ) $name: $*" | tee -a "$LOG"; local t0=$SECONDS; "$@" >> "$LOG" 2>&1; local rc=$?; echo "## $name exit=$rc ($((SECONDS - t0)) s)" | tee -a "$LOG"; return $rc; }
export IOS_BUNDLE_ID=org.autobyteus.mobile IOS_SHARE_EXTENSION_BUNDLE_ID=org.autobyteus.mobile.share MARKETING_VERSION=1.5.14 CURRENT_PROJECT_VERSION=1
UDID=$(IOS_SIMULATOR_NAME="$SIM" "$WT/autobyteus-ios/scripts/select-ios-simulator.py" 2>/dev/null)
DD="$CLONE-dd"
echo "# FS-iOS: commit $COMMIT; clone $CLONE; $(xcodebuild -version | head -1); node $(node -v); pnpm $(pnpm -v); simulator $SIM ($UDID); load $(uptime | sed 's/.*load averages: //')" | tee -a "$LOG"
rm -rf "$CLONE" "$DD"
step clone git clone --no-local --quiet "$WT" "$CLONE" || exit 1
cd "$CLONE" || exit 1
step checkout git checkout --quiet "$COMMIT" || exit 1
echo "# fresh: $(ls -d node_modules autobyteus-web/node_modules autobyteus-ios/DemoWeb 2>/dev/null | wc -l | tr -d ' ') prior install/build folders" | tee -a "$LOG"
step install pnpm install --frozen-lockfile || exit 1
step icon-check pnpm --dir autobyteus-web ios-icon:check || exit 1
step prepare-demo-web autobyteus-ios/scripts/prepare-demo-web.sh --build || exit 1
step contract-check autobyteus-ios/scripts/ios-release-contract-check.py || exit 1
step generate-project autobyteus-ios/scripts/generate-project.sh || exit 1
B=(IOS_BUNDLE_ID="$IOS_BUNDLE_ID" IOS_SHARE_EXTENSION_BUNDLE_ID="$IOS_SHARE_EXTENSION_BUNDLE_ID" MARKETING_VERSION="$MARKETING_VERSION" CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION")
step simulator-build xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$DD" "${B[@]}" build || exit 1
step core-tests xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$DD" -only-testing:AutoByteusMobileCoreTests "${B[@]}" test || exit 1
step release-device-build xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -configuration Release -sdk iphoneos -destination "generic/platform=iOS" -derivedDataPath "$DD" CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO "${B[@]}" build || exit 1
{
  echo "== asset catalog diagnostics in all builds (warning|error|notice on an .xcassets path)"
  grep -E "\.xcassets[^ ]*: (warning|error|notice):" "$LOG" | sort -u
  echo "(warnings: $(grep -cE "\.xcassets[^ ]*: warning:" "$LOG"); errors: $(grep -cE "\.xcassets[^ ]*: error:" "$LOG"))"
  echo "== sips on the 18 committed PNGs"
  for f in autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset/*.png; do
    echo "$(basename "$f"): $(sips -g pixelWidth -g pixelHeight -g hasAlpha -g space "$f" | tail -4 | awk '{print $1 $2}' | tr '\n' ' ')"
  done
  for cfg in Debug-iphonesimulator Release-iphoneos; do
    APP="$DD/Build/Products/$cfg/AutoByteus.app"
    echo "== $cfg: $APP"
    echo "-- plutil -p Info.plist (the keys that matter)"
    plutil -p "$APP/Info.plist" | grep -E "ITSAppUsesNonExemptEncryption|CFBundleIconName|CFBundleIcons|CFBundlePrimaryIcon|CFBundleIconFiles|AppIcon|CFBundleIdentifier|CFBundleShortVersionString"
    echo "-- icon files in the bundle"; ls "$APP" | grep -i appicon
    echo "-- assetutil --info Assets.car: the AppIcon renditions (name, size, opaque, encoding)"
    xcrun assetutil --info "$APP/Assets.car" > "$CLONE-assetutil-$cfg.json" 2>/dev/null
    python3 -I - "$CLONE-assetutil-$cfg.json" <<'PY'
import json, sys
items = json.load(open(sys.argv[1]))
icons = [i for i in items if isinstance(i, dict) and i.get('Name') == 'AppIcon']
print(f"AppIcon renditions: {len(icons)}")
for i in icons:
    print(f"  {i.get('AssetType')} {i.get('RenditionName')} {i.get('PixelWidth')}x{i.get('PixelHeight')} opaque={i.get('Opaque')} encoding={i.get('Encoding')} idiom={i.get('Idiom')}")
PY
  done
} >> "$LOG" 2>&1
echo "## FS-iOS done" | tee -a "$LOG"
