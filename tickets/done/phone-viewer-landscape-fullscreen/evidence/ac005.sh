#!/bin/bash
# autobyteus-432 AC-005: Keyboard and Clipboard in Control with desktop full screen.
R=/private/tmp/abx-432
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $R/state.sh"
E="node $R/cdp-eval.mjs 9432"
ime() { $A shell dumpsys input_method | grep -m1 -oE 'mInputShown=[a-z]+'; }
devtap() {
  XY=$($E "(r=>Math.round((r.x+r.width/2)*devicePixelRatio)+' '+Math.round((r.y+r.height/2)*devicePixelRatio+136))(document.querySelector('[data-testid=$1]').getBoundingClientRect())" | tr -d '"')
  $A shell input tap $XY
}
devtap mobile-node-desktop-mode
sleep 4
$S "15a Control (portrait)"
devtap mobile-node-desktop-keyboard
sleep 2
echo "15b Keyboard tapped: $(ime) focus=$($E 'document.activeElement?.dataset?.testid ?? null')"
devtap mobile-node-desktop-full-screen
sleep 4
$S "15c full screen tapped with the keyboard open"
echo "15d $(ime) focus=$($E 'document.activeElement?.dataset?.testid ?? null') keyboard button=$($E '!!document.querySelector("[data-testid=mobile-node-desktop-keyboard]")') clipboard button=$($E '!!document.querySelector("[data-testid=mobile-node-desktop-clipboard-open]")')"
$A exec-out screencap -p > $R/a-13-control-full.png
