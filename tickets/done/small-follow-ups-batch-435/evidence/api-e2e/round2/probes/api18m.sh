#!/bin/bash
# autobyteus-435 API/E2E API-18 (AC-004-1 on Android 14, DEC-020): after setup-viewer.sh, full screen in both landscape
# directions, Fill, the window and the content frame (dumpsys activity top; no uiautomator), then off.
. /private/tmp/abx435-api2/probes/env34.sh
TOUCH="node $B/probes/cdp-touch.mjs 9436"
echo "# API-18 round 2; $(date -u +%FT%TZ); emulator-5602 abx435r2_api34 Android 14; APK of b5da2d15a0 (worktree); node abx435r2-api-node"
content() { $A shell dumpsys activity top | grep -A30 "View Hierarchy" | grep -A3 "DecorView@.*\[MainActivity\]" | grep "android:id/content" | sed 's/^ */  content frame: /' | cut -c1-140; }
win() { $A shell dumpsys window windows | grep -A60 'Window{.*org.autobyteus.mobile/org.autobyteus.mobile.MainActivity' | grep -m2 -oE 'layoutInDisplayCutoutMode=[a-zA-Z_]+|frame=\[[0-9,]+\]\[[0-9,]+\]' | tr '\n' ' '; }
state "H0 viewer, portrait"; echo "  window: $(win)"; content
$TOUCH testid mobile-node-desktop-full-screen >/dev/null; sleep 4
for v in "9.81:0:0" "-9.81:0:0"; do
  $A emu sensor set acceleration $v >/dev/null; sleep 4
  state "H1 full screen, accelerometer $v"; echo "  window: $(win)"; content
  C=$($EV '(r=>Math.round(r.x+r.width/2)+" "+Math.round(r.y+r.height/2))(document.querySelector("[data-testid=mobile-node-desktop-stage]").getBoundingClientRect())' | tr -d '"')
  $TOUCH doubletap $C >/dev/null; sleep 2; state "H2 Fill, accelerometer $v"
  $A exec-out screencap -p > $B/API-18-fill-$( [ "$v" = "9.81:0:0" ] && echo a || echo b ).png
  $TOUCH doubletap $C >/dev/null; sleep 2
done
$A emu sensor set acceleration 0:9.81:0 >/dev/null
$TOUCH testid mobile-node-desktop-handle >/dev/null; sleep 4
state "H3 full screen off"; echo "  window: $(win)"; content
