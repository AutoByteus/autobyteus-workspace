// Realistic lifecycle: create -> user message -> reply -> stop -> restore -> user message -> reply -> stop,
// for a standalone agent, a team and an agent org, through the dev backend (GraphQL + websocket).
import fs from 'node:fs'; import path from 'node:path'; import { randomUUID } from 'node:crypto';
const HTTP = 'http://127.0.0.1:8000'; const WS = 'ws://127.0.0.1:8000';
const [dataRoot, outFile, recordFile] = process.argv.slice(2);
const MODEL = 'openai-compatible:provider_rsam_fake:rsam-fake-model';
const log = []; const fail = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables = {}) => {
  const res = await fetch(`${HTTP}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GRAPHQL ${res.status}: ${JSON.stringify(body.errors.map((e) => e.message))}`);
  return body.data;
};
const check = (name, ok, detail) => { log.push({ check: name, ok: !!ok, detail }); if (!ok) fail.push(name); console.log(ok ? 'PASS' : 'FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 260) : ''); };
const requests = () => fs.existsSync(recordFile) ? fs.readFileSync(recordFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.body) : [];
const systemPromptOf = (r) => (r.body.messages ?? []).filter((m) => m.role === 'system' || m.role === 'developer').map((m) => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n');
// one user turn over a websocket; resolves with the reply token the fake model produced
const turn = async (wsPath, payload) => {
  const before = requests().length;
  const socket = new WebSocket(`${WS}${wsPath}`); const messages = [];
  socket.addEventListener('message', (e) => messages.push(String(e.data)));
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', () => reject(new Error(`WS_ERROR ${wsPath}`))); });
  await sleep(1500);
  const id = `rsam-${randomUUID()}`;
  const sendPayload = payload.org
    ? { root_subject_kind: 'agent_org', root_run_id: payload.org, target_agent_run_id: payload.agent_run_id, command_id: `cmd-${id}`, content: payload.content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: `agent_run_input:e2e:${id}` }
    : { message_id: id, dedupe_key: `agent_run_input:e2e:${id}`, context_file_paths: [], image_urls: [], ...payload };
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: sendPayload }));
  let reply = null;
  for (let i = 0; i < 120 && !reply; i += 1) { await sleep(250); const m = messages.join('\n').match(/RSAM_FAKE_REPLY_\d+/); if (m && requests().length > before) reply = m[0]; }
  await sleep(1500);
  const errors = messages.filter((m) => /"type":"ERROR"/.test(m)).map((m) => m.slice(0, 300));
  socket.close();
  return { reply, newRequests: requests().slice(before), errors, messageCount: messages.length, carriesSkillField: /skill_?access/i.test(messages.join('\n')), sawSnapshot: /ROOT_EXECUTION_VIEW_SNAPSHOT|TEAM_EXECUTION_VIEW/.test(messages.join('\n')) };
};
const tag = `rsamb${Date.now()}`;
const ws = path.join(dataRoot, 'rsam-workspaces', tag); fs.mkdirSync(ws, { recursive: true });
const skillName = `rsam_skill_${tag}`; const body = `BODY_${tag}`;
await gql(`mutation($input: CreateSkillInput!){ createSkill(input:$input){ name } }`, { input: { name: skillName, description: 'RSAM live validation skill', content: `# RSAM\n\n${body}` } });
const mkAgent = async (name, skillNames) => (await gql(`mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id } }`,
  { input: { name: `${name}-${tag}`, role: 'validation agent', description: 'RSAM live validation agent', instructions: 'Reply briefly.', category: 'api-e2e', toolNames: [], skillNames } })).createAgentDefinition.id;
const agentId = await mkAgent('rsam-skilled', [skillName]);
const plainId = await mkAgent('rsam-plain', []);
const teamDefId = (await gql(`mutation($input: CreateAgentTeamDefinitionInput!){ createAgentTeamDefinition(input:$input){ id } }`,
  { input: { name: `rsam-team-${tag}`, description: 'RSAM team', instructions: 'Coordinate validation only.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: agentId, refScope: 'SHARED' }, { memberName: 'worker', ref: plainId, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
const orgDefId = (await gql(`mutation($input: CreateAgentOrgDefinitionInput!){ createAgentOrgDefinition(input:$input){ id } }`,
  { input: { name: `rsam-org-${tag}`, description: 'RSAM org', instructions: 'Validation only.',
    members: [{ memberName: 'director', ref: agentId, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'crew', ref: teamDefId, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
const launch = { llmModelIdentifier: MODEL, autoExecuteTools: false, runtimeKind: 'autobyteus', workspaceRootPath: ws };
const state = { tag, skillName, body, agentId, plainId, teamDefId, orgDefId, ws, agentRuns: [], teamRuns: [], orgRuns: [], plainRun: null };
const catalogLine = `- **${skillName}**: RSAM live validation skill`;
const skillPath = path.join(dataRoot, 'skills', skillName, 'SKILL.md');
const expectCatalog = (label, reqs) => {
  const prompt = systemPromptOf(reqs[0] ?? { body: {} });
  check(`${label}: system prompt sent to the model has the catalog entry and SKILL.md path`, prompt.includes(catalogLine) && prompt.includes(skillPath), { promptChars: prompt.length });
  check(`${label}: system prompt does not inline the skill body`, prompt.length > 0 && !prompt.includes(body));
};
const findNodes = (tree) => { const out = []; const visit = (v) => { if (!v || typeof v !== 'object') return; if (Array.isArray(v)) return v.forEach(visit); const rid = v.agent_run_id ?? v.agentRunId; if (rid && v.address) out.push({ address: v.address, agentRunId: rid }); Object.values(v).forEach(visit); }; visit(tree); return out; };

// agent without skills -> no catalog
{
  const a = (await gql(`mutation CreateAgentRun($input: CreateAgentRunInput!){ createAgentRun(input:$input){ success message runId } }`, { input: { agentDefinitionId: plainId, ...launch } })).createAgentRun;
  check('plain agent create', a.success, a); state.plainRun = a.runId;
  const t = await turn(`/ws/agent/${a.runId}`, { content: 'Say hello.' });
  check('plain agent turn replied', !!t.reply, { reply: t.reply, errors: t.errors });
  const prompt = systemPromptOf(t.newRequests[0] ?? { body: {} });
  check('agent with no skills: no skills section in the system prompt', prompt.length > 0 && !prompt.includes('## Skills') && !prompt.includes('Skill Catalog'), { promptChars: prompt.length });
  await gql(`mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success } }`, { id: a.runId });
}
for (const i of [0, 1]) {
  const a = (await gql(`mutation CreateAgentRun($input: CreateAgentRunInput!){ createAgentRun(input:$input){ success message runId } }`, { input: { agentDefinitionId: agentId, ...launch } })).createAgentRun;
  check(`agent[${i}] create`, a.success && a.runId, a); state.agentRuns.push(a.runId);
  const t1 = await turn(`/ws/agent/${a.runId}`, { content: 'First message.' });
  check(`agent[${i}] first turn replied`, !!t1.reply, { reply: t1.reply, errors: t1.errors });
  expectCatalog(`agent[${i}]`, t1.newRequests);
  check(`agent[${i}] terminate`, (await gql(`mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success message } }`, { id: a.runId })).terminateAgentRun.success);
  const ar = (await gql(`mutation RestoreAgentRun($agentRunId:String!){ restoreAgentRun(agentRunId:$agentRunId){ success message runId } }`, { agentRunId: a.runId })).restoreAgentRun;
  check(`agent[${i}] restore`, ar.success, ar);
  const t2 = await turn(`/ws/agent/${a.runId}`, { content: 'Second message after restore.' });
  check(`agent[${i}] turn after restore replied`, !!t2.reply, { reply: t2.reply, errors: t2.errors });
  expectCatalog(`agent[${i}] after restore`, t2.newRequests);
  await gql(`mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success } }`, { id: a.runId });

  const tr = (await gql(`mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!){ createAgentTeamRun(input:$input){ success message teamRunId } }`,
    { input: { teamDefinitionId: teamDefId, teamConfigs: [{ teamAddress: '/', ...launch }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: agentId, ...launch }, { memberAddress: '/worker', agentDefinitionId: plainId, ...launch }] } })).createAgentTeamRun;
  check(`team[${i}] create`, tr.success && tr.teamRunId, tr); state.teamRuns.push(tr.teamRunId);
  const resume = (await gql(`query GetTeamRunResumeConfig($teamRunId:String!){ getTeamRunResumeConfig(teamRunId:$teamRunId){ teamRunId isActive executionTree modelConfigEditability { editable reason } } }`, { teamRunId: tr.teamRunId })).getTeamRunResumeConfig;
  const lead = findNodes(resume.executionTree).find((n) => n.address === '/lead');
  check(`team[${i}] resume config has no skill field`, !/skill_?access/i.test(JSON.stringify(resume)), { lead });
  const tt1 = await turn(`/ws/agent-team/${tr.teamRunId}`, { agent_run_id: lead.agentRunId, content: 'Team first message.' });
  check(`team[${i}] lead turn replied`, !!tt1.reply, { reply: tt1.reply, errors: tt1.errors });
  check(`team[${i}] stream messages carry no skill field`, !tt1.carriesSkillField, { messages: tt1.messageCount, sawSnapshot: tt1.sawSnapshot });
  expectCatalog(`team[${i}] lead`, tt1.newRequests);
  check(`team[${i}] terminate`, (await gql(`mutation($id:String!){ terminateAgentTeamRun(teamRunId:$id){ success message } }`, { id: tr.teamRunId })).terminateAgentTeamRun.success);
  const trr = (await gql(`mutation($id:String!){ restoreAgentTeamRun(teamRunId:$id){ success message teamRunId } }`, { id: tr.teamRunId })).restoreAgentTeamRun;
  check(`team[${i}] restore`, trr.success, trr);
  const tt2 = await turn(`/ws/agent-team/${tr.teamRunId}`, { agent_run_id: lead.agentRunId, content: 'Team second message after restore.' });
  check(`team[${i}] lead turn after restore replied`, !!tt2.reply, { reply: tt2.reply, errors: tt2.errors });
  await gql(`mutation($id:String!){ terminateAgentTeamRun(teamRunId:$id){ success } }`, { id: tr.teamRunId });

  const o = (await gql(`mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!){ createAgentOrgRun(input:$input){ success message agentOrgRunId } }`,
    { input: { agentOrgDefinitionId: orgDefId, rootConfiguration: { runtimeKind: 'autobyteus', llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: false, workspaceRootPath: ws } } })).createAgentOrgRun;
  check(`org[${i}] create`, o.success && o.agentOrgRunId, o); state.orgRuns.push(o.agentOrgRunId);
  const cfg = (await gql(`query($id:String!){ getAgentOrgRunConfig(orgRunId:$id){ orgRunId isActive executionTree } }`, { id: o.agentOrgRunId })).getAgentOrgRunConfig;
  const director = findNodes(cfg.executionTree).find((n) => n.address === '/director');
  check(`org[${i}] run config has no skill field`, !/skill_?access/i.test(JSON.stringify(cfg)), { director });
  const ot1 = await turn(`/ws/agent-org/${o.agentOrgRunId}`, { org: o.agentOrgRunId, agent_run_id: director.agentRunId, content: 'Org first message.' });
  check(`org[${i}] director turn replied`, !!ot1.reply, { reply: ot1.reply, errors: ot1.errors });
  check(`org[${i}] stream messages carry no skill field`, ot1.sawSnapshot && !ot1.carriesSkillField, { sawSnapshot: ot1.sawSnapshot });
  expectCatalog(`org[${i}] director`, ot1.newRequests);
  check(`org[${i}] terminate`, (await gql(`mutation($id:String!){ terminateAgentOrgRun(agentOrgRunId:$id){ success message } }`, { id: o.agentOrgRunId })).terminateAgentOrgRun.success);
  const orr = (await gql(`mutation($id:String!){ restoreAgentOrgRun(agentOrgRunId:$id){ success message agentOrgRunId } }`, { id: o.agentOrgRunId })).restoreAgentOrgRun;
  check(`org[${i}] restore`, orr.success, orr);
  const ot2 = await turn(`/ws/agent-org/${o.agentOrgRunId}`, { org: o.agentOrgRunId, agent_run_id: director.agentRunId, content: 'Org second message after restore.' });
  check(`org[${i}] director turn after restore replied`, !!ot2.reply, { reply: ot2.reply, errors: ot2.errors });
  await gql(`mutation($id:String!){ terminateAgentOrgRun(agentOrgRunId:$id){ success } }`, { id: o.agentOrgRunId });
}
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
const memoryFiles = walk(path.join(dataRoot, 'memory'));
const carrying = memoryFiles.filter((f) => /skill_?access_?mode/i.test(fs.readFileSync(f, 'latin1')));
check('no record written by the server contains the field', carrying.length === 0, { files: memoryFiles.length, carrying });
fs.writeFileSync(outFile, JSON.stringify({ state, log, fail }, null, 2));
console.log(fail.length ? `FAILED: ${fail.join('; ')}` : 'ALL PASS');
process.exit(fail.length ? 1 : 0);
