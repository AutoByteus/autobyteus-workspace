// Phase A: create / terminate / restore standalone agent, team and agent-org runs on the dev backend.
import fs from 'node:fs'; import path from 'node:path';
const URL = 'http://127.0.0.1:8000/graphql';
const [dataRoot, outFile] = process.argv.slice(2);
const log = []; const fail = [];
const gql = async (query, variables = {}) => {
  const res = await fetch(URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GRAPHQL ${res.status}: ${JSON.stringify(body.errors.map((e) => e.message))}`);
  return body.data;
};
const check = (name, ok, detail) => { log.push({ check: name, ok: !!ok, detail }); if (!ok) fail.push(name); console.log(ok ? 'PASS' : 'FAIL', name, detail ? JSON.stringify(detail).slice(0, 300) : ''); };
const tag = `rsam${Date.now()}`;
const ws = path.join(dataRoot, 'rsam-workspaces', tag); fs.mkdirSync(ws, { recursive: true });
const models = await gql(`query($r:String){ providerModelCatalogSnapshots(runtimeKind:$r){ llmModels { modelIdentifier } } }`, { r: 'autobyteus' });
const model = models.providerModelCatalogSnapshots.flatMap((p) => p.llmModels).map((m) => m.modelIdentifier).find(Boolean);
const skillName = `rsam_skill_${tag}`;
await gql(`mutation($input: CreateSkillInput!){ createSkill(input:$input){ name } }`, { input: { name: skillName, description: 'RSAM live validation skill', content: `# RSAM\n\nBODY_${tag}` } });
const mkAgent = async (name) => (await gql(`mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id } }`,
  { input: { name: `${name}-${tag}`, role: 'validation agent', description: 'RSAM live validation agent', instructions: 'Accept controlled validation input.', category: 'api-e2e', toolNames: [], skillNames: [skillName] } })).createAgentDefinition.id;
const agentId = await mkAgent('rsam-agent');
const teamDefId = (await gql(`mutation($input: CreateAgentTeamDefinitionInput!){ createAgentTeamDefinition(input:$input){ id } }`,
  { input: { name: `rsam-team-${tag}`, description: 'RSAM team', instructions: 'Coordinate validation only.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: agentId, refScope: 'SHARED' }, { memberName: 'worker', ref: agentId, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
const orgDefId = (await gql(`mutation($input: CreateAgentOrgDefinitionInput!){ createAgentOrgDefinition(input:$input){ id } }`,
  { input: { name: `rsam-org-${tag}`, description: 'RSAM org', instructions: 'Validation only.',
    members: [{ memberName: 'director', ref: agentId, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'crew', ref: teamDefId, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
const launch = { llmModelIdentifier: model, autoExecuteTools: false, runtimeKind: 'autobyteus', workspaceRootPath: ws };
const state = { tag, model, skillName, agentId, teamDefId, orgDefId, ws, agentRuns: [], teamRuns: [], orgRuns: [] };
for (const i of [0, 1]) {
  // standalone agent: the web client's CreateAgentRun / TerminateAgentRun / RestoreAgentRun documents
  const a = (await gql(`mutation CreateAgentRun($input: CreateAgentRunInput!){ createAgentRun(input:$input){ success message runId } }`, { input: { agentDefinitionId: agentId, ...launch } })).createAgentRun;
  check(`agent[${i}] create`, a.success && a.runId, a); state.agentRuns.push(a.runId);
  const at = (await gql(`mutation TerminateAgentRun($agentRunId:String!){ terminateAgentRun(agentRunId:$agentRunId){ success message } }`, { agentRunId: a.runId })).terminateAgentRun;
  check(`agent[${i}] terminate`, at.success, at);
  const ar = (await gql(`mutation RestoreAgentRun($agentRunId:String!){ restoreAgentRun(agentRunId:$agentRunId){ success message runId } }`, { agentRunId: a.runId })).restoreAgentRun;
  check(`agent[${i}] restore`, ar.success, ar);
  await gql(`mutation TerminateAgentRun($agentRunId:String!){ terminateAgentRun(agentRunId:$agentRunId){ success message } }`, { agentRunId: a.runId });
  // team
  const t = (await gql(`mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!){ createAgentTeamRun(input:$input){ success message teamRunId } }`,
    { input: { teamDefinitionId: teamDefId, teamConfigs: [{ teamAddress: '/', ...launch }],
      memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: agentId, ...launch }, { memberAddress: '/worker', agentDefinitionId: agentId, ...launch }] } })).createAgentTeamRun;
  check(`team[${i}] create`, t.success && t.teamRunId, t); state.teamRuns.push(t.teamRunId);
  const tt = (await gql(`mutation($teamRunId:String!){ terminateAgentTeamRun(teamRunId:$teamRunId){ success message } }`, { teamRunId: t.teamRunId })).terminateAgentTeamRun;
  check(`team[${i}] terminate`, tt.success, tt);
  const tr = (await gql(`mutation($teamRunId:String!){ restoreAgentTeamRun(teamRunId:$teamRunId){ success message teamRunId } }`, { teamRunId: t.teamRunId })).restoreAgentTeamRun;
  check(`team[${i}] restore`, tr.success, tr);
  await gql(`mutation($teamRunId:String!){ terminateAgentTeamRun(teamRunId:$teamRunId){ success message } }`, { teamRunId: t.teamRunId });
  // agent org
  const o = (await gql(`mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!){ createAgentOrgRun(input:$input){ success message agentOrgRunId } }`,
    { input: { agentOrgDefinitionId: orgDefId, rootConfiguration: { runtimeKind: 'autobyteus', llmModelIdentifier: model, llmConfig: null, autoExecuteTools: false, workspaceRootPath: ws } } })).createAgentOrgRun;
  check(`org[${i}] create`, o.success && o.agentOrgRunId, o); state.orgRuns.push(o.agentOrgRunId);
  const ot = (await gql(`mutation($id:String!){ terminateAgentOrgRun(agentOrgRunId:$id){ success message agentOrgRunId } }`, { id: o.agentOrgRunId })).terminateAgentOrgRun;
  check(`org[${i}] terminate`, ot.success, ot);
  const or = (await gql(`mutation($id:String!){ restoreAgentOrgRun(agentOrgRunId:$id){ success message agentOrgRunId } }`, { id: o.agentOrgRunId })).restoreAgentOrgRun;
  check(`org[${i}] restore`, or.success, or);
  await gql(`mutation($id:String!){ terminateAgentOrgRun(agentOrgRunId:$id){ success message agentOrgRunId } }`, { id: o.agentOrgRunId });
}
// AC-005: nothing the server wrote carries the field
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
const memoryFiles = walk(path.join(dataRoot, 'memory'));
const carrying = memoryFiles.filter((f) => /skill_?access_?mode/i.test(fs.readFileSync(f, 'latin1')));
check('no written record contains the field', carrying.length === 0, { files: memoryFiles.length, carrying });
state.recordFiles = memoryFiles.filter((f) => /run_metadata\.json$|execution_tree\.json$/.test(f)).map((f) => path.relative(dataRoot, f));
check('record files exist for all three kinds', ['agents/', 'agent_teams/', 'agent_orgs/'].every((k) => state.recordFiles.some((f) => f.includes(k))), state.recordFiles);
fs.writeFileSync(outFile, JSON.stringify({ state, log, fail }, null, 2));
console.log(fail.length ? `FAILED: ${fail.join('; ')}` : 'ALL PASS');
process.exit(fail.length ? 1 : 0);
