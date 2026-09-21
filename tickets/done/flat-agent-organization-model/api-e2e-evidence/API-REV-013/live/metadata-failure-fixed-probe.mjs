import WebSocket from '/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/autobyteus-server-ts/node_modules/ws/wrapper.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = path.dirname(new URL(import.meta.url).pathname);
const port = 8697;
const indexPath = path.join(dir, 'server-data/memory/agent_org_run_history_index.json');
const backupPath = `${indexPath}.api-rev-013-backup`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');

const graphql = async (query, variables = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
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
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.6-sol',
      llmConfig: { reasoning_effort: 'low' },
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      workspaceRootPath: path.join(dir, 'workspace-default'),
    },
    teamOverrides: [],
    agentOverrides: [],
  };
  const response = await graphql('mutation CreateAgentOrgRun($input: CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input });
  const created = response.body.data.createAgentOrgRun;
  if (!created.success) throw new Error(JSON.stringify(created));
  const row = await history(created.agentOrgRunId);
  const lead = row.org.rootOrg.members.find((member) => member.address === '/lead').agentRunId;
  return { orgRunId: created.agentOrgRunId, lead };
};

const connect = async ({ orgRunId }) => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/agent-org/${encodeURIComponent(orgRunId)}`);
  const events = [];
  const ackResolvers = new Map();
  let readyResolve;
  let closeResolve;
  const ready = new Promise((resolve) => { readyResolve = resolve; });
  const closed = new Promise((resolve) => { closeResolve = resolve; });
  socket.on('message', (raw) => {
    const message = JSON.parse(String(raw));
    const event = { at: new Date().toISOString(), type: message.type, payload: message.payload };
    events.push(event);
    if (message.type === 'ROOT_EXECUTION_VIEW_SNAPSHOT') readyResolve();
    if (message.type === 'AGENT_COMMAND_ACK') ackResolvers.get(message.payload.command_id)?.(event);
  });
  socket.on('close', (code, reason) => closeResolve({ at: new Date().toISOString(), code, reason: String(reason) }));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await Promise.race([ready, wait(30_000).then(() => { throw new Error('snapshot timeout'); })]);
  return { socket, events, ackResolvers, closed };
};

const send = async (connection, org, commandId, content) => {
  const ack = new Promise((resolve) => connection.ackResolvers.set(commandId, resolve));
  connection.socket.send(JSON.stringify({
    type: 'SEND_MESSAGE',
    payload: {
      root_subject_kind: 'agent_org',
      root_run_id: org.orgRunId,
      target_agent_run_id: org.lead,
      command_id: commandId,
      content,
      context_file_paths: [],
      image_urls: [],
      message_id: `${commandId}-message`,
      dedupe_key: `${commandId}:${org.orgRunId}`,
    },
  }));
  return Promise.race([ack, wait(30_000).then(() => { throw new Error(`${commandId} ACK timeout`); })]);
};

const result = { startedAt: new Date().toISOString(), port };
const failingOrg = await createOrg();
const laterOrg = await createOrg();
const failingConnection = await connect(failingOrg);
const laterConnection = await connect(laterOrg);
result.orgs = { failingOrg, laterOrg };

await fs.copyFile(indexPath, path.join(dir, 'index-before-injection.json'));
const beforeSha = await sha(indexPath);
await fs.rename(indexPath, backupPath);
await fs.mkdir(indexPath);

try {
  const failureContent = 'APIREV13 accepted message with intentionally failed derived index';
  const failureAck = await send(failingConnection, failingOrg, 'api-rev-013-failure', failureContent);
  await wait(2_000);
  let healthAfterFailure;
  try {
    const response = await graphql('query { __typename }');
    healthAfterFailure = { reachable: true, status: response.status };
  } catch (error) {
    healthAfterFailure = { reachable: false, error: String(error) };
  }
  const prematureClose = await Promise.race([failingConnection.closed, wait(250).then(() => null)]);
  result.failure = {
    content: failureContent,
    ack: failureAck,
    socketReadyStateAfterFailure: failingConnection.socket.readyState,
    prematureClose,
    healthAfterFailure,
    eventTypes: failingConnection.events.map((event) => event.type),
  };
  await fs.writeFile(path.join(dir, 'failure-contained.json'), `${JSON.stringify(result.failure, null, 2)}\n`);

  await fs.rmdir(indexPath);
  await fs.rename(backupPath, indexPath);
  await fs.copyFile(indexPath, path.join(dir, 'index-restored-before-later-write.json'));
  const afterRestoreSha = await sha(indexPath);
  const restoredRows = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  const restoredFailing = restoredRows.find((row) => row.orgRunId === failingOrg.orgRunId);
  result.restore = {
    beforeSha,
    afterRestoreSha,
    restoredFailingSummary: restoredFailing?.summary ?? null,
  };

  const laterContent = 'APIREV13 later same-path write persists after contained failure';
  const laterAck = await send(laterConnection, laterOrg, 'api-rev-013-later-success', laterContent);
  await wait(1_000);
  const laterHistory = await history(laterOrg.orgRunId);
  const failedHistory = await history(failingOrg.orgRunId);
  const healthAfterLater = await graphql('query { __typename }');
  const finalRows = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  result.laterSuccess = {
    content: laterContent,
    ack: laterAck,
    persistedSummary: laterHistory?.summary ?? null,
    failedSummaryAfterLaterWrite: failedHistory?.summary ?? null,
    fileFailedSummaryAfterLaterWrite: finalRows.find((row) => row.orgRunId === failingOrg.orgRunId)?.summary ?? null,
    fileLaterSummary: finalRows.find((row) => row.orgRunId === laterOrg.orgRunId)?.summary ?? null,
    healthAfterLater: { reachable: true, status: healthAfterLater.status },
    eventTypes: laterConnection.events.map((event) => event.type),
  };
  await fs.copyFile(indexPath, path.join(dir, 'index-after-later-success.json'));
  await fs.writeFile(path.join(dir, 'later-success.json'), `${JSON.stringify(result.laterSuccess, null, 2)}\n`);

  const assertions = {
    acceptedFailureAck: failureAck.payload.state === 'accepted',
    processReachableAfterFailure: healthAfterFailure.reachable === true && healthAfterFailure.status === 200,
    failureSocketRemainedOpen: failingConnection.socket.readyState === WebSocket.OPEN && prematureClose === null,
    indexRestoreExact: beforeSha === afterRestoreSha,
    noFailedSummaryReplayOrRelabel: (failedHistory?.summary ?? '') === '' && (finalRows.find((row) => row.orgRunId === failingOrg.orgRunId)?.summary ?? '') === '',
    acceptedLaterAck: laterAck.payload.state === 'accepted',
    laterSamePathPersisted: laterHistory?.summary === laterContent && finalRows.find((row) => row.orgRunId === laterOrg.orgRunId)?.summary === laterContent,
    processReachableAfterLaterSuccess: healthAfterLater.status === 200,
  };
  result.assertions = assertions;
  if (Object.values(assertions).some((value) => value !== true)) {
    throw new Error(`Assertion failure: ${JSON.stringify(assertions)}`);
  }
} finally {
  try {
    const stat = await fs.stat(indexPath);
    if (stat.isDirectory()) {
      await fs.rmdir(indexPath);
      await fs.rename(backupPath, indexPath);
    }
  } catch {
    try { await fs.rename(backupPath, indexPath); } catch {}
  }
  failingConnection.socket.close(1000);
  laterConnection.socket.close(1000);
}

result.finishedAt = new Date().toISOString();
await fs.writeFile(path.join(dir, 'metadata-failure-fixed-result.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
