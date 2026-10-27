// API/E2E helper (ticket evidence, not product code), used as /private/tmp/wjs-api/q.mjs during this run
const [url, q, limit='10'] = process.argv.slice(2)
const Q = `query($q:String!,$l:Int){ memorySearch(query:$q, limit:$l){ coverage note results { agent team member runId firstDay latestDay subject { kind runKey runId teamRunId agentRunId } matches { journalFileName lineStart lineEnd day matchedBy strength } } } }`
const t0 = performance.now()
const r = await (await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:Q,variables:{q,l:Number(limit)}})})).json()
const ms = Math.round(performance.now()-t0)
if (r.errors) { console.log(JSON.stringify(r.errors)); process.exit(1) }
const m = r.data.memorySearch
console.log(JSON.stringify({ms, coverage:m.coverage, note:m.note}))
m.results.forEach((x,i)=>console.log(i+1, x.agent, x.team??'', x.runId.slice(0,40), x.subject.kind, x.firstDay+'..'+x.latestDay, x.matches.map(z=>`${z.journalFileName}:${z.lineStart}-${z.lineEnd} ${z.day} ${z.matchedBy}/${z.strength}`).join(' ; ')))
