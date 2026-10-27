// API/E2E probe (ticket evidence, not product code), round 2: the round-1 freshness probe with the SR-006 fields (no strength; matchedWords); exits on a GraphQL error instead of counting it as a miss.
const [url, word, startIso, maxMs='180000'] = process.argv.slice(2)
const Q = `query($q:String!){ memorySearch(query:$q, limit:5){ coverage results { runId matches { journalFileName lineStart lineEnd matchedBy matchedWords } } } }`
const start = Date.parse(startIso); const rows=[]
for (;;) {
  const t0=Date.now()
  const r = await (await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:Q,variables:{q:word}})})).json()
  if (r.errors) { console.error(JSON.stringify(r.errors)); process.exit(2) }
  const hit = r.data?.memorySearch.results.find(x=>x.matches.some(m=>m.matchedBy==='TEXT'))
  rows.push({atMs: t0-start, n: r.data?.memorySearch.results.length, hit: hit ? `${hit.runId} ${hit.matches.map(m=>`${m.journalFileName}:${m.lineStart}-${m.lineEnd} ${m.matchedBy}:${m.matchedWords.join(",")}`).join(';')}` : null})
  if (hit || Date.now()-start > Number(maxMs)) break
  await new Promise(r=>setTimeout(r,1000))
}
const firstHit = rows.find(r=>r.hit)
console.log(JSON.stringify({word, turnEnd:startIso, samples: rows.length, lastMiss: rows.filter(r=>!r.hit).at(-1)?.atMs ?? null, foundAtMs: firstHit?.atMs ?? null, hit: firstHit?.hit ?? null}, null, 1))
