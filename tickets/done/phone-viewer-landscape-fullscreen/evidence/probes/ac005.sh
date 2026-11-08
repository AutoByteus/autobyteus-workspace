#!/bin/bash
# autobyteus-432 API/E2E AC-005 + CR-C-06 on emulator-5554 (no uiautomator while in landscape).
# Precondition: the page shows the run list of abx432-api-node with the run that has a message.
export ANDROID_SERIAL=emulator-5554
B=/private/tmp/abx432-api
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $B/probes/state.sh"
EV="node $B/probes/cdp-eval.mjs 9432"
TOUCH="node $B/probes/cdp-touch.mjs 9432 testid"
NODE() { docker exec --user vncuser -e DISPLAY=:99 abx432-api-node "$@"; }
sheet() { $EV 'JSON.stringify({open: !!document.querySelector("[data-testid=mobile-node-desktop-clipboard]"), remote: document.querySelector("[data-testid=mobile-node-desktop-clipboard-remote-text]")?.textContent ?? null, empty: document.querySelector("[data-testid=mobile-node-desktop-clipboard-empty]")?.textContent ?? null, copyDisabled: document.querySelector("[data-testid=mobile-node-desktop-clipboard-copy-button]")?.disabled ?? null, fullScreen: location.search.includes("full=1")})'; }
closesheet() { $EV '(document.querySelector("[data-testid=mobile-node-desktop-clipboard] [aria-label=Close]")||[...document.querySelectorAll("[data-testid=mobile-node-desktop-clipboard] button")].find(b=>/Close|Cancel/i.test(b.textContent)))?.click(), 1' >/dev/null; sleep 1; }
copy_in_chromium() {
  # the agent copies text inside an app on the node: Chromium's address bar, Ctrl+L, type, Ctrl+A, Ctrl+C
  W=$(NODE xdotool search --onlyvisible --class chromium | head -1)
  NODE xdotool windowactivate --sync "$W"; NODE xdotool key ctrl+l; sleep 0.5
  NODE xdotool type --delay 30 "$1"; sleep 0.3; NODE xdotool key ctrl+a ctrl+c; sleep 1
  echo "node: copied '$1' in Chromium (window $W); node clipboard now: '$(NODE xclip -o -selection clipboard 2>/dev/null)'"
  NODE xdotool key Escape Escape
}

# open the run's viewer (run list -> run -> ⋮ -> VNC Viewer), Control, full screen
$EV 'document.querySelector("[data-testid=mobile-run-open]").click(), 1' >/dev/null; sleep 3
$EV 'document.querySelector("[data-testid=mobile-run-menu-button]").click(), 1' >/dev/null; sleep 1
$EV 'document.querySelector("[data-testid=mobile-run-menu-desktop]").click(), 1' >/dev/null; sleep 5
$B/probes/tapsel.sh mobile-node-desktop-mode >/dev/null; sleep 4; $S "1 Control"
# capture terminal on the node for typed keys
NODE sh -c 'xfce4-terminal --disable-server --title=abx432-capture -x sh -c "stty -echoctl; cat > /tmp/abx432-typed.txt" >/dev/null 2>&1 &'; sleep 3
W=$(NODE xdotool search --name abx432-capture | head -1); NODE xdotool windowactivate --sync "$W"; NODE xdotool windowsize "$W" 1000 500; NODE xdotool windowmove "$W" 450 300
$B/probes/tapsel.sh mobile-node-desktop-full-screen >/dev/null; sleep 3; $S "2 Control full screen"
echo "strip: $($EV 'JSON.stringify([...document.querySelectorAll("[data-testid=mobile-node-desktop-full-screen-strip] button")].map(b=>b.textContent.trim()))')"
echo "## Keyboard"
$TOUCH mobile-node-desktop-strip-keyboard >/dev/null; sleep 2
echo "keyboard: $($A shell dumpsys input_method | grep -m1 -o 'mInputShown=[a-z]*'), focus on the bridge input: $($EV 'document.activeElement?.getAttribute("data-testid")')"
$S "3 keyboard open"; $A exec-out screencap -p > $B/API-08-1-keyboard-full-screen.png
$A shell input text "abx432typed"; $A shell input keyevent 66; sleep 1.5
echo "node typed file: '$(NODE cat /tmp/abx432-typed.txt)'"
$A shell input keyevent KEYCODE_BACK; sleep 2; $S "4 Back closes the keyboard, full screen stays"
echo "## Clipboard: Send to desktop"
$TOUCH mobile-node-desktop-strip-clipboard >/dev/null; sleep 2; echo "sheet: $(sheet)"; $A exec-out screencap -p > $B/API-08-2-clipboard-sheet-full-screen.png
$TOUCH mobile-node-desktop-clipboard-paste-input >/dev/null; sleep 1; $A shell input text "abx432-sent-from-phone"; sleep 1
$TOUCH mobile-node-desktop-clipboard-send >/dev/null; sleep 2
echo "node clipboard after Send: '$(NODE xclip -o -selection clipboard 2>/dev/null)'"; $S "5 after Send"
echo "## CR-C-06: Copy from the desktop after a copy inside an app (full screen)"
copy_in_chromium "abx432-copied-in-chromium-full"
$TOUCH mobile-node-desktop-strip-clipboard >/dev/null; sleep 2; echo "sheet (full screen): $(sheet)"; $A exec-out screencap -p > $B/API-08-3-copy-from-desktop-full.png
$TOUCH mobile-node-desktop-clipboard-copy-button >/dev/null 2>&1; sleep 1; echo "copy button after tap: $($EV 'document.querySelector("[data-testid=mobile-node-desktop-clipboard-copy-button]")?.textContent.trim() ?? null')"
closesheet; $TOUCH mobile-node-desktop-handle >/dev/null; sleep 3; $S "6 left full screen"
echo "## CR-C-06 outside full screen"
copy_in_chromium "abx432-copied-in-chromium-portrait"
$B/probes/tapsel.sh mobile-node-desktop-clipboard-open >/dev/null; sleep 2; echo "sheet (portrait): $(sheet)"; $A exec-out screencap -p > $B/API-08-4-copy-from-desktop-portrait.png
