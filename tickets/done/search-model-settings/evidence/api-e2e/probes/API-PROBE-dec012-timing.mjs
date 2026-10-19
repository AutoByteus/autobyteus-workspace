// API/E2E probe (ticket evidence, not product code): QR-001 as redefined by DEC-012 on a running node.
// Times the Embedding panel's exact status document (autobyteus-web/graphql/queries/embeddingSettingsQueries.ts) and
// the existing Projects page list (autobyteus-web/graphql/queries/projectQueries.ts, GetProjects with ProjectFields)
// against the same backlog. Run it right after a server start for the "first" (cold) number of whichever query goes
// first; the order is an argument so both cold orders can be measured with a restart in between.
// Usage: node API-PROBE-dec012-timing.mjs <graphqlUrl> <status-first|projects-first> <refreshRounds>
const [url, order = 'status-first', rounds = '10'] = process.argv.slice(2)
const STATUS = `query EmbeddingSettingsStatus {
  embeddingModelsStatus { activeModelId defaultModelId onDiskBytes
    models { id displayName languages downloadBytes file { state done total reason } activeDisplay { state phase done total reason } } }
  projectTaskIndexes { projectId name state done total changed }
}`
const PROJECTS = `query GetProjects { projects { projectId name description createdAt updatedAt
  workspaces { workspaceRootPath displayName description availability } taskCount openTaskCount } }`
const once = async (query) => {
  const t0 = performance.now()
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) })
  const body = await response.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return { ms: Math.round(performance.now() - t0), data: body.data }
}
const series = async (query) => {
  const ms = []
  for (let i = 0; i < Number(rounds); i++) ms.push((await once(query)).ms)
  const s = [...ms].sort((a, b) => a - b)
  return { median: s[s.length >> 1], p90: s[Math.floor(s.length * 0.9)], max: s.at(-1), all: ms }
}
const [firstQuery, secondQuery] = order === 'projects-first' ? [PROJECTS, STATUS] : [STATUS, PROJECTS]
const first = await once(firstQuery)
const secondFirst = await once(secondQuery)
const status = first.data.projectTaskIndexes ? first : secondFirst
const result = {
  order,
  firstRead: { [order === 'projects-first' ? 'projects' : 'status']: first.ms, [order === 'projects-first' ? 'statusAfterProjects' : 'projectsAfterStatus']: secondFirst.ms },
  statusRefresh: await series(STATUS),
  projectsRepeat: await series(PROJECTS),
  backlog: { projects: status.data.projectTaskIndexes.length, tasks: status.data.projectTaskIndexes.reduce((n, p) => n + (p.total ?? 0), 0),
    states: status.data.projectTaskIndexes.reduce((acc, p) => ({ ...acc, [p.state]: (acc[p.state] ?? 0) + 1 }), {}) },
}
console.log(JSON.stringify(result))
