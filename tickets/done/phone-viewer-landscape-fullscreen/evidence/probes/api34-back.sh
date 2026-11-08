#!/bin/bash
# autobyteus-432 API-10b: Back key in full screen on API 34, repeated with logcat (no uiautomator in landscape).
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
$S "0 start"
for n in 1 2 3; do
  $A logcat -c
  $B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep ${1:-4}; $S "$n.a full screen"
  $A shell input keyevent KEYCODE_BACK; sleep 3; $S "$n.b after one Back key"
  echo "   logcat: $($A logcat -d | grep -iE 'OnBackInvoked|BackNavigation|onBackPressed|KEYCODE_BACK|desktopFullScreen|wm_set_requested' | tail -5 | tr '\n' '|')"
  if $EV 'location.search.includes("full=1")' | grep -q true; then
    $A shell input keyevent KEYCODE_BACK; sleep 3; $S "$n.c after a second Back key"
    $EV 'location.search.includes("full=1")' | grep -q true && node $B/probes/cdp-touch.mjs 9432 testid mobile-node-desktop-handle >/dev/null && sleep 3 && $S "$n.d handle (cleanup)"
  fi
done
