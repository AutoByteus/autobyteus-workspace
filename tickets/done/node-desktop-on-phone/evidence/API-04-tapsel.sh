#!/bin/bash
# autobyteus-407 API/E2E: real tap (adb input tap) on the centre of a page element, from its CSS rect.
# The WebView sits below the status bar: device px = (css * dpr, webviewTop + css * dpr).
# Usage: tapsel.sh <css selector> [dx dy]   (optional CSS-px offset from the element's top-left instead of centre)
B=/private/tmp/abx407-api
A=~/Library/Android/sdk/platform-tools/adb
R=$(node $B/probes/cdp407.mjs 9407 rect "$1")
[ "$R" = "null" ] && { echo "not found: $1"; exit 1; }
DPR=$(node $B/probes/cdp407.mjs 9407 eval "devicePixelRatio")
TOP=$($A shell uiautomator dump /sdcard/w.xml >/dev/null 2>&1; $A shell cat /sdcard/w.xml 2>/dev/null | grep -o 'class="android.webkit.WebView"[^>]*bounds="\[[0-9]*,[0-9]*\]' | head -1 | grep -o '\[[0-9]*,[0-9]*\]' | tr -d '[]' )
TOPX=${TOP%,*}; TOPY=${TOP#*,}; [ -z "$TOPY" ] && { TOPX=0; TOPY=136; }
XY=$(python3 -c "import json,sys; r=json.loads('$R'); d=float('$DPR'); dx=sys.argv[1]; dy=sys.argv[2]; x=r['x']+(float(dx) if dx else r['w']/2); y=r['y']+(float(dy) if dy else r['h']/2); print(int($TOPX+x*d), int($TOPY+y*d))" "$2" "$3")
$A shell input tap $XY
echo "tapped $1 at device $XY"
