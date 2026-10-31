#!/bin/bash
# TEMPORARY probe loop (autobyteus-339, FU-008): runs 284's desktop busy-quit probe N times against this worktree's
# instrumented build, on its own throwaway data roots; the user's installed app and data are never touched.
# Usage (repository root): env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" \
#   bash <this file> <iterations> <evidence dir>
set -u
N="$1"; OUT="$2"; mkdir -p "$OUT"
PROBE="$(cd "$(dirname "$0")" && pwd)/P-002-desktop-probe.mjs"
for i in $(seq 1 "$N"); do
  D="$OUT/iter-$i"; mkdir -p "$D"
  node "$PROBE" busy-quit "$D" > "$D/run-stdout.log" 2>&1
  code=$?
  gone=$(grep -o '"label":"busy user quit"[^}]*"serverGoneMs":[0-9]*' "$D/run-stdout.log" | grep -o 'serverGoneMs":[0-9]*' | head -1 | cut -d: -f2)
  echo "iter=$i probeExit=$code serverGoneMs=${gone:-?}" | tee -a "$OUT/summary.txt"
done
