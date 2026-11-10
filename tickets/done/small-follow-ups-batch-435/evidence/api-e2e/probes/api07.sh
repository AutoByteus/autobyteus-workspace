#!/bin/bash
# autobyteus-435 API/E2E API-07 (AC-004-1): viewer full screen in both landscape directions on a cutout device.
# Page side via DevTools, Android side via dumpsys; landscape direction set through the emulator's accelerometer
# (adb emu sensor), never uiautomator. Precondition: the run's viewer is open in portrait.
. /private/tmp/abx435-api/probes/env.sh
TOUCH="node $B/probes/cdp-touch.mjs 9435"
echo "# API-07; $(date -u +%FT%TZ); emulator-5600 abx435_api35 Android 15, 1080x2400 @420dpi (2.625), Pixel 7 punch-hole cutout; APK of d37397b40d"
echo "device: immersive_mode_confirmations=$($A shell settings get secure immersive_mode_confirmations) accelerometer_rotation=$($A shell settings get system accelerometer_rotation) user_rotation=$($A shell settings get system user_rotation)"
cutout() { $A shell dumpsys window | grep -m1 -oE 'mCurrentFocus=[^ ]+ [^ ]+'; $A shell dumpsys window windows | grep -A40 'org.autobyteus.mobile/org.autobyteus.mobile.MainActivity' | grep -m1 -oE 'layoutInDisplayCutoutMode=[A-Z_]+|cutout=[^ ]+' ; }
fwd >/dev/null
state "F0 viewer, portrait"
$TOUCH testid mobile-node-desktop-full-screen >/dev/null; sleep 4
state "F1 full screen (first direction)"
echo "window attrs: $($A shell dumpsys window windows | grep -A60 'Window{.*org.autobyteus.mobile/org.autobyteus.mobile.MainActivity' | grep -m1 -oE 'fl=[^ ]+|layoutInDisplayCutoutMode=[^ ]+|cutoutMode=[^ ]+' | tr '\n' ' ')"
$A shell dumpsys window windows | grep -A60 'Window{.*org.autobyteus.mobile/org.autobyteus.mobile.MainActivity' | grep -m3 -iE 'cutout|mFrame=|frame=' | sed 's/^ */  /'
$A exec-out screencap -p > $B/API-07-1-full-screen-dir1.png
# Fill: a double tap at the picture's centre (View only zoom fills the screen width).
C=$($EV '(r=>Math.round(r.x+r.width/2)+" "+Math.round(r.y+r.height/2))(document.querySelector("[data-testid=mobile-node-desktop-stage]").getBoundingClientRect())' | tr -d '"')
$TOUCH doubletap $C >/dev/null; sleep 2
state "F2 Fill (double tap), first direction"
$A exec-out screencap -p > $B/API-07-2-fill-dir1.png
$TOUCH doubletap $C >/dev/null; sleep 2
for v in "-9.81:0:0" "9.81:0:0"; do
  $A emu sensor set acceleration $v >/dev/null; sleep 4
  state "F3 accelerometer $v"
done
$A exec-out screencap -p > $B/API-07-3-full-screen-dir2.png
C=$($EV '(r=>Math.round(r.x+r.width/2)+" "+Math.round(r.y+r.height/2))(document.querySelector("[data-testid=mobile-node-desktop-stage]").getBoundingClientRect())' | tr -d '"')
$TOUCH doubletap $C >/dev/null; sleep 2
state "F4 Fill (double tap), this direction"
$A exec-out screencap -p > $B/API-07-4-fill-dir2.png
$TOUCH doubletap $C >/dev/null; sleep 2
