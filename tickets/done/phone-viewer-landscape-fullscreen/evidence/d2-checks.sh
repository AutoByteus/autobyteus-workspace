#!/bin/bash
# autobyteus-432 AC-002 / D-2: the app resets desktop full screen when it shows another screen, when the page reloads,
# and the page gives it back when the viewer goes while full=1.
R=/private/tmp/abx-432
export ANDROID_SERIAL=emulator-5554
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $R/state.sh"
E="node $R/cdp-eval.mjs 9432"
full() { node $R/cdp-touch.mjs 9432 testid mobile-node-desktop-full-screen >/dev/null; sleep 3; }
android() {
  rot=$($A shell dumpsys window displays | grep -oE 'mDisplayRotation=ROTATION_[0-9]+' | head -1)
  bars=$($A shell dumpsys window | grep -m2 -oE 'type=(statusBars|navigationBars) frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+' | tr '\n' ' ')
  echo "$1 | $rot bars: $bars"
}

full
$S "10a full"
$E 'window.AutoByteusShell.postMessage(JSON.stringify({type:"showNodeList"})), "sent"' >/dev/null
sleep 3
android "10b app node list shown from the full-screen page"
$A exec-out screencap -p > $R/a-10-node-list.png
$A shell input keyevent 4
sleep 3
$S "10c Back to the page (route still full=1, the app reset)"

# Back to a normal state: leave full screen in the page.
$E 'history.back(), "back"' >/dev/null
sleep 2
full
$S "11a full"
$E 'location.reload(), "reload"' >/dev/null
sleep 8
$S "11b after a page reload with full=1 (page start resets; the reopened page asks again)"

$E 'history.go(-2), "go -2"' >/dev/null
sleep 3
$S "12 after the viewer route goes while full=1 (history.go(-2))"
