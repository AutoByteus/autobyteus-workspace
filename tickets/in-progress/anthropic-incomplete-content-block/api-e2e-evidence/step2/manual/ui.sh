#!/usr/bin/env bash
# Drives the isolated AutoByteus window (iso-55100-137c) like a user: open a run, type, send, wait, capture.
set -uo pipefail
B=/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser
export CHROME_REMOTE_DEBUGGING_PORT=55100 BROWSER_AUTOMATION_ATTACH_ONLY=1
M=/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/api-e2e-evidence/step2/manual
cd "$M"
tab() { bash "$B" list-tabs | python3 -c "import json,sys;print(json.load(sys.stdin)['result']['tabs'][0]['tab_id'])"; }
js() { bash "$B" run-script --tab-id "$(tab)" --script "$1" 2>&1 | python3 -c "import json,sys
d=json.load(sys.stdin)
r=d.get('result',{}).get('result',d)
print(r if isinstance(r,str) else json.dumps(r))"; }
open_run() { # clicks the run's sidebar row (expanding the workspace / agent group first) and verifies the route
  local out; out=$(js "async () => { const sel = 'button[class*=\"run-row\"][data-run-id=\"$1\"]';
    const visible = () => { const b = document.querySelector(sel); return b && b.offsetParent !== null; };
    if (!visible()) { await __abDemo.click({ text: 'olr-manual-ws-jZMxBi' }); await new Promise(x=>setTimeout(x,1200)); }
    if (!visible()) { await __abDemo.click({ text: 'Data Engineer', nth: 0 }); await new Promise(x=>setTimeout(x,1200)); }
    const r = visible() ? await __abDemo.click({ selector: sel }) : { ok: false };
    await new Promise(x=>setTimeout(x,2500));
    return JSON.stringify({ clicked: r.ok, opened: location.hash.includes('$1'), hash: location.hash }); }")
  echo "$out"; echo "$out" | grep -q '"opened": *true' || { echo "OPEN_FAILED $1"; exit 3; }; }
send() { # $1 = message text (no single quotes)
  js "async () => { const ta = document.querySelector('textarea'); if (!ta) return 'NO_TEXTAREA';
    await __abDemo.type({ selector: 'textarea' }, '$1', { delayMs: 0 });
    await new Promise(x=>setTimeout(x,300));
    const r = await __abDemo.click({ selector: 'button[aria-label=\"Send message\"]' }); return r.ok ? 'SENT' : JSON.stringify(r.error); }"; }
status() { js "async () => { const m = document.body.innerText.match(/\\n(Idle|Running|Thinking|Processing|Working|Initializing|Offline|Error|Waiting[^\\n]*)\\n/); return m ? m[1] : 'UNKNOWN'; }"; }
wait_idle() { # $1 = timeout seconds
  local t0=$(date +%s) s; sleep 6
  while true; do s=$(status); [ "$s" = "Idle" ] && { echo "IDLE after $(( $(date +%s)-t0 ))s"; return 0; }
    [ $(( $(date +%s)-t0 )) -gt "$1" ] && { echo "TIMEOUT status=$s"; return 1; }; sleep 5; done; }
shot() { bash "$B" screenshot --tab-id "$(tab)" --output-file "$1" --viewport-only --overwrite >/dev/null 2>&1; echo "shot $1"; }
convo() { js "async () => { const main = document.querySelector('main') || document.body; return main.innerText.slice(-${1:-4000}); }"; }
"$@"
