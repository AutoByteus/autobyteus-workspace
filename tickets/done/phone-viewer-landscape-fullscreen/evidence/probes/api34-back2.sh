#!/bin/bash
# autobyteus-432 API-10c: the API-10 order: full -> handle -> full -> Back (x3), with input-method and focus state.
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
TOUCH="node $B/probes/cdp-touch.mjs 9432"
ime() { echo "   ime: $($A shell dumpsys input_method | grep -m1 -o 'mInputShown=[a-z]*'); focus: $($EV 'document.activeElement?.tagName+"/"+(document.activeElement?.getAttribute("data-testid")??"")')"; }
for n in 1 2 3; do
  $A logcat -c
  $B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "$n.a full"
  [ "$n" = 1 ] && { $TOUCH doubletap 450 200 >/dev/null; sleep 2; $TOUCH doubletap 450 200 >/dev/null; sleep 2; $S "$n.a2 Fill then Fit (double taps)"; }
  $TOUCH testid mobile-node-desktop-handle >/dev/null; sleep 3; $S "$n.b handle"; ime
  $B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "$n.c full again"; ime
  $A shell input keyevent KEYCODE_BACK; sleep 3; $S "$n.d after one Back key"
  echo "   logcat: $($A logcat -d | grep -iE 'BackNavigation|finishBack|KEYCODE_BACK|wm_set_requested' | tail -4 | tr '\n' '|')"
  if $EV 'location.search.includes("full=1")' | grep -q true; then
    ime; $A shell input keyevent KEYCODE_BACK; sleep 3; $S "$n.e after a second Back key"
    $EV 'location.search.includes("full=1")' | grep -q true && $TOUCH testid mobile-node-desktop-handle >/dev/null && sleep 3 && $S "$n.f handle (cleanup)"
  fi
done
