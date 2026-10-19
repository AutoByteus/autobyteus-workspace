// API/E2E probe (ticket evidence): one realistic first-load sequence right after a server start. mode status-cold: the Embedding status is the first request; mode projects-then-status: the Projects list first, then 5 s later the Embedding status (as when a user opens Projects, then Settings). Usage: node API-PROBE-first-load-sequence.mjs <graphqlUrl> <mode>
const [url, mode] = process.argv.slice(2)
const STATUS = `query EmbeddingSettingsStatus { embeddingModelsStatus { activeModelId defaultModelId onDiskBytes models { id displayName languages downloadBytes file { state done total reason } activeDisplay { state phase done total reason } } } projectTaskIndexes { projectId name state done total changed } }`
const PROJECTS = `query GetProjects { projects { projectId name description createdAt updatedAt workspaces { workspaceRootPath displayName description availability } taskCount openTaskCount } }`
const once = async (q) => { const t0 = performance.now(); const r = await (await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors)); return Math.round(performance.now() - t0) }
const out = { mode }
if (mode === 'status-cold') out.statusFirst = await once(STATUS)
else { out.projectsFirst = await once(PROJECTS); await new Promise((r) => setTimeout(r, 5000)); out.statusFirstAfter5s = await once(STATUS) }
out.nextRefresh = await once(STATUS)
console.log(JSON.stringify(out))
