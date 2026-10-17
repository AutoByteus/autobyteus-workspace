// A second Task the Project Task Manager dispatches to the Article Writing Team and keeps open (not DONE), so the delegated Team row stays visible.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status/autobyteus-web/package.json');
const WebSocket = require('ws');
const [base, projectId, runId] = process.argv.slice(2);
const gql = async (query, variables = {}) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const taskId = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId,
  description: 'Write a four-line poem about a team of agents working together. Have it reviewed once. The user will review the result and may ask the team for changes.' } })).createProjectTask.taskId;
const socket = new WebSocket(`${base.replace(/^http/, 'ws')}/ws/agent/${runId}`);
await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `verify-${randomUUID()}`,
  dedupe_key: `agent_run_input:verify:${randomUUID()}`, context_file_paths: [], image_urls: [],
  content: `There is a new Task ${taskId} in the same project. I approve dispatching it now to the Article Writing Team with delegate_task (task_id ${taskId}); do not ask me first. Important: when the team reports back, do NOT set this Task to DONE or CANCELLED. Keep it IN_PROGRESS, because I want to review the result myself and may ask the team for changes. Just tell me when it is dispatched and when the team has replied.` } }));
await new Promise((res) => setTimeout(res, 1500)); socket.close();
console.log(JSON.stringify({ taskId }));
