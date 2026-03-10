#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  exec /usr/local/bin/open-vnc-browser-url.sh "$@"
fi

exec /usr/bin/xdg-open "$@"
