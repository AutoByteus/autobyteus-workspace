#!/usr/bin/env bash
# TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
# Makes a run-owned test copy of a built AutoByteus.app that can go through a REAL Squirrel.Mac install safely:
#  - its own bundle id (com.autobyteus.app.an356): ShipIt's launchd job and caches are the copy's own, never the
#    installed app's (com.autobyteus.app.ShipIt);
#  - its own electron-updater cache (updaterCacheDirName: autobyteus-updater-an356);
#  - Info.plist LSEnvironment pinning the isolated e2e profile (data root, server port, test feed). ShipIt relaunches
#    through NSWorkspace/LaunchServices, which applies LSEnvironment, so the relaunched app stays isolated. An invalid
#    e2e configuration makes the app exit; it never falls back to the production profile (~/.autobyteus);
#  - an ad hoc signature with the explicit designated requirement `identifier "com.autobyteus.app.an356"`, so a V2
#    prepared the same way satisfies V1's requirement (Squirrel verifies the update against it).
# App code, app.asar, the server and the Electron binary are unchanged. Asserts everything at the end.
# Usage: API-356-prepare-copy.sh <built.app> <dest.app> <data root> <server port> <feed url>
set -euo pipefail
SRC="$1"; DEST="$2"; DATA="$3"; PORT="$4"; FEED="$5"
ID=com.autobyteus.app.an356
case "$DATA" in "$HOME/.autobyteus"*|"") echo "refusing data root $DATA" >&2; exit 2;; esac
rm -rf "$DEST"; ditto "$SRC" "$DEST"
PL="$DEST/Contents/Info.plist"
plutil -replace CFBundleIdentifier -string "$ID" "$PL"
plutil -replace LSEnvironment -json "{\"MallocNanoZone\":\"0\",\"AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE\":\"e2e\",\"AUTOBYTEUS_ELECTRON_DATA_ROOT\":\"$DATA\",\"AUTOBYTEUS_ELECTRON_SERVER_PORT\":\"$PORT\",\"AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL\":\"$FEED\"}" "$PL"
sed -i '' 's/^updaterCacheDirName: .*/updaterCacheDirName: autobyteus-updater-an356/' "$DEST/Contents/Resources/app-update.yml"
codesign --force --deep -s - "$DEST" 2>/dev/null
codesign --force -s - -i "$ID" -r="designated => identifier \"$ID\"" "$DEST" 2>/dev/null
# Assertions
codesign -v "$DEST"
[ "$(codesign -d -r- "$DEST" 2>&1 | sed -n 's/^designated => //p')" = "identifier \"$ID\"" ]
[ "$(plutil -extract CFBundleIdentifier raw "$PL")" = "$ID" ]
[ "$(plutil -extract LSEnvironment.AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE raw "$PL")" = e2e ]
[ "$(plutil -extract LSEnvironment.AUTOBYTEUS_ELECTRON_DATA_ROOT raw "$PL")" = "$DATA" ]
grep -q '^updaterCacheDirName: autobyteus-updater-an356$' "$DEST/Contents/Resources/app-update.yml"
echo "prepared $DEST version=$(plutil -extract CFBundleShortVersionString raw "$PL") id=$ID dr=identifier-$ID data=$DATA port=$PORT feed=$FEED stamp=$(tr -d ' \n' < "$DEST/Contents/Resources/server/dist/release-identity.json")"
