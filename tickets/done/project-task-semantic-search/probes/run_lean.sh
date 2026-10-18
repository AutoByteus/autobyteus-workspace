#!/bin/bash
cd /tmp/pts-probe
OUT=/tmp/pts-probe/lean-results.jsonl
M=/tmp/pts-probe/models/onnx-community/granite-embedding-small-english-r2-ONNX
D="$HOME/.autobyteus/server-data"
Q=/tmp/pts-probe/eval/queries.json
for th in 1 4 8; do node scripts/lean.mjs /tmp/pts-probe/deps2 $M "$D" $Q $th 1024 2>/dev/null | grep '^{' >> $OUT; done
DUMP=/tmp/pts-probe/dump-granite-whole1024.json node scripts/lean.mjs /tmp/pts-probe/deps2 $M "$D" $Q 4 1024 2>/dev/null | grep '^{' >> $OUT
node scripts/lean.mjs /tmp/pts-probe/deps2 $M "$D" $Q 4 512 2>/dev/null | grep '^{' >> $OUT
DUMP=/tmp/pts-probe/dump-granite-chunked.json node scripts/lean.mjs /tmp/pts-probe/deps2 $M "$D" $Q 4 512 chunked 2>/dev/null | grep '^{' >> $OUT
node scripts/bench.mjs /tmp/pts-probe/deps /tmp/pts-probe/models "$D" $Q granite cpu head1024 2>/dev/null | grep '^{' >> $OUT
echo DONE >> $OUT
