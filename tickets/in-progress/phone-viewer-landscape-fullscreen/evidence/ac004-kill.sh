#!/bin/bash
# autobyteus-432 AC-004 (426 D-03): Android ends the app in the background while the viewer is in full screen.
R=/private/tmp/abx-432
A=$HOME/Library/Android/sdk/platform-tools/adb
S="bash $R/state.sh"
$S "14a full, before Home"
$A shell input keyevent 3
sleep 3
echo "14b pid before kill: $($A shell pidof org.autobyteus.mobile)"
$A shell am kill org.autobyteus.mobile
sleep 2
echo "14c pid after kill: $($A shell pidof org.autobyteus.mobile)"
$A shell am start -n org.autobyteus.mobile/.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER >/dev/null
for i in $(seq 1 20); do
  PID=$($A shell pidof org.autobyteus.mobile | tr -d '\r')
  [ -n "$PID" ] && $A forward tcp:9432 localabstract:webview_devtools_remote_$PID >/dev/null 2>&1 && curl -s http://127.0.0.1:9432/json | grep -q mobile && break
  sleep 2
done
sleep 6
echo "14d new pid: $PID"
$S "14e reopened after process death"
$A exec-out screencap -p > $R/a-12-reopened-after-kill.png
