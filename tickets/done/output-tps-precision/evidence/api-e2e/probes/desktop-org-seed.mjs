// Temporary API/E2E seed for desktop journey D03 (Org): an Org with a direct agent and a team member.
// node desktop-org-seed.mjs <graphqlUrl> <seed.json> <outJson>
import fs from 'node:fs/promises';
const [gqlUrl, seedFile, out] = process.argv.slice(2);
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const gql = async (query, variables = {}) => {
  const r = await fetch(gqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data;
};
const org = (await gql('mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input: $input) { id } }', { input: {
  name: 'TPS Desktop Org', description: 'TPS desktop validation Org', instructions: 'The lead routes writing work to the crew.',
  members: [{ memberName: 'lead', ref: seed.coordinator, refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'crew', ref: seed.team, refType: 'AGENT_TEAM', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition.id;
const run = (await gql('mutation($input: CreateAgentOrgRunInput!) { createAgentOrgRun(input: $input) { success message agentOrgRunId } }', { input: {
  agentOrgDefinitionId: org, rootConfiguration: { runtimeKind: seed.runtimeKind, llmModelIdentifier: seed.model,
    autoExecuteTools: true, workspaceRootPath: '/tmp/tps-desktop-ws' } } })).createAgentOrgRun;
if (!run.success) throw new Error(run.message);
const result = { org, orgRunId: run.agentOrgRunId };
await fs.writeFile(out, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
