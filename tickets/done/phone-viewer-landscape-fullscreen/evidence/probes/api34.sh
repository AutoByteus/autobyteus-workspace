#!/bin/bash
# autobyteus-432 API/E2E API-10: AC-001/AC-002 core on Android 14 (API 34, autobyteus277_api34), emulator-5554.
# Precondition: paired, run list of abx432-api-node shown, portrait. No uiautomator while in landscape.
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
P=$($A shell pidof org.autobyteus.mobile | tr -d '\r'); $A forward --remove tcp:9432 >/dev/null 2>&1; $A forward tcp:9432 localabstract:webview_devtools_remote_$P >/dev/null
echo "device: SDK $($A shell getprop ro.build.version.sdk | tr -d '\r'), release $($A shell getprop ro.build.version.release | tr -d '\r'), avd $($A shell getprop ro.boot.qemu.avd_name | tr -d '\r'); auto-rotate=$($A shell settings get system accelerometer_rotation | tr -d '\r') user_rotation=$($A shell settings get system user_rotation | tr -d '\r') navigation_mode=$($A shell settings get secure navigation_mode | tr -d '\r')"
$EV 'document.querySelector("[data-testid=mobile-run-open]").click(), 1' >/dev/null; sleep 3
$EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), 1' >/dev/null; sleep 6
$S "1 viewer, portrait"; $A exec-out screencap -p > $B/API-10-1-portrait.png
$B/probes/tapsel.sh mobile-node-desktop-full-screen; sleep 4; $S "2 full screen (real tap)"; $A exec-out screencap -p > $B/API-10-2-full-screen.png
node $B/probes/cdp-touch.mjs 9432 doubletap 450 200 >/dev/null; sleep 2; $S "2b after a double tap (Fill)"; node $B/probes/cdp-touch.mjs 9432 doubletap 450 200 >/dev/null; sleep 2; $S "2c after a second double tap (Fit)"
node $B/probes/cdp-touch.mjs 9432 testid mobile-node-desktop-handle >/dev/null; sleep 3; $S "3 after the handle"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "4 full screen again"
$A shell input keyevent KEYCODE_BACK; sleep 3; $S "5 after the Back key"
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 4; $S "6 full screen again"
$A shell input swipe 2 1200 500 1200 250; sleep 1.5; $A shell input swipe 2 540 500 540 250; sleep 3; $S "7 after back-gesture swipes from the left edge"
$A exec-out screencap -p > $B/API-10-3-after-exits.png
echo "user_rotation at the end: $($A shell settings get system user_rotation | tr -d '\r')"
