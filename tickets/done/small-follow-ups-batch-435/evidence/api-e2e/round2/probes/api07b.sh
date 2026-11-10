#!/bin/bash
# autobyteus-435 API/E2E API-07 part 2: Fill in the second landscape direction (ROTATION_270), the window's frame, then
# leaving full screen. Usage: api07b.sh <env file> <label prefix>
. "$1"; P=$(echo "$EV" | grep -oE '[0-9]{4}$'); TOUCH="node $B/probes/cdp-touch.mjs $P"
win() { $A shell dumpsys window windows | grep -A60 'Window{.*org.autobyteus.mobile/org.autobyteus.mobile.MainActivity' | grep -m2 -oE 'layoutInDisplayCutoutMode=[a-zA-Z_]+|frame=\[[0-9,]+\]\[[0-9,]+\]' | tr '\n' ' '; }
echo "## part 2; $(date -u +%FT%TZ)"
$A emu sensor set acceleration -9.81:0:0 >/dev/null; sleep 4; state "G1 accelerometer -9.81:0:0"; echo "  window: $(win)"
C=$($EV '(r=>Math.round(r.x+r.width/2)+" "+Math.round(r.y+r.height/2))(document.querySelector("[data-testid=mobile-node-desktop-stage]").getBoundingClientRect())' | tr -d '"')
$TOUCH doubletap $C >/dev/null; sleep 2; state "G2 Fill, ROTATION_270"; $A exec-out screencap -p > $B/$2-fill-rot270.png
$TOUCH doubletap $C >/dev/null; sleep 2
$A emu sensor set acceleration 0:9.81:0 >/dev/null; sleep 1
$TOUCH testid mobile-node-desktop-handle >/dev/null; sleep 4; state "G3 after the handle (full screen off)"; echo "  window: $(win)"
$A shell dumpsys activity top | grep -A30 "View Hierarchy" | grep -A3 "DecorView@.*\[MainActivity\]" | grep "android:id/content" | sed 's/^ */  content frame (portrait, off): /' | cut -c1-140
