#!/bin/bash
cd /tmp
python3 -c "import json;print('\n'.join(json.load(open('/tmp/wjs-probe/summary-corpus.json'))))" | while read run; do
  d=/tmp/wjs-probe/summaries/qwen_qwen3.6-35b-a3b-skeleton/$(echo $run | sed 's#/#__#g')
  [ -f "$d/run.summary.md" ] && continue
  MODE=skeleton python3 -I /tmp/wjs-probe/summarize.py "$run" >> /tmp/wjs-probe/sum-corpus.log 2>> /tmp/wjs-probe/sum-corpus.err
done
echo ALLDONE >> /tmp/wjs-probe/sum-corpus.log
