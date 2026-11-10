#!/bin/bash
# autobyteus-435 API/E2E round 2: on a fresh emulator, pair with the test node by the share intent, create a draft run
# (no message, no model call) and open its VNC Viewer in portrait. Usage: setup-viewer.sh <env file>
. "$1"; . /private/tmp/abx435-api2/probes/node-rest.sh
TOUCH="node $B/probes/cdp-touch.mjs $(echo "$EV" | grep -oE '[0-9]{4}$')"
until [ "$($A shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
$A shell settings put secure immersive_mode_confirmations confirmed; $A shell settings put system accelerometer_rotation 0; $A shell settings put system user_rotation 0
echo "# setup; $(date -u +%FT%TZ); $ANDROID_SERIAL Android $($A shell getprop ro.build.version.release | tr -d '\r'), WebView $($A shell dumpsys webviewupdate | grep -m1 -oE '\(com.google.android.webview, [0-9.]+\)'); APK of b5da2d15a0 (worktree); cutout: $($A shell dumpsys display | grep -m1 -oE 'cutoutSpec=\{M [0-9.]+|DisplayCutout\{insets=Rect\([0-9, -]+\)' )"
$A install -r /Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk >/dev/null && echo installed
$A shell pm clear org.autobyteus.mobile >/dev/null; echo "app data cleared"
pairlink "http://10.0.2.2:$(cat $B/node-port)" "abx435 Test Node"; launch; sleep 5; share; sleep 10; fwd >/dev/null
for i in $(seq 1 20); do $EV 'document.body.innerText.includes("Connected")' | grep -q true && break; $EV 'document.querySelector("[data-testid=mobile-pair-button]")?.click(), 1' >/dev/null; sleep 2; done
$EV 'document.querySelector("[data-testid=mobile-new-run-button]").click(), 1' >/dev/null; sleep 2
$EV 'document.querySelector("[data-testid=mobile-run-model-select-toggle]")?.click(), 1' >/dev/null; sleep 2
for i in $(seq 1 30); do $EV '[...document.querySelectorAll("[data-testid=mobile-run-model-select-option]")].some(e=>e.textContent.includes("google/gemma-4-26b-a4b:lmstudio"))' | grep -q true && break; $EV 'document.querySelector("[data-testid=mobile-run-model-select-option]") || document.querySelector("[data-testid=mobile-run-model-select-toggle]")?.click(), 1' >/dev/null; sleep 2; done
$EV '[...document.querySelectorAll("[data-testid=mobile-run-model-select-option]")].find(e=>e.textContent.includes("google/gemma-4-26b-a4b:lmstudio")).click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-launch]").click(), 1' >/dev/null; sleep 4
for i in $(seq 1 20); do $EV 'document.querySelector("[data-testid=mobile-run-screen]")?.getAttribute("data-state")' | grep -q open && break; sleep 1; done
$EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), 1' >/dev/null
for i in $(seq 1 40); do $EV 'document.querySelector("[data-testid=mobile-node-desktop-status]")?.textContent ?? ""' | grep -q Connected && break; sleep 1; done
state "S viewer open"
