#!/usr/bin/env node
// Desktop AC-013 / REQ-012 check (agent-initiated-collaborators round 3) on an isolated instance with the public package:
// - Org (Software Development Department): /software_engineering_team/solution_designer delegates /marketing_team
//   (top-level → Org top level) and its teammate /software_engineering_team/code_reviewer (stays in the team).
// - Agent root: a PM brings in Software Engineering Team; its solution designer delegates /product_team (top level)
//   and /software_engineering_team/code_reviewer (stays in the collaborator team).
// Rows are checked in the desktop tree: level from the accessible label, "Started by" only in the label.
// Usage (from autobyteus-server-ts so ws and playwright-core resolve via the web package):
//   node <file> --control-port <n> --backend <url>
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const WebSocket = require('ws')
const { chromium } = createRequire(path.join(process.cwd(), '..', 'autobyteus-web', 'package.json'))('playwright-core')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
const backend = arg('backend'); const controlPort = arg('control-port')
const outDir = path.dirname(fileURLToPath(import.meta.url))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const report = { checks: [], rows: {} }
const check = (ok, label, details) => { report.checks.push({ ok: Boolean(ok), label, details: details ?? null }); console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` ${JSON.stringify(details ?? null).slice(0, 600)}`}`) }
const waitFor = async (label, fn, timeout = 600000, interval = 1000) => {
  const start = Date.now(); let last
  while (Date.now() - start < timeout) { try { last = await fn(); if (last) return last } catch (e) { last = e.message } await delay(interval) }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(last).slice(0, 300)}`)
}
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data
}
const socket = async (urlPath) => {
  const ws = new WebSocket(`${backend.replace('http', 'ws')}${urlPath}`)
  const frames = []
  ws.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j) })
  return { ws, frames }
}
const operator = (tool, args) => `Call ${tool} exactly once now with these exact JSON arguments: ${JSON.stringify(args)}. Do not call any other tool. Then reply with the single word DONE.`
const send = (conn, kind, root, target, content) => { const id = `aic-${randomUUID()}`; conn.ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: kind, root_run_id: root, target_agent_run_id: target, command_id: `cmd-${id}`, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:placement:${id}` } })) }
const started = (frames, delegator, address) => frames.map((f) => f.type === 'ROOT_EXECUTION_EVENT' && f.payload?.event?.kind === 'task_execution_started' ? f.payload.event.execution : null)
  .find((x) => x && x.delegatorAgentRunId === delegator && x.address === address)
const models = (await gql('query($r:String){ providerModelCatalogSnapshots(runtimeKind:$r){ llmModels { modelIdentifier } } }', { r: 'claude_agent_sdk' })).providerModelCatalogSnapshots.flatMap((x) => x.llmModels.map((m) => m.modelIdentifier))
const model = models.includes('haiku') ? 'haiku' : models[0]
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'aic-placement-ws-'))

// ---- Org root
const orgRunId = (await gql('mutation($i: CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}', { i: { agentOrgDefinitionId: 'software-development-department',
  rootConfiguration: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, workspaceRootPath: workspace }, agentOverrides: [] } })).createAgentOrgRun.agentOrgRunId
const org = await socket(`/ws/agent-org/${orgRunId}`)
const snap = await waitFor('org snapshot', async () => org.frames.find((f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT'), 60000, 300)
const ids = new Map(); const visit = (ms) => { for (const m of ms ?? []) { if (m.agentRunId) ids.set(m.address, m.agentRunId); visit(m.members) } }; visit(snap.payload.root_org.execution_tree.rootOrg.members)
const designer = ids.get('/software_engineering_team/solution_designer')
send(org, 'agent_org', orgRunId, designer, operator('delegate_task', { recipient_address: '/marketing_team', description: 'Reply in one sentence about a dark-mode announcement. Text only, no files, publish nothing.' }))
const orgTop = await waitFor('Org top-level copy', async () => started(org.frames, designer, '/marketing_team'))
send(org, 'agent_org', orgRunId, designer, operator('delegate_task', { recipient_address: '/software_engineering_team/code_reviewer', description: 'Reply with the single word NOTED. No tools, no files.' }))
const orgMate = await waitFor('Org teammate copy', async () => started(org.frames, designer, '/software_engineering_team/code_reviewer'))
report.org = { orgRunId, top: orgTop.teamRunId, mate: orgMate.agentRunId }

// ---- Agent root
const pmId = (await gql('{ agentDefinitions { id name } }')).agentDefinitions.find((d) => d.name === 'Project Manager')?.id
  ?? (await gql('mutation($i: CreateAgentDefinitionInput!){ createAgentDefinition(input:$i){ id } }', { i: { name: 'Project Manager', description: 'Plans work and hands it to agents and teams.',
    instructions: 'You are a precise project manager. Follow the user\'s instructions exactly and keep every reply to one short sentence.', toolNames: ['list_available_agents'] } })).createAgentDefinition.id
const pmRunId = (await gql('mutation($i: CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: pmId, workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: 'claude_agent_sdk' } })).createAgentRun.runId
const pm = await socket(`/ws/agent/${pmRunId}`); await delay(1500)
pm.ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: operator('send_message_to', { recipient_address: '/software_engineering_team', content: 'Solution designer: reply with the single word READY. No tools, no files.' }), context_file_paths: [], image_urls: [], message_id: `m-${randomUUID()}`, dedupe_key: `agent_run_input:placement:${randomUUID()}`, command_id: randomUUID() } }))
const view = async () => (await gql('query($id:String!){ agentRunCollaboration(runId:$id) }', { id: pmRunId })).agentRunCollaboration.root_agent
const seTeam = await waitFor('SE team brought in', async () => (await view())?.execution_tree.collaborators.find((c) => c.address === '/software_engineering_team'))
const seDesigner = seTeam.members.find((m) => m.address.endsWith('/solution_designer')).agentRunId
await delay(20000)
const collab = await socket(`/ws/agent-collaboration/${pmRunId}`); await delay(1500)
send(collab, 'agent', pmRunId, seDesigner, operator('delegate_task', { recipient_address: '/product_team', description: 'Reply in one sentence about a login screen. Text only, no files.' }))
send(collab, 'agent', pmRunId, seDesigner, operator('delegate_task', { recipient_address: '/software_engineering_team/code_reviewer', description: 'Reply with the single word NOTED. No tools, no files.' }))
const agentCopies = await waitFor('Agent-root copies', async () => {
  const all = []; const v = (x) => { if (Array.isArray(x)) return x.forEach(v); if (!x || typeof x !== 'object') return; if (x.delegatorAgentRunId === seDesigner) all.push(x); Object.values(x).forEach(v) }
  v((await view()).execution_tree); return all.length >= 2 ? all : null
})
report.agent = { pmRunId, copies: agentCopies.map((c) => [c.address, c.teamRunId ?? c.agentRunId]) }
await delay(15000)
org.ws.close(); pm.ws.close(); collab.ws.close()

// ---- Desktop tree
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => /renderer\/index\.html/.test(p.url()))
await page.reload({ waitUntil: 'domcontentloaded' }); await delay(6000)
await page.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/workspace')); await delay(3000)
const wsName = path.basename(workspace)
await page.locator('[data-test="workspace-row"]').filter({ hasText: wsName }).first().click(); await delay(2000)
for (let i = 0; i < 25; i++) {
  const collapsed = page.locator('[data-test="workspace-row"]').filter({ hasText: wsName }).first().locator('xpath=ancestor::*[3]').locator('[aria-expanded="false"]')
  const n = await collapsed.count().catch(() => 0)
  if (!n) break
  await collapsed.first().click().catch(() => {}); await delay(1200)
}
const rowsFor = async (address) => page.evaluate((a) => [...document.querySelectorAll('[aria-label]')]
  .filter((e) => (e.getAttribute('aria-label') ?? '').includes(`, ${a},`) || (e.getAttribute('aria-label') ?? '').endsWith(a) || (e.getAttribute('aria-label') ?? '').includes(`, ${a}`))
  .map((e) => ({ label: e.getAttribute('aria-label'), text: e.innerText.replace(/\s+/g, ' ').trim() })), address)
for (const [key, address] of [['marketing', '/marketing_team'], ['product', '/product_team'], ['codeReviewer', '/software_engineering_team/code_reviewer']]) report.rows[key] = await rowsFor(address)
const level = (row) => Number((row.label.match(/level (\d+)/) ?? [])[1] ?? NaN)
const copyRow = (rows) => rows.find((r) => /Started by/i.test(r.label))
const mk = copyRow(report.rows.marketing); const pt = copyRow(report.rows.product); const crs = report.rows.codeReviewer.filter((r) => /Started by/i.test(r.label))
check(mk && level(mk) === 1, 'Org: the solution designer\'s /marketing_team copy is shown at the Org top level (level 1)', mk)
check(pt && level(pt) === 1, 'Agent root: the SE team member\'s /product_team copy is shown at the run\'s top level (level 1)', pt)
check(crs.length >= 2 && crs.every((r) => level(r) >= 2), 'teammate copies (code reviewer) stay inside their team (level ≥ 2) in both runs', crs)
check([mk, pt, ...crs].filter(Boolean).every((r) => !/Started by/i.test(r.text) && /Started by solution designer/i.test(r.label)), '"Started by solution designer" is in the accessible label only, not visible text', [mk, pt, ...crs])
await page.getByText(/marketing team/i).first().scrollIntoViewIfNeeded().catch(() => {})
await page.screenshot({ path: path.join(outDir, 'PL-01-placement-tree.png') })
await page.getByText(/product team/i).last().scrollIntoViewIfNeeded().catch(() => {})
await page.screenshot({ path: path.join(outDir, 'PL-02-placement-tree-agent-root.png') })
await fs.writeFile(path.join(outDir, 'desktop-placement-report.json'), JSON.stringify(report, null, 2))
await browser.close().catch(() => {})
console.log(report.checks.every((c) => c.ok) ? 'PLACEMENT PASS' : 'PLACEMENT FAIL')
