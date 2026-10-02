#!/usr/bin/env node
// Temporary probe: does the model receive list_available_agents output on a runtime?
// Creates two same-name agents (hashed addresses), asks the PM to call the tool and quote the raw result.
// Usage (from autobyteus-server-ts so `ws` resolves):
//   node <this file> --backend http://127.0.0.1:<port> --runtime antigravity_cli --model gemini-3.8-flash-low
import { createRequire } from 'node:module'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const WebSocket = require('ws')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
const backend = arg('backend'); const runtimeKind = arg('runtime'); const model = arg('model')
const hint = arg('hint', ' AutoByteus tools such as list_available_agents are invoked with call_mcp_tool, ServerName autobyteus_agent_tools and the tool name as ToolName. Do not use shell or file tools.')
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors)); return j.data
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const suffix = randomUUID().slice(0, 6)
const created = []
const def = async (name, toolNames, instructions) => {
  const id = (await gql('mutation($i: CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, description: 'probe', category: 'probe', toolNames, instructions } })).createAgentDefinition.id
  created.push(id); return id
}
try {
  const twinA = await def(`Probe Twin ${suffix}`, [], 'Reply briefly.')
  const twinB = await def(`Probe Twin ${suffix}`, [], 'Reply briefly.')
  const pm = await def(`Probe PM ${suffix}`, ['list_available_agents'], `Follow the user's instructions exactly.${hint}`)
  const expected = [twinA, twinB].map((id) => `/probe_twin_${suffix}_${createHash('sha256').update(id).digest('hex').slice(0, 6)}`)
  const ws0 = await fs.mkdtemp(path.join(os.tmpdir(), 'aic-probe-ws-'))
  const run = (await gql('mutation($i: CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: pm, workspaceRootPath: ws0, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind } })).createAgentRun
  if (!run.success) throw new Error(run.message)
  const socket = new WebSocket(`${backend.replace('http', 'ws')}/ws/agent/${run.runId}`)
  const messages = []
  socket.on('message', (raw) => { try { messages.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((r) => socket.once('open', r)); await delay(1500)
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content: `${process.argv.includes("--exact-args") ? "Call the list_available_agents tool exactly once now with these exact JSON arguments: {}. Do not call any other AutoByteus tool." : "Call list_available_agents exactly once."} Then reply with the exact addresses of the two entries named "Probe Twin ${suffix}", copied character for character from the tool result, comma-separated. If the tool result is empty or you cannot see it, reply NO OUTPUT.`, context_file_paths: [], image_urls: [], message_id: `m-${randomUUID()}`, dedupe_key: `agent_run_input:probe:${randomUUID()}`, command_id: randomUUID() } }))
  const start = Date.now()
  while (Date.now() - start < 300000) {
    if (messages.some((m) => m.type === 'TURN_COMPLETED') && messages.some((m) => m.type === 'AGENT_STATUS' && m.payload?.status === 'idle')) break
    await delay(1000)
  }
  const reply = messages.filter((m) => m.type === 'SEGMENT_CONTENT').map((m) => m.payload?.delta ?? '').join('').trim()
  const toolEvents = messages.filter((m) => /TOOL_EXECUTION_(SUCCEEDED|FAILED)/.test(m.type)).map((m) => ({ type: m.type, tool: m.payload?.tool_name, result: JSON.stringify(m.payload?.result ?? m.payload?.error ?? null).slice(0, 300) }))
  const conversation = (await gql('query($r:String!){getRunProjection(runId:$r){conversation}}', { r: run.runId })).getRunProjection.conversation
    .filter((c) => c.kind === 'tool_call').map((c) => ({ tool: c.toolName, result: JSON.stringify(c.toolResult ?? c.toolError ?? null).slice(0, 400) }))
  socket.close()
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: run.runId }).catch(() => {})
  console.log(JSON.stringify({ runtimeKind, model, expected, reply: reply.slice(-600), modelSawExactAddresses: expected.every((a) => reply.includes(a)), toolEvents, conversationToolCalls: conversation }, null, 2))
} finally {
  for (const id of created) await gql('mutation($id:String!){deleteAgentDefinition(id:$id){success}}', { id }).catch(() => {})
}
