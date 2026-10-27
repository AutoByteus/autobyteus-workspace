// API/E2E probe (ticket evidence, not product code), round 2 (no strength labels; wordsNotFound): the page search over a known-answer file through HTTP GraphQL. Prints aggregates and ranks by ID only (private details to --private-out).
// known-answer question file, end to end through the running node's HTTP API. Prints aggregates only (ranks by
// question ID, latency); question texts and snippets stay in the private file given by --private-out.
// Usage: node API-PROBE-graphql-gates.mjs <graphqlUrl> <questions.json> [--rounds 2] [--private-out <file>]
import fs from 'node:fs'
import os from 'node:os'

const [url, questionsFile] = process.argv.slice(2)
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback }
const rounds = Number(arg('--rounds', '2'))
const privateOut = arg('--private-out', null)
const SEARCH = `query($q: String!) { memorySearch(query: $q, limit: 10) { coverage note wordsNotFound results { runId matches { matchedBy matchedWords } } } }`
const questions = JSON.parse(fs.readFileSync(questionsFile, 'utf-8'))
const search = async (q) => {
  const t0 = performance.now()
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: SEARCH, variables: { q } }) })
  const body = await res.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return { ms: performance.now() - t0, r: body.data.memorySearch }
}
const rankOf = (results, accept) => {
  const i = results.findIndex((x) => accept.some((a) => x.runId.startsWith(a)))
  return i < 0 ? null : i + 1
}
const rows = []
const privateRows = []
const loadBefore = os.loadavg()
for (let round = 1; round <= rounds; round++) {
  for (const q of questions) {
    const kind = q.kind ?? ((q.accept ?? []).length ? 'answerable' : 'offTopic')
    const { ms, r } = await search(q.q)
    const row = { round, id: q.id, kind, ms: Math.round(ms), rank: kind === 'answerable' ? rankOf(r.results, q.accept) : null,
      coverage: r.coverage, noteNamesWords: Boolean(r.note) && r.wordsNotFound.length > 0, top: r.results[0]?.matches.map((m) => `${m.matchedBy}:${m.matchedWords.length}`).join(',') ?? null, wordsNotFound: r.wordsNotFound }
    if (kind === 'answerable' && row.rank === null) {
      for (const [k, re] of (q.rephrasings ?? []).entries()) {
        const again = await search(re)
        const rank = rankOf(again.r.results, q.accept)
        if (rank !== null) { row.rephrasedRank = { search: k + 2, rank }; break }
      }
    }
    rows.push(row)
    privateRows.push({ ...row, q: q.q, results: r.results.map((x) => x.runId) })
  }
}
const loadAfter = os.loadavg()
const answerable = rows.filter((x) => x.kind === 'answerable')
const last = answerable.filter((x) => x.round === rounds)
const ms = last.map((x) => x.ms).sort((a, b) => a - b)
const pct = (p) => ms[Math.min(ms.length - 1, Math.ceil(p * ms.length) - 1)]
const summary = {
  url, questions: questions.length, rounds, loadBefore: loadBefore.map((x) => +x.toFixed(1)), loadAfter: loadAfter.map((x) => +x.toFixed(1)),
  lastRound: {
    answerable: last.length,
    oneSearchTop10: last.filter((x) => x.rank !== null && x.rank <= 10).length,
    withinThreeSearches: last.filter((x) => x.rank !== null || x.rephrasedRank).length,
    rank1: last.filter((x) => x.rank === 1).length,
    top3: last.filter((x) => x.rank !== null && x.rank <= 3).length,
    p50Ms: pct(0.5), p90Ms: pct(0.9), maxMs: ms.at(-1),
    answerableNamingWords: last.filter((x) => x.noteNamesWords).map((x) => `${x.id}:${x.wordsNotFound.join("|")}`),
    offTopic: rows.filter((x) => x.round === rounds && x.kind === 'offTopic').map((x) => ({ id: x.id, wordsNotFound: x.wordsNotFound })),
    coverageNotes: rows.filter((x) => x.round === rounds && x.coverage).length,
  },
  ranks: Object.fromEntries(last.map((x) => [x.id, x.rank ?? (x.rephrasedRank ? `#${x.rephrasedRank.rank} at search ${x.rephrasedRank.search}` : 'miss')])),
  firstRoundMs: rows.filter((x) => x.round === 1 && x.kind === 'answerable').map((x) => x.ms),
}
if (privateOut) fs.writeFileSync(privateOut, `${JSON.stringify({ summary, rows: privateRows }, null, 1)}\n`)
console.log(JSON.stringify(summary, null, 1))
