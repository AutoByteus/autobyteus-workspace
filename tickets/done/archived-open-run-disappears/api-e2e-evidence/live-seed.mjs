#!/usr/bin/env node
// Temporary live-validation seed for archived-open-run-disappears (API/E2E round 1).
// Adapted from tickets/done/workspace-history-group-archive/api-e2e-evidence/live-seed.mjs.
// Drives ONLY an isolated instance's GraphQL on 127.0.0.1 (fake AGY CLI runtime, no model calls).
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
  { input: { name, role: 'assistant', description: `${name} (archived open run live check)`, instructions: 'Follow the user request.', toolNames: [] } },
)).createAgentDefinition.id;
const teamDefinition = async (name, member) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
  { input: { name, description: 'Archived open run live check', instructions: 'Follow requests.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: member, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
const orgDefinition = async (name, member) => (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
  { input: { name, description: 'Archived open run live check', instructions: 'Follow requests.',
    members: [{ memberName: 'manager', ref: member, refType: 'AGENT', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition.id;
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
const stopped = async (count, create, terminate) => {
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const id = await create();
    await terminate(id);
    ids.push(id);
    await pause(1100);
  }
  return ids;
};

await fs.mkdir(workspaceRoot, { recursive: true });
const out = { workspaceRoot };
out.workspace = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspaceRoot } })).createWorkspace;
out.openAgent = await agentDefinition('Open Agent');
out.keeperAgent = await agentDefinition('Keeper Agent');
out.liveAgent = await agentDefinition('Live Agent');
out.member = await agentDefinition('Bridge Lead');
out.bridgeTeam = await teamDefinition('Bridge Team', out.member);
out.otherTeam = await teamDefinition('Other Team', out.member);
out.liveTeam = await teamDefinition('Live Team', out.member);
out.deliveryOrg = await orgDefinition('Delivery Org', out.member);
out.liveOrg = await orgDefinition('Live Org', out.member);

out.openAgentStopped = await stopped(5, () => createAgentRun(out.openAgent), terminateAgentRun);
out.keeperStopped = await stopped(1, () => createAgentRun(out.keeperAgent), terminateAgentRun);
out.liveAgentRun = await createAgentRun(out.liveAgent);
out.bridgeTeamStopped = await stopped(5, () => createTeamRun(out.bridgeTeam, out.member), terminateTeamRun);
out.otherTeamStopped = await stopped(1, () => createTeamRun(out.otherTeam, out.member), terminateTeamRun);
out.liveTeamRun = await createTeamRun(out.liveTeam, out.member);
out.deliveryOrgStopped = await stopped(3, () => createOrgRun(out.deliveryOrg), terminateOrgRun);
out.liveOrgRun = await createOrgRun(out.liveOrg);

await fs.writeFile(outFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out));
