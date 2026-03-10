#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  if [[ "${1:-}" == "--launch" && "${2:-}" == "WebBrowser" ]]; then
    shift 2
  fi
  exec /usr/local/bin/open-vnc-browser-url.sh "$@"
fi

exec /usr/bin/exo-open "$@"
