import WebSocket from '../../../../../../../autobyteus-server-ts/node_modules/ws/wrapper.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = new URL('./', import.meta.url);
const port = 8695;
const gql = async (query, variables = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return { status: response.status, body: await response.json() };
};

const workspace = path.resolve(new URL('workspace/', base).pathname);
await fs.mkdir(workspace, { recursive: true });
const input = {
  agentOrgDefinitionId: 'aorg-direct-agents-org',
  rootConfiguration: {
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'gpt-5.6-sol',
    llmConfig: { reasoning_effort: 'low' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    workspaceRootPath: workspace,
  },
  teamOverrides: [],
  agentOverrides: [],
};
const created = await gql(
  'mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
  { input },
);
if (!created.body.data?.createAgentOrgRun?.success) throw new Error(JSON.stringify(created));
const orgRunId = created.body.data.createAgentOrgRun.agentOrgRunId;
const historyQuery = 'query { listCollaborationRootHistory { __typename ... on AgentOrgRootHistoryObject { root_run_id is_active summary org } ... on AgentTeamRootHistoryObject { root_run_id } } }';
const initialHistory = await gql(historyQuery);
const before = initialHistory.body.data.listCollaborationRootHistory.find((row) => row.root_run_id === orgRunId);
const lead = before.org.rootOrg.members.find((member) => member.address === '/lead').agentRunId;
const indexPath = path.resolve(new URL('server-data/memory/agent_org_run_history_index.json', base).pathname);
const backup = `${indexPath}.api-rev-011-pre-injection`;
await fs.copyFile(indexPath, new URL('index-before-rerun.json', base));
await fs.rename(indexPath, backup);
await fs.mkdir(indexPath);

const observed = { created, orgRunId, lead, before, events: [] };
let socket;
try {
  socket = new WebSocket(`ws://127.0.0.1:${port}/ws/agent-org/${encodeURIComponent(orgRunId)}`);
  let readyResolve;
  const ready = new Promise((resolve) => { readyResolve = resolve; });
  let ackResolve;
  const ackPromise = new Promise((resolve) => { ackResolve = resolve; });
  let closeResolve;
  const closePromise = new Promise((resolve) => { closeResolve = resolve; });
  socket.on('message', (data) => {
    const message = JSON.parse(String(data));
    const event = { at: new Date().toISOString(), type: message.type, payload: message.payload };
    observed.events.push(event);
    if (message.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT') readyResolve();
    if (message.type === 'AGENT_COMMAND_ACK' && message.payload.command_id === 'metadata-failure-rerun') ackResolve(event);
  });
  socket.on('close', (code, reason) => {
    observed.socketClose = { at: new Date().toISOString(), code, reason: String(reason) };
    closeResolve(observed.socketClose);
  });
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  await ready;
  const content = 'Return exactly APIREV11-METADATA-WORK-ACCEPTED-RERUN while derived summary persistence is intentionally unavailable.';
  observed.content = content;
  socket.send(JSON.stringify({
    type: 'SEND_MESSAGE',
    payload: {
      root_subject_kind: 'agent_org',
      root_run_id: orgRunId,
      target_agent_run_id: lead,
      command_id: 'metadata-failure-rerun',
      content,
      context_file_paths: [],
      image_urls: [],
      message_id: 'metadata-message-rerun',
      dedupe_key: `metadata-rerun:${orgRunId}`,
    },
  }));
  const ack = await Promise.race([
    ackPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ack timeout')), 30_000)),
  ]);
  observed.ack = ack;
  await fs.writeFile(new URL('accepted-ack-rerun.json', base), `${JSON.stringify(observed, null, 2)}\n`);
  await Promise.race([closePromise, new Promise((resolve) => setTimeout(resolve, 5_000))]);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/graphql`);
    observed.healthAfterAck = { reachable: true, status: response.status };
  } catch (error) {
    observed.healthAfterAck = { reachable: false, error: String(error) };
  }
} catch (error) {
  observed.probeError = String(error?.stack ?? error);
} finally {
  socket?.close(1000);
  await fs.rmdir(indexPath).catch(() => undefined);
  await fs.rename(backup, indexPath);
  observed.indexRestored = true;
  await fs.copyFile(indexPath, new URL('index-restored-rerun.json', base));
  await fs.writeFile(new URL('probe-rerun-result.json', base), `${JSON.stringify(observed, null, 2)}\n`);
}

console.log(JSON.stringify({
  orgRunId: observed.orgRunId,
  lead: observed.lead,
  ackState: observed.ack?.payload?.state,
  socketClose: observed.socketClose,
  healthAfterAck: observed.healthAfterAck,
  probeError: observed.probeError,
  indexRestored: observed.indexRestored,
}, null, 2));
