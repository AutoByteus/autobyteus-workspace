#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: open-vnc-browser-url.sh <url>" >&2
  exit 1
fi

url="$1"

vnc_uid="$(id -u vncuser 2>/dev/null || true)"
if [[ -z "${vnc_uid}" ]]; then
  echo "open-vnc-browser-url.sh: vncuser account not found" >&2
  exit 1
fi

current_uid="$(id -u)"

open_as_vncuser=(env \
  DISPLAY=:99 \
  XAUTHORITY=/home/vncuser/.Xauthority \
  XDG_RUNTIME_DIR=/run/user/1000 \
  DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus \
  BROWSER= \
  /usr/bin/xdg-open "${url}")

if [[ "${current_uid}" -eq "${vnc_uid}" ]]; then
  exec "${open_as_vncuser[@]}"
fi

if [[ "${current_uid}" -eq 0 ]]; then
  exec runuser -u vncuser -- "${open_as_vncuser[@]}"
fi

echo "open-vnc-browser-url.sh: unsupported uid ${current_uid}; expected root (0) or vncuser (${vnc_uid})" >&2
exit 1
