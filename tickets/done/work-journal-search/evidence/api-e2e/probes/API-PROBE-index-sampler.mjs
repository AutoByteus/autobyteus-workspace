// API/E2E probe (ticket evidence, not product code): samples the read-only memoryIndexStatus of a running node, with
// the host load average, as JSON lines. Optionally also times a page-equivalent search each sample (--search "<cue>")
// to watch coverage notes and latency while indexing or live updates run.
// Usage: node API-PROBE-index-sampler.mjs <graphqlUrl> <outFile.jsonl> <intervalMs> <durationMs> [--search "<cue>"]
import fs from 'node:fs'
import os from 'node:os'

const [url, out, interval = '2000', duration = '600000'] = process.argv.slice(2)
const searchAt = process.argv.indexOf('--search')
const cue = searchAt > 0 ? process.argv[searchAt + 1] : null
const STATUS = `query { memoryIndexStatus { state steps { step state done total unit failureMessage } runCount journalFileCount updatedAt
  textIndexHasContent activeModelId meaningIndexModelId meaningNote } }`
const SEARCH = `query($q: String!) { memorySearch(query: $q, limit: 10) { coverage note results { runId matches { matchedBy strength } } } }`
const post = async (query, variables) => {
  const t0 = performance.now()
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const body = await res.json()
  return { ms: Math.round(performance.now() - t0), body }
}
const end = Date.now() + Number(duration)
while (Date.now() < end) {
  const row = { t: new Date().toISOString(), load: os.loadavg().map((x) => Math.round(x * 10) / 10) }
  try {
    const s = await post(STATUS)
    const st = s.body.data?.memoryIndexStatus
    row.statusMs = s.ms
    row.state = st?.state
    row.steps = st?.steps.map((x) => `${x.step}:${x.state}:${x.done}/${x.total}${x.failureMessage ? `:${x.failureMessage}` : ''}`)
    row.runs = st?.runCount; row.files = st?.journalFileCount; row.text = st?.textIndexHasContent
    row.models = [st?.activeModelId, st?.meaningIndexModelId]; row.meaningNote = st?.meaningNote; row.updatedAt = st?.updatedAt
    if (s.body.errors) row.errors = s.body.errors.map((e) => e.message)
    if (cue && st?.textIndexHasContent) {
      const q = await post(SEARCH, { q: cue })
      const r = q.body.data?.memorySearch
      row.search = { ms: q.ms, coverage: r?.coverage ?? null, note: r?.note ?? null, n: r?.results.length,
        top: r?.results.slice(0, 3).map((x) => `${x.runId.slice(0, 12)}:${x.matches.map((m) => `${m.matchedBy}/${m.strength}`).join(',')}`) }
      if (q.body.errors) row.search.errors = q.body.errors.map((e) => e.message)
    }
  } catch (error) { row.error = String(error) }
  fs.appendFileSync(out, `${JSON.stringify(row)}\n`)
  await new Promise((resolve) => setTimeout(resolve, Number(interval)))
}
