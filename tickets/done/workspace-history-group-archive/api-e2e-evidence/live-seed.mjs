#!/usr/bin/env node
// Temporary live-validation seed for workspace-history-group-archive (API/E2E round 1).
// Drives ONLY the isolated instance's GraphQL (fake AGY CLI runtime, no model calls).
// Usage: node live-seed.mjs <graphqlUrl> <workspaceRoot> <out.json>
import fs from 'node:fs/promises';

const [graphqlUrl, workspaceRoot, outFile] = process.argv.slice(2);
if (!graphqlUrl?.includes('127.0.0.1') || !workspaceRoot || !outFile) throw new Error('usage: <graphqlUrl on 127.0.0.1> <workspaceRoot> <out.json>');

const gql = async (query, variables) => {
  const response = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`${query.slice(0, 80)} → ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
const config = () => ({ workspaceRootPath: workspaceRoot, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });
const agentDefinition = async (name) => (await gql(
  'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
  { input: { name, role: 'assistant', description: `${name} (group archive live check)`, instructions: 'Follow the user request.', toolNames: [] } },
)).createAgentDefinition.id;
const createAgentRun = async (agentDefinitionId) => {
  const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}',
    { input: { agentDefinitionId, ...config() } })).createAgentRun;
  if (!created.success) throw new Error(created.message);
  return created.runId;
};
const terminateAgentRun = async (id) => {
  const r = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun;
  if (!r.success) throw new Error(r.message);
};
const createTeamRun = async (teamDefinitionId, memberAgentId) => {
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
    { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...config() }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: memberAgentId, ...config() }] } })).createAgentTeamRun;
  if (!created.success) throw new Error(created.message);
  return created.teamRunId;
};
const terminateTeamRun = async (id) => {
  const r = (await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}', { id })).terminateAgentTeamRun;
  if (!r.success) throw new Error(r.message);
};
const createOrgRun = async (agentOrgDefinitionId) => {
  const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
    { input: { agentOrgDefinitionId, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  if (!created.success) throw new Error(created.message);
  return created.agentOrgRunId;
};
const terminateOrgRun = async (id) => {
  const r = (await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id })).terminateAgentOrgRun;
  if (!r.success) throw new Error(r.message);
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const out = { workspaceRoot };
out.workspace = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceRoot } })).createWorkspace;
out.agentA = await agentDefinition('Archive Group Agent');
out.agentB = await agentDefinition('Keeper Agent');
out.member = await agentDefinition('Bridge Lead');
out.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
  { input: { name: 'Bridge Team', description: 'Group archive live check', instructions: 'Follow requests.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: out.member, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
out.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
  { input: { name: 'Delivery Org', description: 'Group archive live check', instructions: 'Follow requests.',
    members: [{ memberName: 'manager', ref: out.member, refType: 'AGENT', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition.id;

// Agent A: the oldest run stays live (hidden by the 6-run cap once 8 newer stopped runs exist).
out.agentAHiddenLive = await createAgentRun(out.agentA);
await pause(1100);
out.agentAStopped = [];
for (let i = 0; i < 8; i += 1) {
  const runId = await createAgentRun(out.agentA);
  await terminateAgentRun(runId);
  out.agentAStopped.push(runId);
  await pause(1100);
}
// Agent B: one stopped run and one visible live run.
out.agentBStopped = await createAgentRun(out.agentB);
await terminateAgentRun(out.agentBStopped);
out.agentBLive = await createAgentRun(out.agentB);
// Team: one stopped, one live.
out.teamStopped = await createTeamRun(out.team, out.member);
await terminateTeamRun(out.teamStopped);
out.teamLive = await createTeamRun(out.team, out.member);
// Org: one stopped, one live.
out.orgStopped = await createOrgRun(out.org);
await terminateOrgRun(out.orgStopped);
out.orgLive = await createOrgRun(out.org);

await fs.writeFile(outFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out));

export const helpers = { terminateAgentRun, terminateTeamRun, terminateOrgRun };
