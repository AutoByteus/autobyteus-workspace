#!/bin/bash
# autobyteus-435 API/E2E API-10 (AC-005-6 on Android): a run created on the phone (Create run, first message sent; the
# route names the node's run), its Activity open; Home; Android ends the app (pid-checked am kill); the user reopens it
# from the launcher. Expect the same run's Activity after "Opening…". No uiautomator; DevTools for page state.
. /private/tmp/abx435-api/probes/env.sh
echo "# API-10; $(date -u +%FT%TZ); emulator-5600 abx435_api35 (Android 15); APK of d37397b40d (fresh clone); node abx435-api-node"
fwd >/dev/null
for i in $(seq 1 60); do R=$($EV 'document.querySelector("[data-testid=mobile-run-conversation]")?.innerText.toLowerCase().includes("ok") && !document.querySelector("[data-testid=mobile-run-conversation]")?.innerText.includes("Thinking")'); [ "$R" = "true" ] && break; sleep 2; done
echo "reply shown after ~$((i*2)) s: $R"
state "D0 the created run (after its first message)"
$EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-menu-activity]").click(), 1' >/dev/null; sleep 3
state "D1 Activity open"
$A shell input keyevent KEYCODE_HOME; sleep 5
OLD=$($A shell pidof org.autobyteus.mobile | tr -d '\r')
for i in 1 2 3 4 5; do $A shell am kill org.autobyteus.mobile; sleep 2; [ -z "$($A shell pidof org.autobyteus.mobile | tr -d '\r')" ] && break; done
android "D2 Home, then Android ends the app (am kill; pid before: $OLD)"
launch; sleep 1
P=""; for i in $(seq 1 20); do P=$($A shell pidof org.autobyteus.mobile | tr -d '\r'); [ -n "$P" ] && break; sleep 0.5; done
$A forward --remove tcp:9435 >/dev/null 2>&1; $A forward tcp:9435 localabstract:webview_devtools_remote_$P >/dev/null 2>&1
# Screens from the page start: sample quickly until the Activity view shows.
for i in $(seq 1 80); do S=$($EV 'JSON.stringify({q:location.search,list:!!document.querySelector("[data-testid=mobile-run-tree]")?.offsetParent,run:document.querySelector("[data-testid=mobile-run-screen]")?.getAttribute("data-state")??null,opening:!!document.querySelector("[data-testid=mobile-run-opening]"),activity:!!document.querySelector("[data-testid=mobile-activity]")})' 2>/dev/null); [ -n "$S" ] && [ "$S" != "$LAST" ] && { echo "  sample $i: $S"; LAST=$S; }; echo "$S" | grep -q '\\"activity\\":true' && break; sleep 0.25; done
sleep 2
state "D3 reopened from the launcher (new pid $P)"
shotto /private/tmp/abx435-api/API-10-reopened-activity.png
