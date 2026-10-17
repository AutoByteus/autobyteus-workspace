// Prepare the AC-011 verification instance: a Project Task Manager run (Codex) that delegates one Task to the Article Writing Team.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/autobyteus-web/package.json');
const WebSocket = require('ws');
const base = process.argv[2]; const ws = base.replace(/^http/, 'ws');
const gql = async (query, variables = {}) => {
  const r = await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data;
};
const [projectId, existingTaskId] = process.argv.slice(3);
const taskId = existingTaskId ?? (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}',
  { i: { projectId, description: 'Write a short article (about 150 words) titled "Why status colours help" explaining how a coloured status dot tells you at a glance whether a team is working, idle, failed or stopped. Have it reviewed once, then finish.' } })).createProjectTask.taskId;
const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: {
  agentDefinitionId: 'project-task-manager', workspaceId: 'temp_ws_default', workspaceRootPath: process.env.WS_ROOT, llmModelIdentifier: 'gpt-5.6-sol', llmConfig: null,
  autoExecuteTools: true, runtimeKind: 'codex_app_server' } })).createAgentRun;
if (!run.success) throw new Error(run.message);
const socket = new WebSocket(`${ws}/ws/agent/${run.runId}`);
await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: run.runId, message_id: `verify-${randomUUID()}`,
  dedupe_key: `agent_run_input:verify:${randomUUID()}`, context_file_paths: [], image_urls: [],
  content: `In the project "Team status check" (project id ${projectId}) there is one Task (task id ${taskId}). I approve dispatching it now: delegate that Task to the Article Writing Team (use list_available_agents to get its exact address, then delegate_task with task_id ${taskId}). Do not ask me for confirmation; just dispatch it and tell me when it is sent.` } }));
await new Promise((r) => setTimeout(r, 1500)); socket.close();
console.log(JSON.stringify({ projectId, taskId, agentRunId: run.runId }));
