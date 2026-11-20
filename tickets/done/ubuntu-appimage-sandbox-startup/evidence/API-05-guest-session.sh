#!/bin/bash
set -eu
ulimit -c 0
export DISPLAY=:91
Xvfb :91 -screen 0 1280x900x24 -nolisten tcp >xvfb.log 2>&1 &
XVFB=$!
trap 'kill $XVFB ${WM:-} ${AGENT:-} ${FEED:-} 2>/dev/null || true' EXIT
for n in $(seq 1 30);do xdotool getdisplaygeometry >/dev/null 2>&1 && break; sleep 0.2;done
openbox >openbox.log 2>&1 & WM=$!
/usr/lib/policykit-1-gnome/polkit-gnome-authentication-agent-1 >polkit-agent.log 2>&1 & AGENT=$!
python3 -u -m http.server 18889 --bind 127.0.0.1 --directory /home/witness/feed >feed.log 2>&1 & FEED=$!
export AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e AUTOBYTEUS_ELECTRON_DATA_ROOT="$HOME/e2e-profile" AUTOBYTEUS_ELECTRON_SERVER_PORT=29696 AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL=http://127.0.0.1:18889/updates
if test -f "$HOME/after-reboot";then
  /opt/autobyteus-desktop/1000/app/AutoByteus.AppImage --remote-debugging-port=18990 >menu-app.log 2>&1
else
  env -u AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE -u AUTOBYTEUS_ELECTRON_DATA_ROOT -u AUTOBYTEUS_ELECTRON_SERVER_PORT -u AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL ./MyCurrentRenamed.AppImage --remote-debugging-port=18990 >current-app.log 2>&1 || true
fi
# Hold the display and policy agent after a normal app exit until fixture teardown.
read -r _ < "$HOME/stop-graphics"
