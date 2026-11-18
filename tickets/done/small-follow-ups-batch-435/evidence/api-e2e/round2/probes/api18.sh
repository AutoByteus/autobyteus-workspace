#!/bin/bash
# autobyteus-435 API/E2E API-18 (extra, AC-004-1 on Android 14): the controller's cutout-mode branch for API 28-34
# (Display.setLayoutInDisplayCutoutMode). Pair, a draft run (no message, no model call), its viewer, full screen in
# both landscape directions, Fill, leave. Same helpers as API-07, on emulator-5602 (abx435r2_api34).
. /private/tmp/abx435-api2/probes/env34.sh; . /private/tmp/abx435-api2/probes/node-rest.sh
TOUCH="node $B/probes/cdp-touch.mjs 9436"
until [ "$($A shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
$A shell settings put secure immersive_mode_confirmations confirmed; $A shell settings put system accelerometer_rotation 0; $A shell settings put system user_rotation 0
echo "# API-18; $(date -u +%FT%TZ); emulator-5602 abx435r2_api34 Android $($A shell getprop ro.build.version.release | tr -d '\r'), WebView $($A shell dumpsys webviewupdate | grep -m1 -oE '\(com.google.android.webview, [0-9.]+\)'); APK of b5da2d15a0 (worktree); cutout: $($A shell dumpsys display | grep -m1 -oE 'cutoutSpec=\{M [0-9.]+|DisplayCutout\{insets=Rect\([0-9, -]+\)' )"
$A install -r /Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk >/dev/null && echo installed
$A shell pm clear org.autobyteus.mobile >/dev/null; echo "app data cleared"
pairlink "http://10.0.2.2:$(cat $B/node-port)" "abx435 Test Node"; launch; sleep 5; share; sleep 10; fwd >/dev/null
for i in $(seq 1 20); do $EV 'document.body.innerText.includes("Connected")' | grep -q true && break; $EV 'document.querySelector("[data-testid=mobile-pair-button]")?.click(), 1' >/dev/null; sleep 2; done
$EV 'document.querySelector("[data-testid=mobile-new-run-button]").click(), 1' >/dev/null; sleep 2
$EV 'document.querySelector("[data-testid=mobile-run-model-select-toggle]")?.click(), 1' >/dev/null; sleep 2
$EV '[...document.querySelectorAll("[data-testid=mobile-run-model-select-option]")].find(e=>e.textContent.includes("google/gemma-4-26b-a4b:lmstudio")).click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-launch]").click(), 1' >/dev/null; sleep 4
$EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), 1' >/dev/null
for i in $(seq 1 40); do $EV 'document.querySelector("[data-testid=mobile-node-desktop-status]")?.textContent ?? ""' | grep -q Connected && break; sleep 1; done
win() { $A shell dumpsys window windows | grep -A60 'Window{.*org.autobyteus.mobile/org.autobyteus.mobile.MainActivity' | grep -m2 -oE 'layoutInDisplayCutoutMode=[a-zA-Z_]+|frame=\[[0-9,]+\]\[[0-9,]+\]' | tr '\n' ' '; }
state "H0 viewer, portrait"; echo "  window: $(win)"
$TOUCH testid mobile-node-desktop-full-screen >/dev/null; sleep 4
for v in "9.81:0:0" "-9.81:0:0"; do
  $A emu sensor set acceleration $v >/dev/null; sleep 4
  state "H1 full screen, accelerometer $v"; echo "  window: $(win)"
  C=$($EV '(r=>Math.round(r.x+r.width/2)+" "+Math.round(r.y+r.height/2))(document.querySelector("[data-testid=mobile-node-desktop-stage]").getBoundingClientRect())' | tr -d '"')
  $TOUCH doubletap $C >/dev/null; sleep 2; state "H2 Fill, accelerometer $v"
  $A exec-out screencap -p > $B/API-18-fill-$( [ "$v" = "9.81:0:0" ] && echo a || echo b ).png
  $TOUCH doubletap $C >/dev/null; sleep 2
done
$A emu sensor set acceleration 0:9.81:0 >/dev/null
$TOUCH testid mobile-node-desktop-handle >/dev/null; sleep 4
state "H3 full screen off"; echo "  window: $(win)"
