#!/bin/bash
# autobyteus-432 API/E2E AC-002 on emulator-5554: every exit from full screen and every way of leaving the page.
# Real taps/swipes through the system (adb input) unless marked "synthetic".
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
fwd() { P=$($A shell pidof org.autobyteus.mobile | tr -d '\r'); $A forward --remove tcp:9432 >/dev/null 2>&1; $A forward tcp:9432 localabstract:webview_devtools_remote_$P >/dev/null; }
full() { $B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 3; }
android() {
  rot=$($A shell dumpsys window displays | grep -oE 'mDisplayRotation=ROTATION_[0-9]+' | head -1)
  req=$($A shell dumpsys activity activities | awk '/ActivityRecord\{.*org\.autobyteus\.mobile\/\.MainActivity/{f=1} f && /requestedOrientation=/{sub(/.*requestedOrientation=/,""); print; exit}')
  bars=$($A shell dumpsys window | grep -m2 -oE 'type=(statusBars|navigationBars) frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+' | tr '\n' ' ')
  echo "$1 | $rot $req bars: $bars"
}
full; $S "1a full"
node $B/probes/cdp-touch.mjs 9432 testid mobile-node-desktop-handle >/dev/null; sleep 3; $S "1b after the handle (touch into the page; no uiautomator while in landscape, see API-05a)"
full; $S "2a full"
$A shell input tap 1200 700; sleep 3; $S "2b after one tap on the picture (View only, real tap)"
full; $S "3a full"
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "3b after the Back key"
full; $S "4a full"
$A shell input swipe 2 540 500 540 250; sleep 1.5; android "4b after one back-gesture swipe from the left edge (immersive: shows the bars transiently)"
$A shell input swipe 2 540 500 540 250; sleep 3; $S "4c after a second back-gesture swipe"
full; $S "5a full"
URL=$(curl -s -X POST -H 'content-type: application/json' -d '{"serverBaseUrl":"http://10.0.2.2:52316","serverName":"abx432-api-node","trustedPrivateHttpAcknowledged":true,"connectionWay":"local_network"}' http://127.0.0.1:52316/rest/remote-access/pairing-sessions | python3 -c 'import sys,json;print(json.load(sys.stdin)["mobileUrl"])')
$A shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "'$URL'" -n org.autobyteus.mobile/.MainActivity >/dev/null 2>&1; sleep 1.5
android "5b 1.5 s after another app shares a pairing link for this node while in full screen (the app runs its connection flow)"; $A exec-out screencap -p > $B/API-05-5b-share-while-full.png
sleep 8; fwd; $S "5c the reopened page"
open_viewer() {
  $EV 'document.querySelector("[data-testid=mobile-new-run-button]").click(), 1' >/dev/null; sleep 2
  $EV 'document.querySelector("[data-testid=mobile-run-model-select-toggle]").click(), 1' >/dev/null; sleep 2
  $EV '[...document.querySelectorAll("[data-testid=mobile-run-model-select-option]")].find(e=>e.textContent.includes("qwen/qwen3.6-35b-a3b:lmstudio")).click(), 1' >/dev/null; sleep 1
  $EV 'document.querySelector("[data-testid=mobile-run-launch]").click(), 1' >/dev/null; sleep 4
  $EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1
  $EV 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), 1' >/dev/null; sleep 5
}
open_viewer; $S "6 viewer reopened (draft run, no message)"
full; $S "6a full"
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "6b Back (leaves full screen)"
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "6c Back (leaves the viewer, to the run)"
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "6d Back (to the run list)"
$B/probes/tapsel.sh mobile-node-button >/dev/null; sleep 2; $B/probes/tapsel.sh mobile-switch-node >/dev/null; sleep 3; android "6e node list via the node button -> Switch node (real taps; Switch node lives in the connection sheet, which full screen hides)"; $A exec-out screencap -p > $B/API-05-6-node-list.png
echo "user_rotation at the end: $($A shell settings get system user_rotation); UiAutomation restores during this run: $($A shell dumpsys window | grep -c 'rotation=ROTATION_90, caller=UiAutomationConnection')"
