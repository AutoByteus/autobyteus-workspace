#!/bin/bash
# autobyteus-432 API-10e: with the hint shown, a real tap on the handle's spot, then a real tap on "Got it", then Back; then
# again full screen -> real tap on the handle (tapl, no uiautomator). Only real input through the system (adb input).
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
hint() { echo "   focus: $($A shell dumpsys window | grep -m1 -oE 'mCurrentFocus=Window\{[^ ]+ u0 [^}]+' | sed 's/.* u0 //'); immersive_mode_confirmations=$($A shell settings get secure immersive_mode_confirmations | tr -d '\r')"; }
hint
$B/probes/tapl.sh mobile-node-desktop-handle; sleep 3; $S "1 real tap on the handle's spot while the hint shows"; hint
$A shell input tap 1542 528; sleep 2; $S "2 real tap on Got it"; hint
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "3 Back key"; hint
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "4 full (hint confirmed: none shown)"; hint
$B/probes/tapl.sh mobile-node-desktop-handle; sleep 3; $S "5 real tap on the handle"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "6 full"
$A shell input swipe 2 540 500 540 250; sleep 1.5; $S "7 one back-gesture swipe (shows the bars)"
$A shell input swipe 2 540 500 540 250; sleep 3; $S "8 second back-gesture swipe"
