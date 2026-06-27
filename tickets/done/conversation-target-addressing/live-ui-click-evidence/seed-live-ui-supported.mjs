import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const endpoint = process.env.GRAPHQL_ENDPOINT || 'http://127.0.0.1:18000/graphql';
const dataDir = process.env.DATA_DIR || '/tmp/autobyteus-live-ui-click-conversation-target';
const workspaceRootPath = path.join(dataDir, 'workspace-supported');
await mkdir(workspaceRootPath, { recursive: true });
async function gql(query, variables = {}) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { throw new Error(`Non-JSON GraphQL response: ${text}`); }
  if (!res.ok || json.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(json.errors || json, null, 2)}`);
  return json.data;
}
async function modelIds(runtimeKind) {
  const data = await gql(`query Models($runtimeKind: String) { availableLlmProvidersWithModels(runtimeKind: $runtimeKind) { models { modelIdentifier } } }`, { runtimeKind });
  return data.availableLlmProvidersWithModels.flatMap((p) => p.models.map((m) => m.modelIdentifier).filter(Boolean));
}
const autoModels = await modelIds('autobyteus');
const codexModels = await modelIds('codex_app_server');
if (!autoModels.includes('gpt-5.5')) throw new Error(`AutoByteus model gpt-5.5 unavailable. Models include: ${autoModels.slice(0, 40).join(', ')}`);
if (!codexModels.includes('gpt-5.5')) throw new Error(`Codex model gpt-5.5 unavailable. Models: ${codexModels.join(', ')}`);
const coordinatorModelIdentifier = 'gpt-5.5';
const childModelIdentifier = 'gpt-5.5';
const unique = `live_ui_click_supported_${Date.now()}_${randomUUID().slice(0, 8).replace(/-/g, '')}`;
const createdAgentDefinitionIds = [];
const createdTeamDefinitionIds = [];
async function createAgentDefinition(input) {
  const data = await gql(`mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id name } }`, { input: { role: 'assistant', category: 'runtime-e2e', ...input } });
  createdAgentDefinitionIds.push(data.createAgentDefinition.id);
  return data.createAgentDefinition;
}
async function createTeamDefinition(input) {
  const data = await gql(`mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id name } }`, { input: { category: 'runtime-e2e', ...input } });
  createdTeamDefinitionIds.push(data.createAgentTeamDefinition.id);
  return data.createAgentTeamDefinition;
}
const coordinator = await createAgentDefinition({
  name: `program_manager_${unique}`,
  description: 'Live UI click-through AutoByteus coordinator for task-team target addressing validation.',
  toolNames: ['delegate_task'],
  instructions: `You are a deterministic live UI test coordinator. If the user asks you to call delegate_task with exact JSON arguments, call delegate_task exactly once with those exact arguments and do not call any other tool. Do not explore the filesystem. After delegate_task returns, do not delegate additional tasks. Keep any plain text response under one short sentence.`,
});
const reviewLead = await createAgentDefinition({
  name: `review_lead_${unique}`,
  description: 'Codex GPT-5.5 review lead inside a task-team projection.',
  toolNames: ['submit_task_result'],
  instructions: `You are the review lead in a delegated task-team. When you receive a task delegation work packet, do not call submit_task_result unless a later user explicitly asks you to submit a result. For ordinary chat messages, reply in one short sentence and include the exact token if the user provides one. Do not run shell commands or modify files.`,
});
const qa = await createAgentDefinition({
  name: `qa_specialist_${unique}`,
  description: 'Codex GPT-5.5 QA specialist inside a task-team projection.',
  toolNames: ['submit_task_result'],
  instructions: `You are the QA specialist in a delegated task-team. Do not call submit_task_result unless a later user explicitly asks you to submit a result. For ordinary chat messages, reply in one short sentence. Do not run shell commands or modify files.`,
});
const childTeamDefinition = await createTeamDefinition({
  name: `BuildSquad_${unique}`,
  description: 'Nested build squad used as the live target for task-team delegation.',
  instructions: 'The review lead is the ingress coordinator; members keep task-team execution active for UI target-addressing validation.',
  coordinatorMemberName: 'review_lead',
  nodes: [
    { memberName: 'review_lead', ref: reviewLead.id, refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'qa_specialist', ref: qa.id, refType: 'AGENT', refScope: 'SHARED' },
  ],
});
const parentTeamDefinition = await createTeamDefinition({
  name: `ParentDeliveryTeam_${unique}`,
  description: 'Parent team used for real frontend task-team target-addressing validation.',
  instructions: 'The program manager delegates one task to BuildSquad through delegate_task; BuildSquad remains active for follow-up chat.',
  coordinatorMemberName: 'program_manager',
  nodes: [
    { memberName: 'program_manager', ref: coordinator.id, refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'BuildSquad', ref: childTeamDefinition.id, refType: 'AGENT_TEAM', refScope: 'SHARED' },
  ],
});
const run = await gql(`mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }`, {
  input: {
    teamDefinitionId: parentTeamDefinition.id,
    memberConfigs: [
      {
        memberName: 'program_manager', memberRouteKey: 'program_manager', agentDefinitionId: coordinator.id,
        llmModelIdentifier: coordinatorModelIdentifier, autoExecuteTools: true, skillAccessMode: 'NONE', runtimeKind: 'autobyteus', workspaceRootPath,
        llmConfig: { temperature: 0, tool_choice: 'required' },
      },
      {
        memberName: 'review_lead', memberRouteKey: 'BuildSquad/review_lead', agentDefinitionId: reviewLead.id,
        llmModelIdentifier: childModelIdentifier, autoExecuteTools: true, skillAccessMode: 'NONE', runtimeKind: 'codex_app_server', workspaceRootPath,
      },
      {
        memberName: 'qa_specialist', memberRouteKey: 'BuildSquad/qa_specialist', agentDefinitionId: qa.id,
        llmModelIdentifier: childModelIdentifier, autoExecuteTools: true, skillAccessMode: 'NONE', runtimeKind: 'codex_app_server', workspaceRootPath,
      },
    ],
  },
});
if (!run.createAgentTeamRun.success || !run.createAgentTeamRun.teamRunId) throw new Error(`createAgentTeamRun failed: ${JSON.stringify(run.createAgentTeamRun)}`);
const teamRunId = run.createAgentTeamRun.teamRunId;
const resume = await gql(`query TeamResume($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive metadata } }`, { teamRunId });
const result = { unique, coordinatorModelIdentifier, childModelIdentifier, workspaceRootPath, createdAgentDefinitionIds, createdTeamDefinitionIds, agents: { coordinator, reviewLead, qa }, childTeamDefinition, parentTeamDefinition, teamRunId, run: run.createAgentTeamRun, resume: resume.getTeamRunResumeConfig, createdAt: new Date().toISOString(), note: 'Coordinator uses AutoByteus runtime because delegate_task is exposed there; task-team child members use codex_app_server gpt-5.5.' };
console.log(JSON.stringify(result, null, 2));
