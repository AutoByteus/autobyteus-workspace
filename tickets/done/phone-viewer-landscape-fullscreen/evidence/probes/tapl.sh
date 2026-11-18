#!/bin/bash
# autobyteus-432 API/E2E: real tap (adb input tap) on a page element while in landscape full screen, where the WebView
# covers the whole screen (origin 0,0; checked: viewport 915x412 CSS px x 2.625 = 2400x1080). No uiautomator (it would
# lock the phone's rotation). Usage: tapl.sh <data-testid>
B=/private/tmp/abx432-api
A=~/Library/Android/sdk/platform-tools/adb
XY=$(node $B/probes/cdp-eval.mjs 9432 "(r=>r&&r.width?Math.round((r.x+r.width/2)*devicePixelRatio)+' '+Math.round((r.y+r.height/2)*devicePixelRatio):'none')(document.querySelector('[data-testid=$1]')?.getBoundingClientRect())" | tr -d '"')
[ "$XY" = "none" ] && { echo "not found or hidden: $1"; exit 1; }
$A shell input tap $XY; echo "tapped $1 at device $XY"
