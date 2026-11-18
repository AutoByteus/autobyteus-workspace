#!/bin/bash
set -eu
ulimit -c 0
export DISPLAY=:91
Xvfb :91 -screen 0 1280x900x24 -nolisten tcp >xvfb.log 2>&1 &
XVFB=$!
trap 'kill $XVFB ${WM:-} ${AGENT:-} ${FEED:-} 2>/dev/null || true' EXIT
for n in $(seq 1 30);do xdpyinfo >/dev/null 2>&1 && break; sleep 0.2;done
openbox >openbox.log 2>&1 & WM=$!
/usr/lib/policykit-1-gnome/polkit-gnome-authentication-agent-1 >polkit-agent.log 2>&1 & AGENT=$!
python3 -u -m http.server 18889 --bind 127.0.0.1 --directory /home/witness/feed >feed.log 2>&1 & FEED=$!
./MyCurrentRenamed.AppImage --remote-debugging-port=18990 >current-app.log 2>&1
