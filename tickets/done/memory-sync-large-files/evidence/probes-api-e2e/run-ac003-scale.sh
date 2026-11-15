#!/bin/bash
WT=/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files
EV=$WT/tickets/in-progress/memory-sync-large-files/evidence
run() { PATH="/tmp/apie2e-node24/node_modules/.bin:$PATH" node /tmp/apie2e-scripts/ac003-measure.mjs $WT $EV/API-07-$1.json cold $2 > /tmp/apie2e-scripts/ac003r2-$1.out 2>&1; echo "$1 done $(date +%T)" >> /tmp/apie2e-scripts/ac003-progress5.txt; }
: > /tmp/apie2e-scripts/ac003-progress5.txt
run node24-cold-4gib-b 4096
run node24-cold-4gib-c 4096
run node24-cold-8gib-a 8192
run node24-cold-8gib-b 8192
echo ALLDONE >> /tmp/apie2e-scripts/ac003-progress5.txt
