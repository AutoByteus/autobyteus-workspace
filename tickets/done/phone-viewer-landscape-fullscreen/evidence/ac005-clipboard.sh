#!/bin/bash
# autobyteus-432 AC-005 part 2: Clipboard from the full-screen strip, in landscape (test text only).
export ANDROID_SERIAL=emulator-5554
R=/private/tmp/abx-432
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $R/state.sh"
E="node $R/cdp-eval.mjs 9432"
D="docker exec --user vncuser --env DISPLAY=:99 abx432-phone-node"
devtap() {
  XY=$($E "(r=>Math.round((r.x+r.width/2)*devicePixelRatio+$2)+' '+Math.round((r.y+r.height/2)*devicePixelRatio+$3))(document.querySelector('[data-testid=$1]').getBoundingClientRect())" | tr -d '"')
  $A shell input tap $XY
}
$A shell input keyevent 4
sleep 2
$S "17a Back with the keyboard open: the keyboard closes, full screen stays"
echo "17b $($A shell dumpsys input_method | grep -m1 -oE 'mInputShown=[a-z]+')"
# Copy from the desktop: text copied on the node is shown in the sheet.
printf 'abx432 copied on the node' | $D xclip -selection clipboard
sleep 2
devtap mobile-node-desktop-strip-clipboard 136 0
sleep 2
echo "17c sheet open: $($E '!!document.querySelector("[data-testid=mobile-node-desktop-clipboard]")') remote text: $($E 'document.querySelector("[data-testid=mobile-node-desktop-clipboard-remote-text]")?.textContent?.trim() ?? null')"
$A exec-out screencap -p > $R/a-15-full-clipboard.png
# Paste to the desktop: text typed in the sheet lands on the node's clipboard.
devtap mobile-node-desktop-clipboard-paste-input 136 0
sleep 1
$A shell input text 'abx432-sent-from-the-phone'
sleep 1
$A shell input keyevent 4
sleep 1
devtap mobile-node-desktop-clipboard-send 136 0
sleep 2
echo "17d node clipboard: $($D xclip -o -selection clipboard)"
$S "17e after Send to desktop"
