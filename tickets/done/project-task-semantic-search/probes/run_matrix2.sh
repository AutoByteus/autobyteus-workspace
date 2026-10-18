#!/bin/bash
cd /tmp/pts-probe
OUT=/tmp/pts-probe/results2.jsonl
for m in leafir granite_s_r2 granite97m egemma2 harrier270 voyage4nano jina5nano gtemodernbert egemma1 egemma2_q8 qwen3_06b; do
  node scripts/bench2.mjs /tmp/pts-probe/deps /tmp/pts-probe/models "$HOME/.autobyteus/server-data" eval/queries70.json eval/offtopic.json $m dumps 2>/tmp/pts-probe/err-$m.log | grep '^{' >> $OUT || echo "{\"failed\":\"$m\"}" >> $OUT
done
echo DONE >> $OUT
