#!/bin/bash
# Approve every pending tool call like a user until the run is idle (3 consecutive idle checks). Logs each step.
cd "$(dirname "$0")"; LOG=${1:-steps.log}; idle=0; n=0
while [ $idle -lt 3 ] && [ $n -lt 600 ]; do
  out=$(./run-step.sh false); n=$((n+1)); echo "$(date +%H:%M:%S) $out" >> "$LOG"
  if echo "$out" | grep -q '"running": false' && echo "$out" | grep -q '"approvesVisible": 0'; then idle=$((idle+1)); else idle=0; fi
  sleep 3
done
echo "done after $n steps" >> "$LOG"
