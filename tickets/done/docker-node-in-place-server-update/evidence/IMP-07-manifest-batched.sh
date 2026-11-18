#!/usr/bin/env bash
# Batched manifest of the folder $1: every entry's type, mode and path (and link target),
# then the sha256 of every regular file. LC_ALL=C order. Same output for the same content.
set -euo pipefail
cd "$1"
export LC_ALL=C
find . -mindepth 1 -printf '%y %m %p %l\n' | sort
find . -type f -print0 | sort -z | xargs -0 sha256sum
