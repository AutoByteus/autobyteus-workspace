#!/bin/bash
cd /tmp/pts-probe
OUT=/tmp/pts-probe/results.jsonl
run() { node scripts/bench.mjs /tmp/pts-probe/deps /tmp/pts-probe/models "$HOME/.autobyteus/server-data" /tmp/pts-probe/eval/queries.json "$@" 2>/dev/null | grep '^{' >> $OUT || echo "{\"failed\":\"$*\"}" >> $OUT; }
for m in jina2s granite arcticxs e5ml nomic gemma; do run $m cpu chunks; done
for m in jina2s granite gemma; do run $m cpu head1024; done
run bge cpu head512
run gemma cpu head2048
for m in bge jina2s gemma; do run $m wasm chunks; done
echo DONE >> $OUT
