#!/usr/bin/env node
// Desktop restart check (agent-initiated-collaborators): before/after `isolated-app restart`, the PM run (Agent root)
// and the Software Engineering Team run (Team root) keep their agent-initiated collaborators and catalog copies
// (same run IDs, `source` kept); after the restart a message to a catalog copy's coordinator wakes it from its source.
// Usage (from autobyteus-server-ts so `ws` resolves): node <file> --backend <url> --phase before|after
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const WebSocket = require('ws')
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f }
const backend = arg('backend'); const phase = arg('phase')
const outDir = path.dirname(fileURLToPath(import.meta.url))
const stateFile = path.join(outDir, arg('state', 'desktop-restart-state.json'))
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const gql = async (query, variables = {}) => {
  const j = await (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 400)); return j.data
}
const check = (ok, label, details) => { console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` ${JSON.stringify(details ?? null).slice(0, 600)}`}`); return ok }

const history = (await gql('{ listWorkspaceRunHistory(limitPerAgent: 20) { agentDefinitions { agentDefinitionId runs { runId } } teamDefinitions { teamDefinitionId runs { teamRunId } } } }')).listWorkspaceRunHistory
const pmDefinition = (await gql('{ agentDefinitions { id name } }')).agentDefinitions.find((d) => d.name === 'Project Manager').id
const pmRunId = history.flatMap((w) => w.agentDefinitions).find((a) => a.agentDefinitionId === pmDefinition).runs[0].runId
const teamRunId = history.flatMap((w) => w.teamDefinitions).find((t) => t.teamDefinitionId === 'software-engineering-team')?.runs?.[0]?.teamRunId ?? null
const agentTree = async () => (await gql('query($id:String!){ agentRunCollaboration(runId:$id) }', { id: pmRunId })).agentRunCollaboration.root_agent
const teamTree = async () => (await gql('query($id:String!){ getTeamRunResumeConfig(teamRunId:$id){ executionTree } }', { id: teamRunId })).getTeamRunResumeConfig.executionTree.root_team
const summary = async () => {
  const a = await agentTree(); const t = teamRunId ? await teamTree() : { collaborators: [], task_executions: [] }
  return {
    agent: { active: a.is_active, collaborators: a.execution_tree.collaborators.map((c) => [c.address, c.teamRunId ?? c.agentRunId]),
      copies: a.execution_tree.taskExecutions.map((x) => [x.address, x.teamRunId ?? x.agentRunId, JSON.stringify(x.source ?? null)]) },
    team: { collaborators: t.collaborators.map((c) => [c.address, c.team_run_id ?? c.agent_run_id]),
      copies: (t.task_executions ?? []).map((x) => [x.address, x.team_run_id ?? x.agent_run_id, JSON.stringify(x.source ?? null)]) },
  }
}

if (phase === 'before') {
  const state = { pmRunId, teamRunId, before: await summary() }
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2))
  console.log(JSON.stringify(state, null, 1).slice(0, 1500))
} else {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'))
  const after = await summary()
  state.after = after
  check(after.agent.active === false, 'Agent root PM run is stopped after the restart (restore on demand)', after.agent.active)
  check(JSON.stringify(after.agent.collaborators) === JSON.stringify(state.before.agent.collaborators), 'Agent root: same collaborators, same run IDs', after.agent)
  check(JSON.stringify(after.agent.copies) === JSON.stringify(state.before.agent.copies), 'Agent root: same catalog copies with the same source', after.agent)
  check(JSON.stringify(after.team.collaborators) === JSON.stringify(state.before.team.collaborators), 'Team root: same collaborators', after.team)
  check(JSON.stringify(after.team.copies) === JSON.stringify(state.before.team.copies), 'Team root: same catalog copies with the same source', after.team)
  // Wake a catalog copy's coordinator through the Agent-root stream: it restores from its source and answers.
  const tree = await agentTree()
  const copy = tree.execution_tree.taskExecutions.find((x) => x.source?.kind === 'agent_team')
  const lead = copy.members.find((m) => m.address === copy.source.coordinatorAddress)
  const socket = new WebSocket(`${backend.replace('http', 'ws')}/ws/agent-collaboration/${pmRunId}`)
  const frames = []
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))) } catch {} })
  await new Promise((r) => socket.once('open', r)); await delay(2000)
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent', root_run_id: pmRunId, target_agent_run_id: lead.agentRunId,
    command_id: randomUUID(), content: 'Reply with the single word WOKEN, without tools.', context_file_paths: [], image_urls: [],
    message_id: `m-${randomUUID()}`, dedupe_key: `agent_run_input:restart:${randomUUID()}` } }))
  let woken = false
  const start = Date.now()
  while (Date.now() - start < 300000 && !woken) {
    const conversation = (await gql('query($h:String!,$a:String!,$r:String!){ agentRunCollaborationMemberProjection(hostRunId:$h, memberAddress:$a, agentRunId:$r){ conversation } }',
      { h: pmRunId, a: lead.address, r: lead.agentRunId })).agentRunCollaborationMemberProjection.conversation
    woken = conversation.some((c) => c.role === 'assistant' && /WOKEN/.test(c.content ?? ''))
    if (!woken) await delay(3000)
  }
  socket.close()
  state.woken = check(woken, 'after the restart, a catalog copy coordinator woke from its source and answered', { lead })
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2))
}
