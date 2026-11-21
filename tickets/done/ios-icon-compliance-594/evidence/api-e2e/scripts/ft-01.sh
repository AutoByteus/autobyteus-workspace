#!/bin/bash
# ios-icon-compliance-594 API/E2E FT-01 (temporary): faults in the FS-iOS clone only, one at a time, each restored with
# `git checkout` before the next. After each: `pnpm --dir autobyteus-web ios-icon:check` (failing lines and exit) and, where
# it applies, `autobyteus-ios/scripts/ios-release-contract-check.py`. Pixel edits use the clone's own sharp.
# Usage: ft-01.sh <clone> <evidence file>
set -uo pipefail
CLONE=$1; LOG=$2; cd "$CLONE" || exit 1
SET=autobyteus-ios/AutoByteusMobile/Assets.xcassets/AppIcon.appiconset
SVG=autobyteus-web/public/autobyteus-icon.svg
PLIST=autobyteus-ios/AutoByteusMobile/Info.plist
SHARP="$CLONE/autobyteus-web/node_modules/sharp/lib/index.js"
echo "# FT-01: faults in $CLONE ($(git rev-parse --short HEAD)), each restored after; $(date -u +%FT%TZ)" > "$LOG"
icon_check() { local out; out=$(pnpm --dir autobyteus-web ios-icon:check 2>&1); local rc=$?; echo "ios-icon:check exit=$rc"; echo "$out" | grep -E "^\[ios-icon\] .*(missing|not |alpha|differ|do not match|all 18)" ; }
contract() { local out; out=$(autobyteus-ios/scripts/ios-release-contract-check.py 2>&1); local rc=$?; echo "contract check exit=$rc: $(echo "$out" | tail -1)"; }
restore() { git checkout --quiet -- "$SET" "$SVG" "$PLIST"; echo "restored: git status $(git status --short | wc -l | tr -d ' ') changes"; }
node_edit() { node --input-type=module -e "import sharp from '$SHARP'; $1"; }
{
echo "== baseline"; icon_check; contract
echo "== (a) one pixel of AppIcon-1024.png set to red (#FF0000) at (512, 300)"
node_edit "const f='$SET/AppIcon-1024.png'; const b=await sharp(f).composite([{input:{create:{width:1,height:1,channels:3,background:'#FF0000'}},left:512,top:300}]).png().toBuffer(); (await import('node:fs')).writeFileSync(f,b);"
icon_check; contract; restore
echo "== (b) AppIcon-iphone-60x60@3x.png deleted"
rm "$SET/AppIcon-iphone-60x60@3x.png"; icon_check; contract; restore
echo "== (c) AppIcon-ipad-40x40@2x.png re-saved with an alpha channel (pixels unchanged)"
node_edit "const f='$SET/AppIcon-ipad-40x40@2x.png'; const b=await sharp(f).ensureAlpha().png().toBuffer(); (await import('node:fs')).writeFileSync(f,b);"
echo "sips: $(sips -g hasAlpha "$SET/AppIcon-ipad-40x40@2x.png" | tail -1)"; icon_check; contract; restore
echo "== (c2) AppIcon-1024.png at the wrong size (1000x1000)"
node_edit "const f='$SET/AppIcon-1024.png'; const b=await sharp(f).resize(1000,1000).png().toBuffer(); (await import('node:fs')).writeFileSync(f,b);"
icon_check; contract; restore
echo "== (d) the SVG's mark recolored #34D399 → #F59E0B, PNGs not regenerated"
sed -i '' 's/fill="#34D399"/fill="#F59E0B"/' "$SVG"; grep -o 'fill="#[0-9A-Fa-f]*"' "$SVG" | tr '\n' ' '; echo
icon_check
echo "== (d) then ios-icon:build (the README's recovery), then the check"
pnpm --dir autobyteus-web ios-icon:build 2>&1 | tail -2
icon_check; echo "regenerated PNGs differ from the committed ones: $(git status --short "$SET" | wc -l | tr -d ' ') files"; restore
echo "== (e) ITSAppUsesNonExemptEncryption removed from Info.plist"
/usr/libexec/PlistBuddy -c "Delete :ITSAppUsesNonExemptEncryption" "$PLIST"; contract; restore
echo "== (e2) ITSAppUsesNonExemptEncryption set to true"
/usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption true" "$PLIST"; contract; restore
echo "== after all faults"; icon_check; contract
} >> "$LOG" 2>&1
cat "$LOG"
