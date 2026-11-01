#!/usr/bin/env bash
# Prints one line per entry under $1: type, mode, path, and sha256 or link target.
set -euo pipefail
cd "$1"
find . -mindepth 1 -print0 | LC_ALL=C sort -z | while IFS= read -r -d '' p; do
  if [[ -L "$p" ]]; then printf 'l %s %s -> %s\n' "$(stat -c %a "$p")" "$p" "$(readlink "$p")"
  elif [[ -d "$p" ]]; then printf 'd %s %s\n' "$(stat -c %a "$p")" "$p"
  else printf 'f %s %s %s\n' "$(stat -c %a "$p")" "$p" "$(sha256sum < "$p" | cut -c1-64)"; fi
done
