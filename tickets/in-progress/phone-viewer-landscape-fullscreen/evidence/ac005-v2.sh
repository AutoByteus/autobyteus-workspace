#!/bin/bash
# autobyteus-432 AC-005 (SR-003): Control full screen; Keyboard and Clipboard from the strip, in landscape.
# Part 1: Control, full screen, focus a key-logging window on the node desktop through the viewer.
export ANDROID_SERIAL=emulator-5554
R=/private/tmp/abx-432
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $R/state.sh"
E="node $R/cdp-eval.mjs 9432"
D="docker exec --user vncuser --env DISPLAY=:99 abx432-phone-node"
devtap() { # device tap at the centre of a test id; $2/$3 = the page's left/top offset on the screen (device px)
  XY=$($E "(r=>Math.round((r.x+r.width/2)*devicePixelRatio+$2)+' '+Math.round((r.y+r.height/2)*devicePixelRatio+$3))(document.querySelector('[data-testid=$1]').getBoundingClientRect())" | tr -d '"')
  $A shell input tap $XY
}
docker exec abx432-phone-node pkill xev
docker exec -d --user vncuser --env DISPLAY=:99 abx432-phone-node sh -c 'xev -event keyboard -geometry 900x600+500+250 > /tmp/xev-ac005.log 2>&1'
sleep 2
devtap mobile-node-desktop-mode 0 136
sleep 4
devtap mobile-node-desktop-full-screen 0 136
sleep 4
$S "16a Control full screen"
echo "16b strip: $($E 'JSON.stringify([...document.querySelectorAll("[data-testid=mobile-node-desktop-full-screen-strip] button")].map(b=>b.textContent.trim()))')"
# A Control tap at the node point (950, 550): inside the xev window. Landscape: the page starts 136 px from the left.
XY=$($E "(r=>Math.round((r.x+950/1920*r.width)*devicePixelRatio+136)+' '+Math.round((r.y+550/1080*r.height)*devicePixelRatio))(document.querySelector('[data-testid=mobile-node-desktop-stage] canvas').getBoundingClientRect())" | tr -d '"')
$A shell input tap $XY
sleep 1
echo "16c node pointer $($D xdotool getmouselocation) focus $($D xdotool getwindowfocus) xev $($D sh -c 'xdotool search --name "Event Tester" | head -1')"
devtap mobile-node-desktop-strip-keyboard 136 0
sleep 2
echo "16d after strip Keyboard: $($A shell dumpsys input_method | grep -m1 -oE 'mInputShown=[a-z]+') focus=$($E 'document.activeElement?.dataset?.testid ?? null')"
$S "16e keyboard open in full screen"
$A exec-out screencap -p > $R/a-14-full-keyboard.png
