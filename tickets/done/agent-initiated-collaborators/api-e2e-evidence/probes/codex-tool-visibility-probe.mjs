#!/usr/bin/env node
// Temporary probe: which Agent Tools does a Codex standalone run see, with and without
// `list_available_agents` selected? Usage (from autobyteus-server-ts so `ws` resolves):
//   node <this file> --backend http://127.0.0.1:<port> [--runtime codex_app_server] [--model gpt-5.5]
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const WebSocket = require('ws')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
const backend = arg('backend'); const runtimeKind = arg('runtime', 'codex_app_server'); const model = arg('model', 'gpt-5.5')
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors)); return j.data
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const suffix = randomUUID().slice(0, 6)
const created = []
const runOnce = async (label, toolNames) => {
  const def = (await gql('mutation($i: CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: {
    name: `Probe ${label} ${suffix}`, description: 'probe', category: 'probe', toolNames,
    instructions: 'Answer the user exactly. Do not call any tool unless asked.' } })).createAgentDefinition.id
  created.push(def)
  const ws0 = await fs.mkdtemp(path.join(os.tmpdir(), 'aic-probe-ws-'))
  const run = (await gql('mutation($i: CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: {
    agentDefinitionId: def, workspaceRootPath: ws0, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind } })).createAgentRun
  if (!run.success) throw new Error(run.message)
  const socket = new WebSocket(`${backend.replace('http', 'ws')}/ws/agent/${run.runId}`)
  const messages = []
  socket.on('message', (raw) => { try { messages.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((r) => socket.once('open', r)); await delay(1500)
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: 'List the exact names of every tool or function you can call, including any whose names contain send_message_to, delegate_task, get_handoff_rules or list_available_agents. Reply with the names only, comma-separated. Do not call any tool.', context_file_paths: [], image_urls: [], message_id: `m-${randomUUID()}`, dedupe_key: `agent_run_input:probe:${randomUUID()}`, command_id: randomUUID() } }))
  const start = Date.now()
  while (Date.now() - start < 240000) {
    if (messages.some((m) => m.type === 'AGENT_STATUS' && m.payload?.status === 'idle') && messages.some((m) => m.type === 'TURN_COMPLETED')) break
    await delay(1000)
  }
  const text = messages.filter((m) => m.type === 'SEGMENT_CONTENT').map((m) => m.payload?.delta ?? '').join('')
  socket.close()
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: run.runId }).catch(() => {})
  return { label, toolNames, runId: run.runId, reply: text.trim() }
}
try {
  const results = [await runOnce('with-list', ['list_available_agents']), await runOnce('no-tools', [])]
  console.log(JSON.stringify({ runtimeKind, model, results }, null, 2))
} finally {
  for (const id of created) await gql('mutation($id:String!){deleteAgentDefinition(id:$id){success}}', { id }).catch(() => {})
}
