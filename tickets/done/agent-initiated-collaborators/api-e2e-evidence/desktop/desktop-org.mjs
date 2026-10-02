#!/usr/bin/env node
// Desktop Org-root check (agent-initiated-collaborators): start the public package's "Software Development
// Department" Org, have /software_engineering_team/solution_designer bring in a listed agent and delegate a catalog
// copy of Marketing Team (operator message over the Org stream, as the member composer sends it), then check the
// Org tree in the desktop UI. Usage (from autobyteus-web): node <file> --control-port <n> --backend <url>
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { chromium } = require('playwright-core')
const WebSocket = require('ws')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
const backend = arg('backend'); const controlPort = arg('control-port')
const outDir = path.dirname(fileURLToPath(import.meta.url))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data
}
const report = { checks: [], notes: [] }
const check = (ok, label, details) => { report.checks.push({ ok: Boolean(ok), label, details: details ?? null }); console.log(`  ${ok ? '✓' : '✗'} ${label}`) }

const models = (await gql('query($r:String){ providerModelCatalogSnapshots(runtimeKind:$r){ llmModels { modelIdentifier } } }', { r: 'claude_agent_sdk' }))
  .providerModelCatalogSnapshots.flatMap((s) => s.llmModels.map((m) => m.modelIdentifier))
const model = models.find((m) => m === 'haiku') ?? models.find((m) => /haiku/.test(m)) ?? models[0]
const created = (await gql('mutation($input: CreateAgentOrgRunInput!){ createAgentOrgRun(input:$input){ success message agentOrgRunId } }', { input: {
  agentOrgDefinitionId: 'software-development-department',
  rootConfiguration: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true,
    workspaceRootPath: await fs.mkdtemp(path.join(os.tmpdir(), 'aic-desktop-org-ws-')) },
  agentOverrides: [],
} })).createAgentOrgRun
if (!created.success) throw new Error(created.message)
const orgRunId = report.orgRunId = created.agentOrgRunId
const socket = new WebSocket(`${backend.replace('http', 'ws')}/ws/agent-org/${orgRunId}`)
const frames = []
socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
await new Promise((r) => socket.once('open', r))
const waitFrame = async (label, fn, timeout = 600000) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { const found = frames.find(fn); if (found) return found; await delay(500) }
  throw new Error(`timed out: ${label}`)
}
const snapshot = await waitFrame('snapshot', (f) => f.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT', 60000)
const ids = new Map()
const visit = (members) => { for (const m of members ?? []) { if (m.agentRunId) ids.set(m.address, m.agentRunId); visit(m.members) } }
visit(snapshot.payload.root_org.execution_tree.rootOrg.members)
const designer = ids.get('/software_engineering_team/solution_designer')
check(Boolean(designer), 'Org started; solution designer found', [...ids.keys()])
const messageId = `aic-${randomUUID()}`
socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: {
  root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: designer, command_id: `cmd-${messageId}`,
  content: 'Call send_message_to exactly once with recipient_address "/software_tutorial_video_maker" and content "Reply to me with send_message_to in one short sentence. Text only, no files, no videos." Then call delegate_task exactly once with recipient_address "/marketing_team" and description "Reply in one sentence about a dark-mode announcement. Text only, no files, publish nothing." Do not call any other tool. Then reply DONE.',
  context_file_paths: [], image_urls: [], message_id: messageId, dedupe_key: `agent_run_input:desktop:${messageId}`,
} }))
const event = (kind) => (f) => f.type === 'ROOT_EXECUTION_EVENT' && f.payload?.event?.kind === kind
const added = await waitFrame('collaborator added', event('collaborator_added')).catch(() => null)
check(added?.payload.event.collaborator?.address === '/software_tutorial_video_maker' && added.payload.event.collaborator.addedViaAgentRunId === designer,
  'Org: the solution designer brought in Software Tutorial Video Maker', added?.payload.event.collaborator)
const started = await waitFrame('catalog copy started', (f) => event('task_execution_started')(f) && f.payload.event.execution?.address === '/marketing_team').catch(() => null)
check(started?.payload.event.execution?.source?.kind === 'agent_team', 'Org: catalog copy of Marketing Team with source', started?.payload.event.execution)
socket.close()
await delay(8000)

// The Org tree in the desktop UI.
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => /renderer\/index\.html/.test(p.url()))
await page.reload({ waitUntil: 'domcontentloaded' }); await delay(6000)
await page.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/workspace')); await delay(4000)
const orgRow = page.locator(`[data-run-id="${orgRunId}"], [data-test*="${orgRunId}"]`).first()
if (await orgRow.isVisible().catch(() => false)) { await orgRow.click(); await delay(3000) } else report.notes.push('org run row not found by run id; tree as rendered')
const rows = await page.locator('[data-test="workspace-team-transient-execution-row"]').evaluateAll((els) => els.map((e) => ({
  kind: e.getAttribute('data-transient-kind'), text: e.innerText.replace(/\s+/g, ' ').trim(), label: e.getAttribute('aria-label') })))
report.rows = rows
const tutorial = rows.find((r) => /tutorial/i.test(r.text))
const marketing = rows.find((r) => r.kind === 'task_team' && /marketing/i.test(r.text))
check(Boolean(tutorial), 'Org tree: brought-in agent row present', tutorial)
check(Boolean(marketing), 'Org tree: catalog-copy row present', marketing)
check(marketing && /marketing team/i.test(marketing.text), 'Org tree: catalog-copy row shows the team name (not the raw address)', marketing)
await (marketing ? page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]').filter({ hasText: /marketing/i }).first().scrollIntoViewIfNeeded() : Promise.resolve())
await page.screenshot({ path: path.join(outDir, 'DO-01-org-tree.png') })
await fs.writeFile(path.join(outDir, 'desktop-org-report.json'), JSON.stringify(report, null, 2))
await browser.close().catch(() => {})
