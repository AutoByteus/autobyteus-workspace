#!/bin/bash
# autobyteus-432 API-10f: the core of AC-001/AC-002 on API 34 with auto-rotate OFF (the AVD booted with it on).
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
$A shell settings put system accelerometer_rotation 0; $A shell settings put system user_rotation 0; sleep 2
echo "auto-rotate=$($A shell settings get system accelerometer_rotation | tr -d '\r') user_rotation=$($A shell settings get system user_rotation | tr -d '\r')"
$S "0 viewer, portrait"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "1 full"; $A exec-out screencap -p > $B/API-10-6-full-rotation-off.png
$B/probes/tapl.sh mobile-node-desktop-handle >/dev/null; sleep 3; $S "2 real tap on the handle"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "3 full"
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "4 Back key"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "5 full"
$A shell input swipe 2 540 500 540 250; sleep 1.5; $A shell input swipe 2 540 500 540 250; sleep 3; $S "6 two back-gesture swipes"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "7 full"
$A shell input tap 1200 700; sleep 3; $S "8 one real tap on the picture (View only)"
echo "end: auto-rotate=$($A shell settings get system accelerometer_rotation | tr -d '\r') user_rotation=$($A shell settings get system user_rotation | tr -d '\r')"
