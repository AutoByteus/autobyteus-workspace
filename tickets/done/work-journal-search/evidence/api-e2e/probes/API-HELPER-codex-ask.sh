# API/E2E helper (ticket evidence), used as /private/tmp/wjs-api/codex-ask.sh: new Project Task Manager chat on Codex in the isolated instance (CDP), send a question, wait, print the transcript tail
#!/bin/bash
# usage: codex-ask.sh "<question>"  — new Project Task Manager chat on Codex GPT-6.1-Sol (low), send, wait idle, print the transcript tail
P=/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/evidence/api-e2e/probes/API-PROBE-memory-page.mjs
node $P 50688 eval "location.hash='#/agents'; 'ok'" >/dev/null; sleep 3
node $P 50688 eval "(() => { const runs=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim()==='Run'); runs[1]?.click(); return runs.length })()" >/dev/null; sleep 3
node $P 50688 eval "(() => { const b=[...document.querySelectorAll('button')].find(b=>/AutoByteus|Codex/.test(b.innerText) && /GPT|claude|qwen/i.test(b.innerText)); b.click(); return 1 })()" >/dev/null; sleep 1
node $P 50688 click 'text=Codex App Server' >/dev/null; sleep 5
node $P 50688 click "text=${MODEL:-GPT-6.1-Sol (default reasoning: low)}" >/dev/null; sleep 1
echo "model: $(node $P 50688 eval "document.body.innerText.match(/GPT[^\n]*\n?[^\n]*/)?.[0]")"
node $P 50688 fill 'textarea' "$1" >/dev/null
node $P 50688 press 'textarea' Enter
node $P 50688 eval "new Promise(res => { const t0=Date.now(); let last='', since=Date.now(); const tick=()=>{ const txt=(document.querySelector('main')||document.body).innerText; if (txt!==last) { last=txt; since=Date.now() } if ((Date.now()-t0>20000 && Date.now()-since>25000) || Date.now()-t0>420000) res({ms:Date.now()-t0, text: txt.slice(-2600)}); else setTimeout(tick,1500) }; setTimeout(tick,6000) })"
