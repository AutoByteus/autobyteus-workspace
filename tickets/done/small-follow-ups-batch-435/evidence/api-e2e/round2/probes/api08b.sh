#!/bin/bash
# autobyteus-435 API/E2E API-08 (AC-006-1): Control, full screen (landscape), the strip's Clipboard, the paste field
# focused with the real keyboard open, typed with adb, Send tapped with a real tap (adb input tap). The node's clipboard
# is read inside the test container (xclip). In full screen the WebView covers the whole screen (origin 0,0; API-07).
. /private/tmp/abx435-api2/probes/env34.sh
TOUCH="node $B/probes/cdp-touch.mjs 9436"
NODE() { docker exec --user vncuser -e DISPLAY=:99 abx435r2-api-node "$@"; }
echo "# API-08b (Android 14); $(date -u +%FT%TZ); emulator-5602 abx435r2_api34 Android 14; APK of b5da2d15a0 (worktree); node abx435r2-api-node; keyboard: $($A shell settings get secure default_input_method)"
fwd >/dev/null
$TOUCH testid mobile-node-desktop-mode >/dev/null; sleep 2
echo "mode: $($EV 'document.querySelector("[data-testid=mobile-node-desktop-mode]")?.textContent.trim()')"
$TOUCH testid mobile-node-desktop-full-screen >/dev/null; sleep 4
state "K0 Control, full screen"
echo "node clipboard before: '$(NODE xclip -o -selection clipboard 2>/dev/null)'"
tapid mobile-node-desktop-strip-clipboard; sleep 2
echo "sheet open: $($EV '!!document.querySelector("[data-testid=mobile-node-desktop-clipboard]")')"
tapid mobile-node-desktop-clipboard-paste-input; sleep 3
echo "focus: $($EV 'document.activeElement?.getAttribute("data-testid")'); keyboard: $($A shell dumpsys input_method | grep -m1 -o 'mInputShown=[a-z]*')"
$A shell input text "abx435-sent-in-full-screen"; sleep 2
GEOM='JSON.stringify({value:document.querySelector("[data-testid=mobile-node-desktop-clipboard-paste-input]")?.value,visual:[Math.round(visualViewport.width),Math.round(visualViewport.height),Math.round(visualViewport.offsetTop)],inner:[innerWidth,innerHeight],input:(r=>[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)])(document.querySelector("[data-testid=mobile-node-desktop-clipboard-paste-input]").getBoundingClientRect()),send:(r=>[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)])(document.querySelector("[data-testid=mobile-node-desktop-clipboard-send]").getBoundingClientRect()),sendDisabled:document.querySelector("[data-testid=mobile-node-desktop-clipboard-send]")?.disabled,topAtSendCentre:(r=>document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("[data-testid]")?.getAttribute("data-testid"))(document.querySelector("[data-testid=mobile-node-desktop-clipboard-send]").getBoundingClientRect())})'
echo "typed, keyboard open: $($EV "$GEOM"); keyboard: $($A shell dumpsys input_method | grep -m1 -o 'mInputShown=[a-z]*')"
echo "IME window: $($A shell dumpsys window windows | grep -A40 'Window{.*InputMethod' | grep -m1 -oE 'frame=\[[^ ]+')"
$A exec-out screencap -p > $B/API-08b-1-keyboard-open-send-visible.png
tapid mobile-node-desktop-clipboard-send; sleep 3
echo "node clipboard after Send: '$(NODE xclip -o -selection clipboard 2>/dev/null)'"
echo "after Send: sheet open $($EV '!!document.querySelector("[data-testid=mobile-node-desktop-clipboard]")'), field '$($EV 'document.querySelector("[data-testid=mobile-node-desktop-clipboard-paste-input]")?.value ?? null')', keyboard $($A shell dumpsys input_method | grep -m1 -o 'mInputShown=[a-z]*')"
state "K1 after Send (still full screen)"
$A exec-out screencap -p > $B/API-08b-2-after-send.png
