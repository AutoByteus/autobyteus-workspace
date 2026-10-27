// API/E2E probe (ticket evidence, not product code): off-topic cues (key words verified by count to occur in no local
// journal) through the page's search (GraphQL memorySearch, limit 10). AC-007 / R-009: such a cue must end with the
// only-weak note, every match weak. Prints, per cue, the note, the coverage and the strength counts by tier.
// Usage: node API-PROBE-offtopic.mjs <graphqlUrl>
const [url] = process.argv.slice(2)
const CUES = [
  // codename-like words, alone
  ['C1', 'pelicanmarigold9152'], ['C2', 'xylophonequartz7731'], ['C3', 'orchidtundra5520'], ['C4', 'falconsaffron3381'],
  // the same codenames in the sentence an agent or a user would ask
  ['S1', 'Do you remember the project codenamed pelicanmarigold9152? Where is it?'],
  ['S2', 'Do you remember the project codenamed xylophonequartz7731? Where is it?'],
  ['S3', 'Do you remember the project codenamed orchidtundra5520? Where is it?'],
  ['S4', 'Do you remember the project codenamed falconsaffron3381? Where is it?'],
  // absent topics in plain words
  ['T1', 'Where did we set up the tortellini fermentation dashboard for the bakery?'],
  ['T2', 'Which run tuned the bagpipe practice reminders?'],
  ['T3', 'What did we decide about the sauerkraut supplier contract?'],
]
const Q = `query($q:String!){ memorySearch(query:$q, limit:10){ coverage note results { runId matches { matchedBy strength } } } }`
const rows = []
for (const [id, q] of CUES) {
  const t0 = performance.now()
  const r = await (await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: Q, variables: { q } }) })).json()
  if (r.errors) throw new Error(JSON.stringify(r.errors))
  const m = r.data.memorySearch
  const counts = {}
  for (const res of m.results) for (const x of res.matches) counts[`${x.matchedBy}/${x.strength}`] = (counts[`${x.matchedBy}/${x.strength}`] ?? 0) + 1
  const pass = Boolean(m.note) && m.results.every((res) => res.matches.every((x) => x.strength === 'WEAK'))
  rows.push({ id, q, ms: Math.round(performance.now() - t0), onlyWeakNote: Boolean(m.note), pass, results: m.results.length, counts, coverage: m.coverage })
}
console.log(JSON.stringify({ url, at: new Date().toISOString(), passed: rows.filter((x) => x.pass).length, of: rows.length, failed: rows.filter((x) => !x.pass).map((x) => x.id), rows }, null, 1))
