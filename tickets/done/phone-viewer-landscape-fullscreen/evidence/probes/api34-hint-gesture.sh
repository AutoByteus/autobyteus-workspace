#!/bin/bash
# autobyteus-432 API-10g: with the one-time hint showing (flag reset), does the back gesture still leave full screen?
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
hint() { echo "   focus: $($A shell dumpsys window | grep -m1 -oE 'mCurrentFocus=Window\{[^ ]+ u0 [^}]+' | sed 's/.* u0 //'); immersive_mode_confirmations=$($A shell settings get secure immersive_mode_confirmations | tr -d '\r')"; }
$A shell settings delete secure immersive_mode_confirmations >/dev/null
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "1 full (hint showing)"; hint
$A shell input swipe 2 540 500 540 250; sleep 1.5; $S "2 one back-gesture swipe"; hint
$A shell input swipe 2 540 500 540 250; sleep 3; $S "3 second back-gesture swipe"; hint
