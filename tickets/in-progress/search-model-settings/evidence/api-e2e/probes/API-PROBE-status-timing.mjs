// API/E2E probe (ticket evidence, not product code): QR-001 timing of the Embedding section's status on a running node.
// Sends the web panel's exact status document (autobyteus-web/graphql/queries/embeddingSettingsQueries.ts) N times in a
// row and reports first / median / p90 / max, the Project count and the Task total it covered.
// Usage: node API-PROBE-status-timing.mjs <graphqlUrl> <rounds>
const [url, rounds = '20'] = process.argv.slice(2)
const QUERY = `query EmbeddingSettingsStatus {
  embeddingModelsStatus { activeModelId defaultModelId onDiskBytes
    models { id displayName languages downloadBytes file { state done total reason } activeDisplay { state phase done total reason } } }
  projectTaskIndexes { projectId name state done total changed }
}`
const times = []
let last
for (let i = 0; i < Number(rounds); i++) {
  const t0 = performance.now()
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: QUERY }) })
  last = await response.json()
  times.push(performance.now() - t0)
  if (last.errors) throw new Error(JSON.stringify(last.errors))
}
const sorted = [...times].sort((a, b) => a - b)
const projects = last.data.projectTaskIndexes
console.log(JSON.stringify({
  rounds: times.length, ms: { first: Math.round(times[0]), median: Math.round(sorted[sorted.length >> 1]), p90: Math.round(sorted[Math.floor(sorted.length * 0.9)]), max: Math.round(sorted.at(-1)) },
  projects: projects.length, tasks: projects.reduce((sum, p) => sum + (p.total ?? 0), 0),
  states: projects.reduce((acc, p) => ({ ...acc, [p.state]: (acc[p.state] ?? 0) + 1 }), {}),
}))
