// API/E2E probe (ticket evidence, not product code): where the Embedding status time goes on a node.
// Times (N rounds each, median / p90 ms): the models root field alone, the Project-indexes root field alone, the panel's
// combined document, and, for comparison, the existing reads the board already makes: `projects` and `projectTasks`
// for every Project (all Task files), which the index status also reads.
// Usage: node API-PROBE-status-breakdown.mjs <graphqlUrl> <rounds>
const [url, rounds = '10'] = process.argv.slice(2)
const gql = async (query, variables = {}) => {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const body = await response.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return body.data
}
const time = async (label, fn) => {
  const ms = []
  for (let i = 0; i < Number(rounds); i++) { const t0 = performance.now(); await fn(); ms.push(performance.now() - t0) }
  const s = [...ms].sort((a, b) => a - b)
  return { label, median: Math.round(s[s.length >> 1]), p90: Math.round(s[Math.floor(s.length * 0.9)]), min: Math.round(s[0]) }
}
const MODELS = 'query{embeddingModelsStatus{activeModelId onDiskBytes models{id file{state} activeDisplay{state}}}}'
const INDEXES = 'query{projectTaskIndexes{projectId name state done total changed}}'
const BOTH = 'query{embeddingModelsStatus{activeModelId onDiskBytes models{id file{state} activeDisplay{state}}} projectTaskIndexes{projectId name state done total changed}}'
const projects = (await gql('query{projects{projectId name}}')).projects
const out = [
  await time('embeddingModelsStatus only', () => gql(MODELS)),
  await time('projectTaskIndexes only', () => gql(INDEXES)),
  await time('panel document (both)', () => gql(BOTH)),
  await time('projects list', () => gql('query{projects{projectId name}}')),
  await time(`projectTasks for all ${projects.length} Projects (taskId, description, updatedAt), sequential`, async () => {
    for (const p of projects) await gql('query($p:String!){projectTasks(projectId:$p){taskId description updatedAt}}', { p: p.projectId })
  }),
]
console.log(JSON.stringify({ projects: projects.length, rounds: Number(rounds), timings: out }, null, 1))
