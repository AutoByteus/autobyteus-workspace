#!/bin/bash
# Inside Xvfb, as the non-root user: OLD image first (expected loader failure), then NEW image (expected app start).
set -u
echo "DISPLAY=$DISPLAY"
echo; echo "===== OLD: /images/old-published-v1.5.14-beta.6.AppImage --appimage-extract-and-run"
cd "$HOME"; /images/old-published-v1.5.14-beta.6.AppImage --appimage-extract-and-run > /out/old-launcher.out 2>&1; echo "old exit=$?"; cat /out/old-launcher.out
echo; echo "===== NEW: /images/new-ci-run44956618584.AppImage --appimage-extract-and-run"
start=$(date +%s)
# own process group, like a terminal job, so the stop below is a terminal Ctrl+C (SIGINT to the job's group)
setsid /images/new-ci-run44956618584.AppImage --appimage-extract-and-run > /out/new-launcher.out 2>&1 &
LPID=$!
ready=no
for i in $(seq 1 300); do
  kill -0 $LPID 2>/dev/null || { echo "launcher exited early"; break; }
  grep -q 'Server health check successful, server is ready' "$HOME/.autobyteus/logs/app.log" 2>/dev/null && { ready=yes; break; }
  sleep 1
done
echo "server ready=$ready after $(( $(date +%s) - start ))s"
sleep 15   # let the renderer load its first page
echo; echo "----- processes of $(id -un) (ps -o pid,ppid,etime,args)"; ps -u "$(id -un)" -o pid,ppid,etime,args --forest | cut -c1-240
echo; echo "----- extracted mount point (runtime extract-and-run dir)"; ls -d /tmp/appimage_extracted_* 2>&1
echo; echo "----- X windows (xwininfo -root -tree, named windows)"; xwininfo -root -tree | grep -E '"[^"]+"' | grep -v 'has no name' | cut -c1-200
port=$(ps -u "$(id -un)" -o args | grep -oE 'resources/server/dist/app\.js --port [0-9]+' | grep -oE '[0-9]+$' | head -1); url="http://127.0.0.1:$port"
echo; echo "----- Chromium sandbox: user/pid namespaces of the browser vs its renderers (differ = namespace sandbox active)"
main=$(pgrep -u "$(id -un)" -xf '/tmp/appimage_extracted_[0-9a-f]+/autobyteus'); echo "browser pid $main: user $(readlink /proc/$main/ns/user) pid $(readlink /proc/$main/ns/pid)"
for r in $(pgrep -u "$(id -un)" -f -- '--type=renderer'); do echo "renderer pid $r: user $(readlink /proc/$r/ns/user) pid $(readlink /proc/$r/ns/pid) seccomp $(grep Seccomp: /proc/$r/status | awk '{print $2}')"; done
echo "no --no-sandbox on any process: $(ps -u "$(id -un)" -o args | grep -c -- '--no-sandbox' | sed 's/^0$/yes/')"
echo; echo "----- app.log readiness lines"; grep -nE 'server is ready|Server is ready|listening|Starting server|server process' "$HOME/.autobyteus/logs/app.log" | head -12 | cut -c1-220
echo; echo "----- server URL from app.log: ${url:-none}"
[ -n "$url" ] && { echo "GET $url/rest/health:"; curl -sS -m 5 -w '\nHTTP %{http_code}\n' "$url/rest/health"; }
echo; echo "----- screenshot"; import -window root /out/new-app-screen.png && echo saved /out/new-app-screen.png
echo; echo "----- stop: terminal Ctrl+C = SIGINT to the job's process group -$LPID"
kill -INT -- -$LPID; for i in $(seq 1 60); do kill -0 $LPID 2>/dev/null || break; sleep 1; done
wait $LPID; echo "launcher exit=$? after stop"; sleep 5
echo "remaining processes of $(id -un) other than this session:"; ps -u "$(id -un)" -o pid,args | grep -vE 'session.sh|xvfb-run|Xvfb|ps -u|grep|bash /probe|PID' || echo "(none)"
echo "extract dir after stop: $(ls -d /tmp/appimage_extracted_* 2>/dev/null || echo removed)"
cp "$HOME/.autobyteus/logs/app.log" /out/new-app.log 2>/dev/null
