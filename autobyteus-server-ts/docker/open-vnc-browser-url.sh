#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: open-vnc-browser-url.sh <url>" >&2
  exit 1
fi

url="$1"

exec runuser -u vncuser -- env \
  DISPLAY=:99 \
  XAUTHORITY=/home/vncuser/.Xauthority \
  XDG_RUNTIME_DIR=/run/user/1000 \
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus \
  xdg-open "${url}"
