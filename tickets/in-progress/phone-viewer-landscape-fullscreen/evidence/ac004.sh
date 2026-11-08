#!/bin/bash
# autobyteus-432 AC-004: background and return while in full screen; then Android ending the app in the background.
R=/private/tmp/abx-432
export ANDROID_SERIAL=emulator-5554
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $R/state.sh"
launch() { $A shell am start -n org.autobyteus.mobile/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER >/dev/null; }
android() {
  rot=$($A shell dumpsys window displays | grep -oE 'mDisplayRotation=ROTATION_[0-9]+' | head -1)
  bars=$($A shell dumpsys window | grep -m2 -oE 'type=(statusBars|navigationBars) frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+' | tr '\n' ' ')
  echo "$1 | $rot bars: $bars"
}
node $R/cdp-touch.mjs 9432 testid mobile-node-desktop-full-screen >/dev/null
sleep 3
$S "13a full"
$A shell input keyevent 3
sleep 3
android "13b home screen (app in the background)"
launch
sleep 4
$S "13c back in the app (same task brought forward)"
$A exec-out screencap -p > $R/a-11-after-return.png
