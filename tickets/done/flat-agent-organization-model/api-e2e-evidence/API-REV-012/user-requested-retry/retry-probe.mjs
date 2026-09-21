import WebSocket from '/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-server-ts/node_modules/ws/wrapper.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = path.dirname(new URL(import.meta.url).pathname);
const port = 8696;
const graphql = async (query, variables = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return { status: response.status, body };
};
const historyQuery = 'query { listCollaborationRootHistory { __typename ... on AgentOrgRootHistoryObject { root_run_id is_active summary org } ... on AgentTeamRootHistoryObject { root_run_id } } }';
const history = async (id) => (await graphql(historyQuery)).body.data.listCollaborationRootHistory.find((row) => row.root_run_id === id);
const createOrg = async () => {
  const input = {
    agentOrgDefinitionId: 'aorg-direct-agents-org',
    rootConfiguration: {
      runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.6-sol',
      llmConfig: { reasoning_effort: 'low' }, autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: path.join(dir, 'workspace-default'),
    }, teamOverrides: [], agentOverrides: [],
  };
  const response = await graphql('mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input });
  const result = response.body.data.createAgentOrgRun;
  if (!result.success) throw new Error(JSON.stringify(result));
  const row = await history(result.agentOrgRunId);
  const lead = row.org.rootOrg.members.find((member) => member.address === '/lead').agentRunId;
  return { orgRunId: result.agentOrgRunId, lead, row };
};
const connectAndSend = async ({ orgRunId, lead }, commandId, content) => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/agent-org/${encodeURIComponent(orgRunId)}`);
  const events = [];
  let readyResolve, ackResolve, closeResolve;
  const ready = new Promise((resolve) => { readyResolve = resolve; });
  const ack = new Promise((resolve) => { ackResolve = resolve; });
  const closed = new Promise((resolve) => { closeResolve = resolve; });
  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw));
    const event = { at: new Date().toISOString(), type: message.type, payload: message.payload };
    events.push(event);
    if (message.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT') readyResolve();
    if (message.type === 'AGENT_COMMAND_ACK' && message.payload.command_id === commandId) ackResolve(event);
  });
  socket.on('close', (code, reason) => closeResolve({ at: new Date().toISOString(), code, reason: String(reason) }));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await ready;
  socket.send(JSON.stringify({
    type: 'SEND_MESSAGE',
    payload: {
      root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: lead,
      command_id: commandId, content, context_file_paths: [], image_urls: [],
      message_id: `${commandId}-message`, dedupe_key: `${commandId}:${orgRunId}`,
    },
  }));
  const ackEvent = await Promise.race([ack, new Promise((_, reject) => setTimeout(() => reject(new Error(`${commandId} ACK timeout`)), 30_000))]);
  return { socket, events, ack: ackEvent, closed };
};
const sha = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');

const result = { startedAt: new Date().toISOString(), port };
const controlContent = 'APIREV12 intact summary write keeps this server available';
const controlOrg = await createOrg();
const control = await connectAndSend(controlOrg, 'api-rev-012-control', controlContent);
await new Promise((resolve) => setTimeout(resolve, 1_000));
const controlHistory = await history(controlOrg.orgRunId);
const controlHealth = await graphql('query { __typename }');
result.control = {
  ...controlOrg, content: controlContent, ack: control.ack,
  persistedSummary: controlHistory.summary,
  healthAfterMessage: { reachable: true, status: controlHealth.status },
  eventTypes: control.events.map((event) => event.type),
};
await fs.writeFile(path.join(dir, 'control-result.json'), `${JSON.stringify(result.control, null, 2)}\n`);
if (control.ack.payload.state !== 'accepted' || controlHistory.summary !== controlContent) {
  throw new Error(`Control failed: ${JSON.stringify(result.control)}`);
}
control.socket.close(1000);

const failingOrg = await createOrg();
const indexPath = path.join(dir, 'server-data/memory/agent_org_run_history_index.json');
const backupPath = `${indexPath}.api-rev-012-backup`;
await fs.copyFile(indexPath, path.join(dir, 'index-before-injection.json'));
const beforeSha = await sha(indexPath);
await fs.rename(indexPath, backupPath);
await fs.mkdir(indexPath);
let failing;
try {
  const failureContent = 'APIREV12 accepted message with intentionally failed derived index';
  failing = await connectAndSend(failingOrg, 'api-rev-012-failure', failureContent);
  result.failure = { ...failingOrg, content: failureContent, ack: failing.ack, eventTypes: failing.events.map((event) => event.type) };
  await fs.writeFile(path.join(dir, 'failure-accepted-ack.json'), `${JSON.stringify(result.failure, null, 2)}\n`);
  result.failure.socketClose = await Promise.race([failing.closed, new Promise((resolve) => setTimeout(() => resolve(null), 5_000))]);
  try {
    const response = await graphql('query { __typename }');
    result.failure.healthAfterAck = { reachable: true, status: response.status };
  } catch (error) {
    result.failure.healthAfterAck = { reachable: false, error: String(error) };
  }
} catch (error) {
  result.failure = { ...(result.failure ?? failingOrg), probeError: String(error?.stack ?? error) };
} finally {
  failing?.socket?.close(1000);
  await fs.rmdir(indexPath).catch(() => undefined);
  await fs.rename(backupPath, indexPath);
  await fs.copyFile(indexPath, path.join(dir, 'index-restored.json'));
  result.cleanup = { indexRestored: true, beforeSha, restoredSha: await sha(indexPath) };
}
result.finishedAt = new Date().toISOString();
await fs.writeFile(path.join(dir, 'retry-result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  control: { orgRunId: result.control.orgRunId, ack: result.control.ack.payload.state, summary: result.control.persistedSummary, health: result.control.healthAfterMessage },
  failure: { orgRunId: result.failure.orgRunId, ack: result.failure.ack?.payload?.state, socketClose: result.failure.socketClose, health: result.failure.healthAfterAck, error: result.failure.probeError },
  cleanup: result.cleanup,
}, null, 2));
