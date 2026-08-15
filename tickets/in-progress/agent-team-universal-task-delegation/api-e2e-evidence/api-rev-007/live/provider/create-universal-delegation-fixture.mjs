import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('usage: node create-universal-delegation-fixture.mjs <outputPath>');
const graphqlUrl = process.env.GRAPHQL_URL ?? 'http://127.0.0.1:60312/graphql';

const gql = async (query, variables = {}) => {
  const response = await fetch(graphqlUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
};

const stamp = `api_rev_007_${Date.now()}`;
const createdAgentIds = [];
const createdTeamIds = [];
const createAgent = async (name, instructions) => {
  const data = await gql(`mutation CreateFixtureAgent($input: CreateAgentDefinitionInput!) {
    createAgentDefinition(input: $input) { id name instructions toolNames }
  }`, { input: { name: `${name}_${stamp}`, description: 'Disposable API-REV-007 real-runtime fixture.', instructions, category: 'api-e2e-disposable', toolNames: ['delegate_task', 'submit_task_result', 'review_task_result'] } });
  createdAgentIds.push(data.createAgentDefinition.id);
  return data.createAgentDefinition;
};
const createTeam = async (name, coordinatorMemberName, nodes, instructions) => {
  const data = await gql(`mutation CreateFixtureTeam($input: CreateAgentTeamDefinitionInput!) {
    createAgentTeamDefinition(input: $input) { id name coordinatorMemberName nodes { memberName ref refType refScope } }
  }`, { input: { name: `${name}_${stamp}`, description: 'Disposable API-REV-007 real-runtime fixture.', instructions, category: 'api-e2e-disposable', coordinatorMemberName, nodes } });
  createdTeamIds.push(data.createAgentTeamDefinition.id);
  return data.createAgentTeamDefinition;
};

const coordinator = await createAgent('utd_coordinator', `You are the deterministic coordinator in a real universal-task-delegation validation.
When the user asks you to delegate, call delegate_task exactly once using the exact recipient_address and description in the request. Do not solve the task yourself and do not substitute send_message_to.
When you receive a formal submitted task result, call review_task_result exactly once for that task_id with decision accept if the result contains the requested marker. Do not start another task.
Keep ordinary visible text under one sentence.`);
const worker = await createAgent('utd_worker', `You are the deterministic worker in a real universal-task-delegation validation.
When you are activated as a dedicated task execution, immediately call submit_task_result exactly once with message E2E_DIRECT_TASK_RESULT_42. Do not call send_message_to. Do not wait for another user message. Keep visible text under one sentence.`);
const nestedCoordinator = await createAgent('utd_nested_coordinator', `You are the deterministic coordinator of a delegated nested AgentTeam.
When activated as a dedicated task Team, immediately delegate exactly one child task to recipient_address /lab/researcher with description Return E2E_NESTED_CHILD_RESULT, then wait for the formal result and accept it. After the child is accepted, call submit_task_result exactly once with message E2E_NESTED_TEAM_RESULT. Do not use send_message_to.`);
const nestedWorker = await createAgent('utd_nested_worker', `You are the deterministic nested worker. When activated as a dedicated task execution, immediately call submit_task_result exactly once with message E2E_NESTED_CHILD_RESULT. Do not call send_message_to and do not wait for another user message.`);

const childTeam = await createTeam('utd_child_team', 'lead', [
  { memberName: 'lead', ref: nestedCoordinator.id, refType: 'AGENT', refScope: 'SHARED' },
  { memberName: 'researcher', ref: nestedWorker.id, refType: 'AGENT', refScope: 'SHARED' },
], 'A disposable nested task Team. The lead owns formal child delegation and final submission.');
const rootTeam = await createTeam('utd_root_team', 'coordinator', [
  { memberName: 'coordinator', ref: coordinator.id, refType: 'AGENT', refScope: 'SHARED' },
  { memberName: 'worker', ref: worker.id, refType: 'AGENT', refScope: 'SHARED' },
  { memberName: 'lab', ref: childTeam.id, refType: 'AGENT_TEAM', refScope: 'SHARED' },
], 'A disposable universal task delegation Team. Use formal task lifecycle tools, never message wording, for delegated work.');

const workspaceRoot = path.resolve(path.dirname(outputPath), '..', 'workspaces', stamp);
await mkdir(workspaceRoot, { recursive: true });
const result = { stamp, workspaceRoot, createdAgentIds, createdTeamIds, coordinator, worker, nestedCoordinator, nestedWorker, childTeam, rootTeam };
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
