#!/bin/bash
# autobyteus-432 API/E2E AC-005 / CR-C-06, the full-screen half with checks at every step (no uiautomator in landscape).
# Precondition: the run's viewer is open in Control, portrait.
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
TOUCH="node $B/probes/cdp-touch.mjs 9432 testid"
NODE() { docker exec --user vncuser -e DISPLAY=:99 abx432-api-node "$@"; }
sheet() { $EV 'JSON.stringify({open: !!document.querySelector("[data-testid=mobile-node-desktop-clipboard]"), remote: document.querySelector("[data-testid=mobile-node-desktop-clipboard-remote-text]")?.textContent ?? null, empty: document.querySelector("[data-testid=mobile-node-desktop-clipboard-empty]")?.textContent ?? null, copyDisabled: document.querySelector("[data-testid=mobile-node-desktop-clipboard-copy-button]")?.disabled ?? null, fullScreen: location.search.includes("full=1")})'; }
copy_in_chromium() {
  W=$(NODE xdotool search --onlyvisible --class chromium | head -1)
  NODE xdotool windowactivate --sync "$W"; NODE xdotool key ctrl+l; sleep 0.5
  NODE xdotool type --delay 30 "$1"; sleep 0.3; NODE xdotool key ctrl+a ctrl+c; sleep 1
  echo "node: copied '$1' inside Chromium (Ctrl+A, Ctrl+C); node clipboard: '$(NODE xclip -o -selection clipboard 2>/dev/null)'"
  NODE xdotool key Escape Escape
}
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 3; $S "F1 Control full screen"
echo "## Send to desktop in full screen"
$TOUCH mobile-node-desktop-strip-clipboard >/dev/null; sleep 2; echo "sheet: $(sheet)"
$EV 'document.querySelector("[data-testid=mobile-node-desktop-clipboard-paste-input]").focus(), document.activeElement.getAttribute("data-testid")'
$A shell input text "abx432-sent-in-full-screen"; sleep 1
echo "input value: $($EV 'document.querySelector("[data-testid=mobile-node-desktop-clipboard-paste-input]").value'); keyboard: $($A shell dumpsys input_method | grep -m1 -o 'mInputShown=[a-z]*')"
$A exec-out screencap -p > $B/API-08-5-sheet-full-screen-typing.png
$TOUCH mobile-node-desktop-clipboard-send >/dev/null; sleep 2
echo "node clipboard after Send: '$(NODE xclip -o -selection clipboard 2>/dev/null)'; sheet open: $($EV '!!document.querySelector("[data-testid=mobile-node-desktop-clipboard]")')"
$A shell dumpsys input_method | grep -m1 -q 'mInputShown=true' && $A shell input keyevent KEYCODE_BACK; sleep 1; $S "F2 after Send"
echo "## Copy from the desktop in full screen (CR-C-06)"
copy_in_chromium "abx432-copied-in-chromium-full"
$TOUCH mobile-node-desktop-strip-clipboard >/dev/null; sleep 2; echo "sheet: $(sheet)"; $A exec-out screencap -p > $B/API-08-6-copy-from-desktop-full.png
$TOUCH mobile-node-desktop-clipboard-copy-button >/dev/null; sleep 1.5; echo "Copy button after a tap: '$($EV 'document.querySelector("[data-testid=mobile-node-desktop-clipboard-copy-button]")?.textContent.trim() ?? "(sheet closed)"')'"
$S "F3 still full screen"
