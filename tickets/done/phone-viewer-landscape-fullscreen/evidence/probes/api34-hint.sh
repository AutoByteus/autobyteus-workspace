#!/bin/bash
# autobyteus-432 API-10d: cause of the one Back key that did not leave full screen (API-10 step 5): Android 14's one-time
# "Viewing full screen" hint takes the first Back key. Reset the hint flag (test emulator only), enter, Back, Back.
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
hint() { echo "   hint window: $($A shell dumpsys window windows | grep -cE 'ImmersiveModeConfirmation') immersive_mode_confirmations=$($A shell settings get secure immersive_mode_confirmations | tr -d '\r')"; }
$A shell settings delete secure immersive_mode_confirmations >/dev/null; hint
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "1 full (hint reset)"; hint; $A exec-out screencap -p > $B/API-10-4-hint.png
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "2 first Back key (closes the system hint)"; hint
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "3 second Back key"; hint
