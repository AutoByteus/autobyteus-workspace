#!/bin/bash
WT=/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files
EV=$WT/tickets/in-progress/memory-sync-large-files/evidence
B=/tmp/apie2e-node24/node_modules/.bin
run() { PATH="$B:$PATH" node /tmp/apie2e-scripts/ac003-measure.mjs $WT $EV/API-07-$1.json $2 $3 > /tmp/apie2e-scripts/ac003r2-$1.out 2>&1; echo "$1 done $(date +%T)" >> /tmp/apie2e-scripts/ac003-progress24.txt; }
: > /tmp/apie2e-scripts/ac003-progress24.txt
run node24-cold-2gib-a cold 2048
run node24-cold-2gib-b cold 2048
run node24-cold-2gib-c cold 2048
run node24-staged30-then-2gib-a staged30-then-big 2048
run node24-staged30-then-2gib-b staged30-then-big 2048
run node24-staged30-then-4gib staged30-then-big 4096
echo ALLDONE >> /tmp/apie2e-scripts/ac003-progress24.txt
