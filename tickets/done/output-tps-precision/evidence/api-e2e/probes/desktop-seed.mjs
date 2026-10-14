// Temporary API/E2E seed for the isolated desktop journeys (public GraphQL only).
// node desktop-seed.mjs <graphqlUrl> <workspaceDir> <outJson> [runtimeKind] [model]
import fs from 'node:fs/promises';
const [gqlUrl, workspace, out, runtimeKind = 'codex_app_server', modelArg = 'gpt-5.6-luna'] = process.argv.slice(2);
const gql = async (query, variables = {}) => {
  const r = await fetch(gqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data;
};
const model = modelArg;
const existing = new Map((await gql('{ agentDefinitions { id name } }')).agentDefinitions.map(d => [d.name, d.id]));
const def = async (name, instructions, toolNames) => existing.get(name) ?? (await gql('mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }',
  { input: { name, role: 'assistant', description: 'TPS desktop validation', instructions, category: 'runtime-e2e', toolNames } })).createAgentDefinition.id;
const writer = await def('TPS Writer', 'Reply directly in plain text. Do not use tools.', []);
const coordinator = await def('TPS Coordinator', 'You coordinate a small team. Follow the user\'s instructions exactly. Use delegate_task or send_message_to only when the user asks you to.', ['delegate_task', 'send_message_to']);
const worker = await def('TPS Worker', 'You are a writer. When you receive work, reply with the requested plain-text paragraph directly. Do not use tools unless asked to reply to the sender.', ['send_message_to']);
const team = (await gql('mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }', { input: {
  name: 'TPS Desktop Team', description: 'TPS desktop validation team', instructions: 'Coordinator delegates writing to worker.',
  coordinatorMemberName: 'coordinator', nodes: [
    { memberName: 'coordinator', ref: coordinator, refScope: 'SHARED' },
    { memberName: 'worker', ref: worker, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
const cfg = { llmModelIdentifier: model, autoExecuteTools: true, runtimeKind, workspaceRootPath: workspace };
const run = async () => { const r = (await gql('mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }',
  { input: { agentDefinitionId: writer, ...cfg } })).createAgentRun; if (!r.success) throw new Error(r.message); return r.runId; };
const runA = await run(); const runB = await run();
const teamRun = (await gql('mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }', { input: {
  teamDefinitionId: team, teamConfigs: [{ teamAddress: '/', ...cfg }],
  memberConfigs: [{ memberAddress: '/coordinator', agentDefinitionId: coordinator, ...cfg }, { memberAddress: '/worker', agentDefinitionId: worker, ...cfg }] } })).createAgentTeamRun;
if (!teamRun.success) throw new Error(teamRun.message);
const result = { runtimeKind, model, writer, coordinator, worker, team, runA, runB, teamRunId: teamRun.teamRunId };
await fs.writeFile(out, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
