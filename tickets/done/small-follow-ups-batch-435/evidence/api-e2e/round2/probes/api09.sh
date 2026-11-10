#!/bin/bash
# autobyteus-435 API/E2E API-09 (AC-005-2): the run's VNC Viewer in full screen (landscape); Home; Android ends the
# app (pid-checked am kill); reopened from the launcher. Expect the same run's viewer, in full screen, landscape.
. /private/tmp/abx435-api2/probes/env.sh
echo "# API-09; $(date -u +%FT%TZ); emulator-5600 abx435r2_api35 Android 15; APK of b5da2d15a0 (worktree); node abx435r2-api-node"
fwd >/dev/null
state "E0 viewer in full screen before"
$A shell input keyevent KEYCODE_HOME; sleep 6
android "E1 Home (app in the background)"
OLD=$($A shell pidof org.autobyteus.mobile | tr -d '\r')
for i in 1 2 3 4 5; do $A shell am kill org.autobyteus.mobile; sleep 2; [ -z "$($A shell pidof org.autobyteus.mobile | tr -d '\r')" ] && break; done
android "E2 Android ended the app (am kill; pid before: $OLD)"
launch; sleep 1
P=""; for i in $(seq 1 20); do P=$($A shell pidof org.autobyteus.mobile | tr -d '\r'); [ -n "$P" ] && break; sleep 0.5; done
$A forward --remove tcp:9435 >/dev/null 2>&1; $A forward tcp:9435 localabstract:webview_devtools_remote_$P >/dev/null 2>&1
for i in $(seq 1 100); do S=$($EV 'JSON.stringify({q:location.search,list:!!document.querySelector("[data-testid=mobile-run-tree]")?.offsetParent,run:document.querySelector("[data-testid=mobile-run-screen]")?.getAttribute("data-state")??null,viewer:!!document.querySelector("[data-testid=mobile-node-desktop-stage]"),status:document.querySelector("[data-testid=mobile-node-desktop-status]")?.textContent.trim()??null,handle:!!document.querySelector("[data-testid=mobile-node-desktop-handle]"),canvas:!!document.querySelector("[data-testid=mobile-node-desktop-stage] canvas")})' 2>/dev/null); [ -n "$S" ] && [ "$S" != "$LAST" ] && { echo "  sample $i: $S"; LAST=$S; }; echo "$S" | grep -q '\\"canvas\\":true' && break; sleep 0.25; done
sleep 4
state "E3 reopened from the launcher (new pid $P)"
$A exec-out screencap -p > $B/API-09-reopened-viewer-full-screen.png
