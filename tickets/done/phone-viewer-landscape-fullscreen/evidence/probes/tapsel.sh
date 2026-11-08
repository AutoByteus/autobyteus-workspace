#!/bin/bash
# autobyteus-432 API/E2E: real tap (adb input tap, ANDROID_SERIAL) at the centre of a page element (by data-testid),
# from its CSS rect: device px = webview origin + css * devicePixelRatio (webview bounds from uiautomator).
# Usage: tapsel.sh <data-testid> [dx dy]  (optional CSS-px offset from the element's top-left)
B=/private/tmp/abx432-api
A=~/Library/Android/sdk/platform-tools/adb
R=$(node $B/probes/cdp-eval.mjs 9432 "JSON.stringify((r=>r?{x:r.x,y:r.y,w:r.width,h:r.height,d:devicePixelRatio}:null)(document.querySelector('[data-testid=$1]')?.getBoundingClientRect()))" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()))')
[ "$R" = "None" ] && { echo "not found: $1"; exit 1; }
$A shell uiautomator dump /sdcard/w.xml >/dev/null 2>&1
ORIGIN=$($A shell cat /sdcard/w.xml 2>/dev/null | grep -o 'class="android.webkit.WebView"[^>]*bounds="\[[0-9]*,[0-9]*\]' | head -1 | grep -o '\[[0-9]*,[0-9]*\]' | tr -d '[]')
XY=$(python3 -c "
import json,sys
r=json.loads(sys.argv[1].replace(\"'\",'\"')); o=(sys.argv[2] or '0,0').split(',')
dx=sys.argv[3]; dy=sys.argv[4]
x=r['x']+(float(dx) if dx else r['w']/2); y=r['y']+(float(dy) if dy else r['h']/2)
print(int(int(o[0])+x*r['d']), int(int(o[1])+y*r['d']))" "$R" "$ORIGIN" "$2" "$3")
$A shell input tap $XY
echo "tapped $1 at device $XY (webview origin $ORIGIN)"
