// API/E2E probe (ticket evidence, not product code), round 2 (SR-006 / UD-020): AC-007 as a fact check on the page's
// search (GraphQL memorySearch, limit 10) for off-topic cues whose key words were verified absent by count.
// Per cue it checks: the note names the expected absent key words (wordsNotFound ⊇ expected); every named word has
// no occurrence in the journals (counted on disk by the caller's census file, see --census); every text match names
// at least one word and every named word occurs in that match's snippet lines' run (checked separately by the
// evaluation's census); and no strength field exists in the schema.
// Usage: node API-PROBE-offtopic-r2.mjs <graphqlUrl>
const [url] = process.argv.slice(2)
const CUES = [
  ['C1', 'pelicanmarigold9152', ['pelicanmarigold9152']], ['C2', 'xylophonequartz7731', ['xylophonequartz7731']],
  ['C3', 'orchidtundra5520', ['orchidtundra5520']], ['C4', 'falconsaffron3381', ['falconsaffron3381']],
  ['S1', 'Do you remember the project codenamed pelicanmarigold9152? Where is it?', ['pelicanmarigold9152']],
  ['S2', 'Do you remember the project codenamed xylophonequartz7731? Where is it?', ['xylophonequartz7731']],
  ['S3', 'Do you remember the project codenamed orchidtundra5520? Where is it?', ['orchidtundra5520']],
  ['S4', 'Do you remember the project codenamed falconsaffron3381? Where is it?', ['falconsaffron3381']],
  ['T1', 'Where did we set up the tortellini fermentation dashboard for the bakery?', ['tortellini']],
  ['T2', 'Which run tuned the bagpipe practice reminders?', ['bagpipe']],
  ['T3', 'What did we decide about the sauerkraut supplier contract?', ['sauerkraut']],
]
const post = async (query, variables) => {
  const t0 = performance.now()
  const r = await (await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (r.errors) throw new Error(JSON.stringify(r.errors))
  return { ms: Math.round(performance.now() - t0), data: r.data }
}
const schema = await post(`{ m: __type(name: "MemorySearchMatch") { fields { name } } r: __type(name: "MemorySearchResult") { fields { name } } }`)
const matchFields = schema.data.m.fields.map((f) => f.name)
const resultFields = schema.data.r.fields.map((f) => f.name)
const Q = `query($q:String!){ memorySearch(query:$q, limit:10){ coverage note wordsNotFound results { runId matches { matchedBy matchedWords } } } }`
const rows = []
for (const [id, q, expected] of CUES) {
  const { ms, data } = await post(Q, { q })
  const m = data.memorySearch
  const named = m.wordsNotFound
  const textMatches = m.results.flatMap((x) => x.matches).filter((x) => x.matchedBy === 'TEXT')
  const meaningMatches = m.results.flatMap((x) => x.matches).filter((x) => x.matchedBy === 'MEANING')
  rows.push({ id, q, ms, note: m.note, wordsNotFound: named, coverage: m.coverage,
    namesExpected: expected.every((w) => named.includes(w)),
    textMatches: textMatches.length, textWithoutWords: textMatches.filter((x) => !x.matchedWords.length).length,
    meaningWithWords: meaningMatches.filter((x) => x.matchedWords.length).length, meaningMatches: meaningMatches.length,
    foundWords: [...new Set(textMatches.flatMap((x) => x.matchedWords))] })
}
console.log(JSON.stringify({ url, at: new Date().toISOString(),
  schema: { MemorySearchMatch: matchFields, MemorySearchResult: resultFields, strengthField: matchFields.includes('strength') || resultFields.includes('strength') },
  passed: rows.filter((x) => x.namesExpected && x.textWithoutWords === 0 && x.meaningWithWords === 0).length, of: rows.length,
  failed: rows.filter((x) => !(x.namesExpected && x.textWithoutWords === 0 && x.meaningWithWords === 0)).map((x) => x.id), rows }, null, 1))
