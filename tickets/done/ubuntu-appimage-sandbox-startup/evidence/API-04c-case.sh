#!/bin/bash
# Run in normal disposable Ubuntu user session. PORTable guest has no protected installation.
set -euo pipefail
mode=$1; export DISPLAY=:91
if curl -fsS --max-time 1 localhost:29695/rest/health >/dev/null 2>&1;then echo "stale fixture server";exit 1;fi
Xvfb :91 -screen 0 1280x900x24 -nolisten tcp >xvfb.log 2>&1 & xv=$!
trap 'kill "$xv" ${wm:-} ${feed:-} ${agent:-} 2>/dev/null || true' EXIT
for n in {1..80}; do xdotool getdisplaygeometry >/dev/null 2>&1 && break; sleep .1;done
openbox >openbox.log 2>&1 & wm=$!
python3 -u -m http.server 18889 --bind 127.0.0.1 --directory feed >feed.log 2>&1 & feed=$!
/usr/lib/policykit-1-gnome/polkit-gnome-authentication-agent-1 >polkit.log 2>&1 & agent=$!
if [[ $mode == direct ]];then
 ./Renamed.AppImage --remote-debugging-port=18990 >app.log 2>&1 &
elif [[ $mode == installedmenu ]];then
 gtk-launch autobyteus-managed >app.log 2>&1
elif [[ $mode == menu ]];then
 gtk-launch validation-portable >app.log 2>&1
else
 ./Renamed.AppImage --remote-debugging-port=18990 >app.log 2>&1 &
fi
if [[ $mode == consent ]];then
 timeout 80 xdotool search --sync --onlyvisible --name '^Install AutoByteus$' >/dev/null
 xdotool mousemove 778 583 click 1
fi
timeout 100 bash -c 'until curl -fsS http://127.0.0.1:29695/rest/health 2>/dev/null;do sleep .6;done'
echo
timeout 20 xdotool search --sync --onlyvisible --name '^autobyteus$' getwindowname
# Filter /proc by the actual packaged executable and renderer type, not arbitrary process titles.
python3 - <<'PY'
from pathlib import Path
import os,re
for p in Path('/proc').glob('[0-9]*'):
 try:
  argv=(p/'cmdline').read_bytes().replace(b'\0',b' ').split()
  if b'--type=renderer' not in argv or not argv[0].endswith(b'/autobyteus'):continue
  assert b'--no-sandbox' not in argv
  s=(p/'status').read_text()
  assert re.search('^Seccomp:\\s+2$',s,re.M) and re.search('^NoNewPrivs:\\s+1$',s,re.M)
  ids=re.search(r'^NSpid:\s+(.*)$',s,re.M).group(1).split()
  assert len(ids)>=2, ids
  print('renderer',p.name,'Seccomp=2 NoNewPrivs=1 and nested PID namespace',ids);break
 except (PermissionError,FileNotFoundError):pass
else: raise Exception('No inspected renderer or permission to read its namespaces')
PY
import -window root "$mode.png"
echo 'feed log'; cat feed.log
if [[ $mode != consent ]];then ! grep -q 'GET ' feed.log; fi
if [[ $mode == direct || $mode == menu ]];then test ! -d /opt/autobyteus-desktop/1000; else test -d /opt/autobyteus-desktop/1000;fi
xdotool windowactivate --sync "$(xdotool search --onlyvisible --name '^autobyteus$'|head -1)" key alt+F4
timeout 60 bash -c 'while curl -fsS localhost:29695/rest/health >/dev/null 2>&1;do sleep .5;done'
