#!/bin/bash
WT=/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files
EV=$WT/tickets/in-progress/memory-sync-large-files/evidence
run() { PATH="$2:$PATH" node /tmp/apie2e-scripts/ac003-measure.mjs $WT $EV/API-07-$1.json cold 4096 > /tmp/apie2e-scripts/ac003r2-$1.out 2>&1; echo "$1 done $(date +%T)" >> /tmp/apie2e-scripts/ac003-progress4.txt; }
: > /tmp/apie2e-scripts/ac003-progress4.txt
run node24-cold-4gib /tmp/apie2e-node24/node_modules/.bin
run node22-cold-4gib /opt/homebrew/opt/node@22/bin
echo ALLDONE >> /tmp/apie2e-scripts/ac003-progress4.txt
