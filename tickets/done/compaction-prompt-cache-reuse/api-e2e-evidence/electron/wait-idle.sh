#!/bin/bash
# Waits until the run shows no "Running" state for 3 consecutive checks (auto-approve is on). Approves if asked.
cd "$(dirname "$0")"; export CHROME_REMOTE_DEBUGGING_PORT=49759 BROWSER_AUTOMATION_ATTACH_ONLY=1; idle=0; n=0
while [ $idle -lt 3 ] && [ $n -lt 400 ]; do
  o=$(bash /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser run-script --tab-id "$(cat tab-id)" --script 'async () => { const vis=(e)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}; const a=[...document.querySelectorAll("button")].filter(b=>b.innerText.trim()==="Approve"&&vis(b)); if(a.length){a[0].click();} const stop=[...document.querySelectorAll("button")].some(b=>/stop generation/i.test(b.getAttribute("aria-label")||"")&&vis(b)); return {approve:a.length, running: stop}; }' | python3 -c "import json,sys;print(json.dumps(json.load(sys.stdin)['result']['result']))")
  n=$((n+1)); if echo "$o" | grep -q '"running": false'; then idle=$((idle+1)); else idle=0; fi; sleep 3
done; echo "idle after $n checks: $o"
