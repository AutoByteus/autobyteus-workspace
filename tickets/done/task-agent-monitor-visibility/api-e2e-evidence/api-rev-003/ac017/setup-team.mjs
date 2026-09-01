#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:60637';
const outputPath = process.env.OUTPUT_PATH || new URL('./setup.json', import.meta.url).pathname;
const marker = process.env.MARKER || `AC017_LIVE_${Date.now()}`;
const workspaceRootPath = `/tmp/autobyteus-api-rev-003-workspace-${randomUUID()}`;
await mkdir(workspaceRootPath, { recursive: true });

const graphql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body));
  return body.data;
};

const modelsData = await graphql(`query Models($runtimeKind: String) {
  providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
}`, { runtimeKind: 'codex_app_server' });
const models = modelsData.providerModelCatalogSnapshots.flatMap((entry) => entry.llmModels.map((model) => model.modelIdentifier));
if (!models.includes('gpt-5.6-luna')) throw new Error(`gpt-5.6-luna unavailable: ${models.join(', ')}`);

const createAgent = async (input) => {
  const data = await graphql(`mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
    createAgentDefinition(input: $input) { id name }
  }`, { input: { ...input, role: 'assistant', category: 'runtime-e2e' } });
  return data.createAgentDefinition;
};

const studentOne = await createAgent({
  name: `student-one-ac017-${marker.toLowerCase()}`,
  description: 'Configured student_one coordinator for AC-017 live event delivery validation.',
  instructions: `You are configured student_one. When the user tells you to delegate one task with exact JSON arguments, call delegate_task exactly once with those exact recipient_address and description values. Do not perform the delegated work yourself. After delegate_task succeeds, do not call another tool and wait. When you later receive ordinary messages from student_two, do not respond and do not delegate another task unless the user explicitly provides another exact delegation request.`,
  toolNames: ['delegate_task'],
});
const studentTwo = await createAgent({
  name: `student-two-ac017-${marker.toLowerCase()}`,
  description: 'Configured student_two direct task target for AC-017 live event delivery validation.',
  instructions: `You are configured student_two. For every direct delegated task, obey the task description exactly. When it instructs you to call send_message_to and get_handoff_rules, use those tools in the stated order with the exact arguments. Do not call submit_task_result. Do not delegate. After completing the exact sequence, reply with only the requested final marker.`,
  toolNames: ['send_message_to', 'get_handoff_rules'],
});

const teamData = await graphql(`mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
  createAgentTeamDefinition(input: $input) { id name }
}`, { input: {
  name: `AC017 Live Team ${marker}`,
  description: 'Two configured Codex Luna students for current-source direct task event and browser validation.',
  instructions: 'student_one delegates bounded direct tasks to student_two; identities remain exact and isolated.',
  coordinatorMemberName: 'student_one',
  nodes: [
    { memberName: 'student_one', ref: studentOne.id, refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'student_two', ref: studentTwo.id, refType: 'AGENT', refScope: 'SHARED' },
  ],
} });

const launchConfig = {
  llmModelIdentifier: 'gpt-5.6-luna',
  autoExecuteTools: true,
  skillAccessMode: 'NONE',
  runtimeKind: 'codex_app_server',
  workspaceRootPath,
};
const runData = await graphql(`mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
  createAgentTeamRun(input: $input) { success message teamRunId }
}`, { input: {
  teamDefinitionId: teamData.createAgentTeamDefinition.id,
  teamConfigs: [{ teamAddress: '/', ...launchConfig }],
  memberConfigs: [
    { memberAddress: '/student_one', agentDefinitionId: studentOne.id, ...launchConfig },
    { memberAddress: '/student_two', agentDefinitionId: studentTwo.id, ...launchConfig },
  ],
} });
if (!runData.createAgentTeamRun.success || !runData.createAgentTeamRun.teamRunId) throw new Error(JSON.stringify(runData));

const teamRunId = runData.createAgentTeamRun.teamRunId;
const resume = await graphql(`query Resume($teamRunId: String!) {
  getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree }
}`, { teamRunId });

const output = {
  createdAt: new Date().toISOString(), backendUrl, marker, modelCatalog: models,
  runtime: 'codex_app_server', model: 'gpt-5.6-luna', workspaceRootPath,
  studentOneDefinitionId: studentOne.id,
  studentTwoDefinitionId: studentTwo.id,
  teamDefinitionId: teamData.createAgentTeamDefinition.id,
  teamRunId,
  resumeConfig: resume.getTeamRunResumeConfig,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ marker, teamRunId, teamDefinitionId: output.teamDefinitionId, outputPath }, null, 2));
