#!/bin/bash
# Inside Xvfb with openbox, as the non-root user. Part A: NEW image, quit by closing the window (what a desktop user does).
# Part B (only when /probe/ENABLE_OLD_WITH_LIBZ exists, set by the host around a temporary libz.so symlink): OLD image's
# legacy runtime with the same Ctrl+C stop as attempt 5, to compare the extract folder left behind.
set -u
openbox >/out/openbox.log 2>&1 & sleep 2
wait_ready() { for i in $(seq 1 300); do kill -0 $1 2>/dev/null || { echo "launcher exited early"; return 1; }
  grep -q 'Server health check successful, server is ready' "$HOME/.autobyteus/logs/app.log" 2>/dev/null && return 0; sleep 1; done; return 1; }
echo "DISPLAY=$DISPLAY  libz.so present: $(ls /usr/lib/aarch64-linux-gnu/libz.so 2>/dev/null || echo no)"
if [ ! -e /probe/ENABLE_OLD_WITH_LIBZ ]; then
echo; echo "===== A: NEW --appimage-extract-and-run, quit by closing the window"
rm -rf "$HOME/.autobyteus" "$HOME/.config/autobyteus"
setsid /images/new-ci-run44956618584.AppImage --appimage-extract-and-run > /out/new-launcher.out 2>&1 & LPID=$!
start=$(date +%s); wait_ready $LPID && echo "server ready after $(( $(date +%s) - start ))s"; sleep 10
echo "processes with --no-sandbox (pgrep excludes itself): $(pgrep -u "$(id -un)" -fc -- '--no-sandbox')"
echo "extract dir while running: $(ls -d /tmp/appimage_extracted_* 2>/dev/null)"
echo "windows (wmctrl -l):"; wmctrl -l
echo "wmctrl -c autobyteus (WM close request -> WM_DELETE_WINDOW)"; wmctrl -c autobyteus
for i in $(seq 1 60); do kill -0 $LPID 2>/dev/null || break; sleep 1; done
wait $LPID; echo "runtime exit=$? $(( $(date +%s) - start ))s after start"; sleep 2
echo "remaining app processes: $(pgrep -u "$(id -un)" -fc 'appimage_extracted|AppImage')"
echo "extract dir after quit: $(ls -d /tmp/appimage_extracted_* 2>/dev/null || echo removed)"
echo "app.log quit lines:"; grep -nE 'quit|Quit|shutdown|Stopping server|server stopped|exit' "$HOME/.autobyteus/logs/app.log" | tail -8 | cut -c1-200
cp "$HOME/.autobyteus/logs/app.log" /out/new-app-quit.log
fi
if [ -e /probe/ENABLE_OLD_WITH_LIBZ ]; then
  echo; echo "===== B: OLD (legacy runtime) in the same root WITH a temporary libz.so symlink, Ctrl+C stop (comparison only)"
  rm -rf "$HOME/.autobyteus" "$HOME/.config/autobyteus" /tmp/appimage_extracted_*
  setsid /images/old-published-v1.5.14-beta.6.AppImage --appimage-extract-and-run > /out/old-libz-launcher.out 2>&1 & LPID=$!
  start=$(date +%s); wait_ready $LPID && echo "server ready after $(( $(date +%s) - start ))s"; sleep 10
  echo "extract dir while running: $(ls -d /tmp/appimage_extracted_* 2>/dev/null)"
  kill -INT -- -$LPID; for i in $(seq 1 60); do kill -0 $LPID 2>/dev/null || break; sleep 1; done
  wait $LPID; echo "legacy runtime exit=$? after Ctrl+C"; sleep 5
  echo "remaining app processes: $(pgrep -u "$(id -un)" -fc 'appimage_extracted|AppImage')"
  echo "extract dir after Ctrl+C: $(ls -d /tmp/appimage_extracted_* 2>/dev/null || echo removed)"
fi
