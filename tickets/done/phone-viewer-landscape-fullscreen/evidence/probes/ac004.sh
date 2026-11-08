#!/bin/bash
# autobyteus-432 API/E2E AC-004 on emulator-5554 (no uiautomator while in landscape).
# Part A (draft run): Home + return in full screen; then Android ends the app in the background (am kill) and the user
#   reopens it. Part B (a run with one message, so it survives the page): the same process death while in full screen,
#   and the restored page re-enters full screen (SCN-a).
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
fwd() { for i in $(seq 1 20); do P=$($A shell pidof org.autobyteus.mobile | tr -d '\r'); [ -n "$P" ] && $A forward --remove tcp:9432 >/dev/null 2>&1; [ -n "$P" ] && $A forward tcp:9432 localabstract:webview_devtools_remote_$P >/dev/null 2>&1 && $EV '1' >/dev/null 2>&1 && return; sleep 1; done; }
android() {
  rot=$($A shell dumpsys window displays | grep -oE 'mDisplayRotation=ROTATION_[0-9]+' | head -1)
  req=$($A shell dumpsys activity activities | awk '/ActivityRecord\{.*org\.autobyteus\.mobile\/\.MainActivity/{f=1} f && /requestedOrientation=/{sub(/.*requestedOrientation=/,""); print; exit}')
  bars=$($A shell dumpsys window | grep -m2 -oE 'type=(statusBars|navigationBars) frame=[^ ]+ visible=[a-z]+' | grep -oE 'visible=[a-z]+' | tr '\n' ' ')
  echo "$1 | $rot $req bars: $bars pid=$($A shell pidof org.autobyteus.mobile | tr -d '\r')"
}
launch() { $A shell am start -n org.autobyteus.mobile/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER >/dev/null 2>&1; }
full() { $B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 3; }
draft_viewer() {
  $EV 'document.querySelector("[data-testid=mobile-new-run-button]").click(), 1' >/dev/null; sleep 2
  $EV 'document.querySelector("[data-testid=mobile-run-model-select-toggle]").click(), 1' >/dev/null; sleep 2
  $EV '[...document.querySelectorAll("[data-testid=mobile-run-model-select-option]")].find(e=>e.textContent.includes("qwen/qwen3.6-35b-a3b:lmstudio")).click(), 1' >/dev/null; sleep 1
  $EV 'document.querySelector("[data-testid=mobile-run-launch]").click(), 1' >/dev/null; sleep 4
}
viewer() { $EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1; $EV 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), 1' >/dev/null; sleep 5; }

if [ "$1" = "A" ]; then
  fwd; $S "A0 viewer (draft run)"
  full; $S "A1 full"
  $A shell input keyevent KEYCODE_HOME; sleep 3; android "A2 Home (app in the background)"
  launch; sleep 4; fwd; $S "A3 back in the app"
  $A shell input keyevent KEYCODE_HOME; sleep 3; $A shell am kill org.autobyteus.mobile; sleep 2; android "A4 Home, then Android ends the app (am kill)"
  launch; sleep 10; fwd; $S "A5 reopened from the launcher"; android "A5 android"
  $A exec-out screencap -p > $B/API-07-A5-reopened-after-kill.png
fi
if [ "$1" = "B" ]; then
  # a run with one message to the local LM Studio model, so the run (and the restored page) survives
  fwd
  $EV '(()=>{const t=document.querySelector("textarea"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(t,"Reply with the single word ok."); t.dispatchEvent(new Event("input",{bubbles:true})); return "typed"})()'
  $EV '[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Send message"||b.textContent.trim()==="Send message").click(), "sent"'
  for i in $(seq 1 90); do sleep 2; R=$($EV 'document.body.innerText.includes("ok")||document.body.innerText.includes("Ok")'); [ "$R" = "true" ] && break; done
  echo "B0 reply seen after ~$((i*2)) s: $($EV 'location.search')"
  viewer; $S "B1 viewer of the run"
  full; $S "B2 full"
  $A shell input keyevent KEYCODE_HOME; sleep 3; $A shell am kill org.autobyteus.mobile; sleep 2; android "B3 Home, then Android ends the app (am kill)"
  launch; sleep 12; fwd; $S "B4 reopened from the launcher (restored page)"; android "B4 android"
  $A exec-out screencap -p > $B/API-07-B4-restored-full.png
  $B/probes/../probes/state.sh >/dev/null 2>&1
  node $B/probes/cdp-touch.mjs 9432 testid mobile-node-desktop-handle >/dev/null 2>&1; sleep 3; $S "B5 after the handle"
fi

if [ "$1" = "B2" ]; then
  # process death, checked: Home, wait, am kill until the pid is gone, then the launcher
  fwd; viewer; $S "C1 viewer of the run (message + reply)"
  full; $S "C2 full"
  OLD=$($A shell pidof org.autobyteus.mobile | tr -d '\r')
  $A shell input keyevent KEYCODE_HOME; sleep 8
  for i in 1 2 3 4 5; do $A shell am kill org.autobyteus.mobile; sleep 2; [ -z "$($A shell pidof org.autobyteus.mobile | tr -d '\r')" ] && break; done
  android "C3 Home, then Android ends the app (am kill; pid before: $OLD)"
  launch; sleep 12; fwd; $S "C4 reopened from the launcher (restored page)"; android "C4 android (new pid)"
  $A exec-out screencap -p > $B/API-07-C4-restored-full.png
  node $B/probes/cdp-touch.mjs 9432 testid mobile-node-desktop-handle >/dev/null 2>&1; sleep 3; $S "C5 after the handle"
fi
