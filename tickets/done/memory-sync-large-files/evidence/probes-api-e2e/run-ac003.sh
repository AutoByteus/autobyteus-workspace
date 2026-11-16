#!/bin/bash
WT=/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files
EV=$WT/tickets/in-progress/memory-sync-large-files/evidence
N22=/opt/homebrew/opt/node@22/bin
run() { # label nodebin scenario size
  PATH="$2:$PATH" node /tmp/apie2e-scripts/ac003-measure.mjs $WT $EV/API-07-$1.json $3 $4 > /tmp/apie2e-scripts/ac003r2-$1.out 2>&1
  echo "$1 done $(date +%T)" >> /tmp/apie2e-scripts/ac003-progress.txt
}
: > /tmp/apie2e-scripts/ac003-progress.txt
for n in 22 26; do
  if [ $n = 22 ]; then B=$N22; else B=/opt/homebrew/bin; fi
  run node$n-cold-2gib-a $B cold 2048
  run node$n-cold-2gib-b $B cold 2048
  run node$n-cold-2gib-c $B cold 2048
  run node$n-staged30-then-2gib-a $B staged30-then-big 2048
  run node$n-staged30-then-2gib-b $B staged30-then-big 2048
  run node$n-staged30-then-4gib $B staged30-then-big 4096
done
echo ALLDONE >> /tmp/apie2e-scripts/ac003-progress.txt
