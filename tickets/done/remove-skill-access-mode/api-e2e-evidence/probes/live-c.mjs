// History stored with the removed key: list, open (resume config) and restore through the running server.
import fs from 'node:fs'; import path from 'node:path'; import { randomUUID } from 'node:crypto';
const [dataRoot, stateFile, recordFile, outFile] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')).state;
const log = []; const fail = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables = {}) => { const res = await fetch('http://127.0.0.1:8000/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await res.json(); if (b.errors?.length) throw new Error(`GRAPHQL: ${JSON.stringify(b.errors.map((e) => e.message))}`); return b.data; };
const check = (name, ok, detail) => { log.push({ check: name, ok: !!ok, detail }); if (!ok) fail.push(name); console.log(ok ? 'PASS' : 'FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 240) : ''); };
const requests = () => fs.readFileSync(recordFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.body);
const promptOf = (r) => (r?.body.messages ?? []).filter((m) => m.role === 'system' || m.role === 'developer').map((m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
const stored = (file) => { const text = fs.readFileSync(path.join(dataRoot, file), 'utf8'); return { count: (text.match(/"skillAccessMode"/g) ?? []).length, none: /"skillAccessMode": ?"NONE"/.test(text) }; };
const turn = async (wsPath, payload) => {
  const before = requests().length; const socket = new WebSocket(`ws://127.0.0.1:8000${wsPath}`); const messages = [];
  socket.addEventListener('message', (e) => messages.push(String(e.data)));
  await new Promise((r, j) => { socket.addEventListener('open', r); socket.addEventListener('error', () => j(new Error(`WS_ERROR ${wsPath}`))); }); await sleep(1500);
  const id = `rsam-${randomUUID()}`;
  const p = payload.org ? { root_subject_kind: 'agent_org', root_run_id: payload.org, target_agent_run_id: payload.agent_run_id, command_id: `cmd-${id}`, content: payload.content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` }
    : { message_id: id, dedupe_key: `agent_run_input:e2e:${id}`, context_file_paths: [], image_urls: [], ...payload };
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: p }));
  let reply = null; for (let i = 0; i < 120 && !reply; i += 1) { await sleep(250); const m = messages.join('\n').match(/RSAM_FAKE_REPLY_\d+/g); if (m && requests().length > before) reply = m.at(-1); }
  await sleep(1500); socket.close();
  return { reply, prompt: promptOf(requests()[before]), errors: messages.filter((m) => /"type":"ERROR"/.test(m)).map((m) => m.slice(0, 200)), leak: /skill_?access/i.test(messages.join('\n')) };
};
const findNodes = (tree) => { const out = []; const visit = (v) => { if (!v || typeof v !== 'object') return; if (Array.isArray(v)) return v.forEach(visit); const rid = v.agent_run_id ?? v.agentRunId; if (rid && v.address) out.push({ address: v.address, agentRunId: rid }); Object.values(v).forEach(visit); }; visit(tree); return out; };
const catalogLine = `- **${state.skillName}**: RSAM live validation skill`;

// the web client's list documents
const history = (await gql(`query ListWorkspaceRunHistory($limitPerAgent: Int = 6) { listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) { workspaceRootPath workspaceName
  agentDefinitions { agentDefinitionId agentName runs { runId summary createdAt archivedAt terminatedAt status isActive shouldConnectStream statusSource } }
  teamDefinitions { teamDefinitionId teamDefinitionName runs { teamRunId teamDefinitionId teamDefinitionName coordinatorAddress workspaceRootPath summary createdAt archivedAt terminatedAt isActive rootTeam members { memberAddress displayName agentRunId status runtimeKind workspaceRootPath } } } } }`, { limitPerAgent: 50 })).listWorkspaceRunHistory;
const listedAgents = history.flatMap((w) => w.agentDefinitions.flatMap((d) => d.runs.map((r) => r.runId)));
const listedTeams = history.flatMap((w) => w.teamDefinitions.flatMap((d) => d.runs.map((r) => r.teamRunId)));
const roots = (await gql(`query ListCollaborationRootHistory { listCollaborationRootHistory { __typename ... on AgentOrgRootHistoryObject { root_subject_kind root_run_id created_at archived_at is_active summary org } ... on AgentTeamRootHistoryObject { root_subject_kind root_run_id } } }`)).listCollaborationRootHistory;
const listedOrgs = roots.filter((r) => r.root_subject_kind === 'agent_org').map((r) => r.root_run_id);
check('history list responses carry no skill field', !/skill_?access/i.test(JSON.stringify({ history, roots })), { agents: listedAgents.length, teams: listedTeams.length, orgs: listedOrgs.length });
for (const [i, mode] of [[0, 'PRELOADED_ONLY'], [1, 'NONE']]) {
  const agentRun = state.agentRuns[i]; const teamRun = state.teamRuns[i]; const orgRun = state.orgRuns[i];
  const files = { agent: `memory/agents/${agentRun}/run_metadata.json`, team: `memory/agent_teams/${teamRun}/team_run_execution_tree.json`, org: `memory/agent_orgs/${orgRun}/agent_org_run_execution_tree.json` };
  check(`[${mode}] records on disk hold the stored key before use`, stored(files.agent).count === 1 && stored(files.team).count === 3 && stored(files.org).count === 5 && (mode !== 'NONE' || (stored(files.agent).none && stored(files.team).none && stored(files.org).none)));
  check(`[${mode}] agent, team and org runs are listed`, listedAgents.includes(agentRun) && listedTeams.includes(teamRun) && listedOrgs.includes(orgRun));
  // standalone agent
  const resume = (await gql(`query GetAgentRunResumeConfig($runId: String!) { getAgentRunResumeConfig(runId: $runId) { runId isActive metadataConfig { agentDefinitionId workspaceRootPath llmModelIdentifier llmConfig autoExecuteTools runtimeKind runtimeReference { runtimeKind sessionId threadId metadata } } modelConfigEditability { editable reason } } }`, { runId: agentRun })).getAgentRunResumeConfig;
  check(`[${mode}] agent resume config opens without the field`, resume.runId === agentRun && resume.isActive === false && !/skill_?access/i.test(JSON.stringify(resume)), resume.metadataConfig);
  const projection = await gql(`query($runId:String!){ getRunProjection(runId:$runId){ runId conversation } }`, { runId: agentRun });
  check(`[${mode}] agent conversation projection opens`, JSON.stringify(projection).includes('RSAM_FAKE_REPLY'));
  const ar = (await gql(`mutation RestoreAgentRun($agentRunId:String!){ restoreAgentRun(agentRunId:$agentRunId){ success message runId } }`, { agentRunId: agentRun })).restoreAgentRun;
  check(`[${mode}] agent restore`, ar.success, ar);
  const at = await turn(`/ws/agent/${agentRun}`, { content: 'Message after restart and restore.' });
  check(`[${mode}] agent replies after restore; catalog still in the prompt (stored value ignored)`, !!at.reply && at.prompt.includes(catalogLine), { reply: at.reply, errors: at.errors });
  await gql(`mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success } }`, { id: agentRun });
  // team
  const tres = (await gql(`query GetTeamRunResumeConfig($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree modelConfigEditability { editable reason } } }`, { teamRunId: teamRun })).getTeamRunResumeConfig;
  check(`[${mode}] team resume config opens without the field`, tres.teamRunId === teamRun && !/skill_?access/i.test(JSON.stringify(tres)));
  const lead = findNodes(tres.executionTree).find((n) => n.address === '/lead');
  const tr = (await gql(`mutation($id:String!){ restoreAgentTeamRun(teamRunId:$id){ success message teamRunId } }`, { id: teamRun })).restoreAgentTeamRun;
  check(`[${mode}] team restore`, tr.success, tr);
  const tt = await turn(`/ws/agent-team/${teamRun}`, { agent_run_id: lead.agentRunId, content: 'Team message after restart and restore.' });
  check(`[${mode}] team lead replies after restore; catalog in the prompt; stream has no field`, !!tt.reply && tt.prompt.includes(catalogLine) && !tt.leak, { reply: tt.reply, errors: tt.errors });
  await gql(`mutation($id:String!){ terminateAgentTeamRun(teamRunId:$id){ success } }`, { id: teamRun });
  // org
  const ocfg = (await gql(`query($id:String!){ getAgentOrgRunConfig(orgRunId:$id){ orgRunId isActive executionTree editability { editable reason } } }`, { id: orgRun })).getAgentOrgRunConfig;
  check(`[${mode}] org run config opens without the field`, ocfg.orgRunId === orgRun && !/skill_?access/i.test(JSON.stringify(ocfg)));
  const inspection = await gql(`query GetAgentOrgRunInspection($orgRunId: String!) { getAgentOrgRunInspection(orgRunId: $orgRunId) }`, { orgRunId: orgRun });
  check(`[${mode}] org inspection opens without the field`, !!inspection.getAgentOrgRunInspection && !/skill_?access/i.test(JSON.stringify(inspection)));
  const director = findNodes(ocfg.executionTree).find((n) => n.address === '/director');
  const orr = (await gql(`mutation($id:String!){ restoreAgentOrgRun(agentOrgRunId:$id){ success message agentOrgRunId } }`, { id: orgRun })).restoreAgentOrgRun;
  check(`[${mode}] org restore`, orr.success, orr);
  const ot = await turn(`/ws/agent-org/${orgRun}`, { org: orgRun, agent_run_id: director.agentRunId, content: 'Org message after restart and restore.' });
  check(`[${mode}] org director replies after restore; catalog in the prompt; stream has no field`, !!ot.reply && ot.prompt.includes(catalogLine) && !ot.leak, { reply: ot.reply, errors: ot.errors });
  await gql(`mutation($id:String!){ terminateAgentOrgRun(agentOrgRunId:$id){ success } }`, { id: orgRun });
  log.push({ afterUse: mode, agent: stored(files.agent), team: stored(files.team), org: stored(files.org) });
  console.log('INFO stored key after use', mode, JSON.stringify({ agent: stored(files.agent).count, team: stored(files.team).count, org: stored(files.org).count }));
}
fs.writeFileSync(outFile, JSON.stringify({ log, fail }, null, 2));
console.log(fail.length ? `FAILED: ${fail.join('; ')}` : 'ALL PASS'); process.exit(fail.length ? 1 : 0);
