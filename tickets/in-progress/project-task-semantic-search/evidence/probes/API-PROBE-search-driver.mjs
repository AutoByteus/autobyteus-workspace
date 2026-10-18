// API/E2E probe (ticket evidence, not product code): drives a running AutoByteus server's public GraphQL API for the
// Project Task search validation (seed data, search, readiness polling, quality and latency measurement).
// Usage: node API-PROBE-search-driver.mjs <graphqlUrl> <command> [...args]
//   seed <projectName> <rep60|backlog1000|backlog1000long> <backlog.json> <out-map.json>
//   search <projectId> <query>
//   until <projectId> <query> <READY|UNAVAILABLE|SETTLED> <timeoutSec>   (logs every readiness change with elapsed time)
//   quality <projectId> <map.json> <backlog.json>                         (all paraphrases + unrelated sets)
//   latency <projectId> <backlog.json> <rounds>                           (timed searches, p50/p90/max)
import fs from 'node:fs'

const [url, command, ...args] = process.argv.slice(2)
const SEARCH = 'query($p:String!,$q:String!){searchProjectTasks(projectId:$p,query:$q){matches{taskId match} meaningSearch{state phase done total reason}}}'
const gql = async (query, variables = {}) => {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const body = await response.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return body.data
}
const search = async (projectId, q) => (await gql(SEARCH, { p: projectId, q })).searchProjectTasks
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const quantile = (values, q) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }

if (command === 'seed') {
  const [name, set, backlogFile, outFile] = args
  const backlog = JSON.parse(fs.readFileSync(backlogFile, 'utf8'))
  const tasks = set === 'rep60' ? backlog.targets : set === 'backlog1000' ? [...backlog.targets, ...backlog.distractors]
    : set === 'backlog1000long' ? [...backlog.targetsLong, ...backlog.distractors] : null
  if (!tasks) throw new Error(`unknown set ${set}`)
  const { projectId } = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name } })).createProject
  const map = { projectId, set, tasks: {} }
  const started = Date.now()
  // Distractors first, targets last, so targets are not simply the oldest Tasks.
  const ordered = set === 'rep60' ? tasks : [...tasks.filter((t) => t.id.startsWith('d')), ...tasks.filter((t) => !t.id.startsWith('d'))]
  for (const task of ordered) {
    const created = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}', { i: { projectId, description: task.description } })).createProjectTask
    map.tasks[task.id] = { taskId: created.taskId, taskKey: created.taskKey, status: task.status }
  }
  fs.writeFileSync(outFile, JSON.stringify(map, null, 1))
  console.log(JSON.stringify({ projectId, created: ordered.length, seconds: (Date.now() - started) / 1000 }))
} else if (command === 'search') {
  const [projectId, q] = args
  const t0 = performance.now()
  const result = await search(projectId, q)
  console.log(JSON.stringify({ ms: Math.round(performance.now() - t0), ...result }))
} else if (command === 'until') {
  const [projectId, q, want, timeoutSec] = args
  const started = Date.now()
  let last = ''
  for (;;) {
    const t0 = performance.now()
    const result = await search(projectId, q)
    const ms = Math.round(performance.now() - t0)
    const m = result.meaningSearch
    const key = `${m.state}/${m.phase ?? ''}`
    const elapsed = (Date.now() - started) / 1000
    if (key !== last || (m.phase === 'INDEXING' && Math.floor(elapsed) % 10 === 0)) {
      console.log(JSON.stringify({ t: elapsed, ms, ...m, matches: result.matches.length, kinds: result.matches.map((x) => x.match[0]).join('') }))
      last = key
    }
    const done = want === 'SETTLED' ? m.state !== 'PREPARING' : m.state === want
    if (done) { console.log(JSON.stringify({ final: true, t: elapsed, ms, ...result })); break }
    if (elapsed > Number(timeoutSec)) { console.log(JSON.stringify({ timeout: true, t: elapsed, ...m })); process.exitCode = 1; break }
    await sleep(1000)
  }
} else if (command === 'quality') {
  const [projectId, mapFile, backlogFile] = args
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'))
  const backlog = JSON.parse(fs.readFileSync(backlogFile, 'utf8'))
  const byTaskId = Object.fromEntries(Object.entries(map.tasks).map(([id, t]) => [t.taskId, id]))
  const rows = []
  for (const { q, targets } of backlog.paraphrases) {
    const result = await search(projectId, q)
    if (result.meaningSearch.state !== 'READY') throw new Error(`not ready: ${JSON.stringify(result.meaningSearch)}`)
    const ids = result.matches.map((m) => byTaskId[m.taskId])
    const rank = ids.findIndex((id) => targets.includes(id))
    rows.push({ q, targets, rank: rank < 0 ? null : rank + 1, matches: ids.length, top: ids.slice(0, 5), kinds: result.matches.map((m) => m.match[0]).join('') })
  }
  const unrelated = async (list) => {
    const out = []
    for (const q of list) {
      const result = await search(projectId, q)
      out.push({ q, matches: result.matches.length, top: result.matches.slice(0, 3).map((m) => byTaskId[m.taskId]), kinds: result.matches.map((m) => m.match[0]).join('') })
    }
    return out
  }
  const fixtureUnrelated = await unrelated(backlog.unrelated)
  const extendedUnrelated = await unrelated(backlog.unrelatedExtended)
  const shownTop5 = rows.filter((r) => r.rank !== null && r.rank <= 5).length
  const shown = rows.filter((r) => r.rank !== null).length
  console.log(JSON.stringify({
    projectId, set: map.set, tasks: Object.keys(map.tasks).length,
    summary: {
      paraphrases: rows.length, targetShownInFirst5: shownTop5, targetShownInFirst5Pct: +(100 * shownTop5 / rows.length).toFixed(1),
      targetShownAtAll: shown, targetShownPct: +(100 * shown / rows.length).toFixed(1),
      matchCount: { p50: quantile(rows.map((r) => r.matches), 0.5), p90: quantile(rows.map((r) => r.matches), 0.9), max: Math.max(...rows.map((r) => r.matches)) },
      fixtureUnrelatedNoMatch: fixtureUnrelated.filter((u) => u.matches === 0).length, fixtureUnrelated: fixtureUnrelated.length,
      extendedUnrelatedNoMatch: extendedUnrelated.filter((u) => u.matches === 0).length, extendedUnrelated: extendedUnrelated.length,
    },
    misses: rows.filter((r) => r.rank === null || r.rank > 5),
    unrelatedWithMatches: extendedUnrelated.filter((u) => u.matches > 0),
    rows,
  }, null, 1))
} else if (command === 'latency') {
  const [projectId, backlogFile, rounds] = args
  const backlog = JSON.parse(fs.readFileSync(backlogFile, 'utf8'))
  const queries = [...backlog.paraphrases.map((p) => p.q), 'docker', 'sidebar', 'restart', ...backlog.unrelated]
  const times = []
  for (let r = 0; r < Number(rounds); r++) {
    for (const q of queries) {
      const t0 = performance.now()
      const result = await search(projectId, q)
      times.push(performance.now() - t0)
      if (result.meaningSearch.state !== 'READY') throw new Error('not ready')
    }
  }
  console.log(JSON.stringify({ projectId, searches: times.length, ms: { p50: Math.round(quantile(times, 0.5)), p90: Math.round(quantile(times, 0.9)), p99: Math.round(quantile(times, 0.99)), max: Math.round(Math.max(...times)) } }))
} else {
  throw new Error(`unknown command ${command}`)
}
