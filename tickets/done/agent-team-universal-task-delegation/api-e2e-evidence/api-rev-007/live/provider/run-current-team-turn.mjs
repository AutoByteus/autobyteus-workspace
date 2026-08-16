import { writeFile } from 'node:fs/promises';

const [teamRunId, agentRunId, outputPath, ...promptParts] = process.argv.slice(2);
if (!teamRunId || !agentRunId || !outputPath || promptParts.length === 0) {
  throw new Error('usage: node run-current-team-turn.mjs <teamRunId> <agentRunId> <outputPath> <prompt>');
}

const prompt = promptParts.join(' ');
const graphqlUrl = process.env.GRAPHQL_URL ?? 'http://127.0.0.1:60312/graphql';
const teamWsUrl = process.env.TEAM_WS_URL ?? 'ws://127.0.0.1:60312/ws/agent-team';
const timeoutMs = Number(process.env.TURN_TIMEOUT_MS ?? 300000);
const waitForTaskTerminal = process.env.WAIT_FOR_TASK_TERMINAL === '1';
const startedAt = Date.now();
const messages = [];
const observations = [];
let sent = false;
let terminalAt = null;
let websocketError = null;

const gql = async (query, variables = {}) => {
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) {
    throw new Error(`GraphQL failed: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
};

const snapshotQuery = `query CurrentTeamEvidence($teamRunId: String!) {
  getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree }
  getTaskDelegationRecords(teamRunId: $teamRunId) {
    taskId delegatorAgentRunId recipientAddress targetAgentRunId targetTeamRunId status description createdAt
    referenceFiles { referenceId path type createdAt updatedAt }
    updates { kind submissionId reviewId interruptionId reviewedSubmissionId decision content createdAt referenceFiles { referenceId path type createdAt updatedAt } }
  }
  getTeamCommunicationMessages(teamRunId: $teamRunId) {
    messageId senderAgentRunId receiverAgentRunId content messageType createdAt
    referenceFiles { referenceId path type createdAt updatedAt }
  }
}`;

const completionTypes = new Set(['TURN_COMPLETED', 'TURN_FAILED', 'TURN_CANCELLED']);
const initialSnapshot = waitForTaskTerminal ? await gql(snapshotQuery, { teamRunId }) : null;
const initialTaskIds = new Set((initialSnapshot?.getTaskDelegationRecords ?? []).map((task) => task.taskId));
await new Promise((resolve) => {
  const ws = new WebSocket(`${teamWsUrl}/${teamRunId}`);
  let pollInFlight = false;
  const poll = waitForTaskTerminal ? setInterval(async () => {
    if (pollInFlight) return;
    pollInFlight = true;
    try {
      const state = await gql(snapshotQuery, { teamRunId });
      const tasks = state.getTaskDelegationRecords ?? [];
      const newTasks = tasks.filter((task) => !initialTaskIds.has(task.taskId));
      if (newTasks.length > 0 && newTasks.every((task) => ['accepted', 'interrupted'].includes(task.status))) {
        clearInterval(poll);
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolve();
      }
    } catch {}
    finally { pollInFlight = false; }
  }, 2000) : null;
  const timeout = setTimeout(() => {
    websocketError = `timeout after ${timeoutMs}ms`;
    if (poll) clearInterval(poll);
    try { ws.close(); } catch {}
    resolve();
  }, timeoutMs);

  ws.addEventListener('message', (event) => {
    const raw = String(event.data);
    let message;
    try { message = JSON.parse(raw); } catch { message = { type: 'UNPARSEABLE', raw }; }
    const atMs = Date.now() - startedAt;
    messages.push({ atMs, message });
    const payload = message.payload ?? {};
    observations.push({
      atMs,
      type: message.type,
      agentRunId: payload.agent_run_id ?? null,
      status: payload.status ?? payload.state ?? null,
      code: payload.code ?? null,
      taskEvent: payload.event_type ?? null,
      taskId: payload.task?.task_id ?? payload.task_id ?? null,
      segmentType: payload.segment_type ?? null,
      toolName: payload.tool_name ?? null,
    });
    if (message.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT' && !sent) {
      sent = true;
      ws.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        payload: {
          content: prompt,
          context_file_paths: [],
          image_urls: [],
          agent_run_id: agentRunId,
          message_id: `api-rev-007-${crypto.randomUUID()}`,
          dedupe_key: `api-rev-007-${crypto.randomUUID()}`,
        },
      }));
    }
    if (completionTypes.has(message.type) && payload.agent_run_id === agentRunId) {
      terminalAt = { type: message.type, atMs };
      if (!waitForTaskTerminal) setTimeout(() => { clearTimeout(timeout); try { ws.close(); } catch {} resolve(); }, 12000);
    }
  });
  ws.addEventListener('error', (event) => {
    websocketError = event.message ?? 'websocket error';
  });
  ws.addEventListener('close', () => {
    if (poll) clearInterval(poll);
    clearTimeout(timeout);
    resolve();
  });
});

let finalSnapshot = null;
try { finalSnapshot = await gql(snapshotQuery, { teamRunId }); }
catch (error) { finalSnapshot = { snapshotError: String(error) }; }

const result = {
  teamRunId,
  agentRunId,
  prompt,
  startedAt: new Date(startedAt).toISOString(),
  durationMs: Date.now() - startedAt,
  sent,
  terminalAt,
  websocketError,
  observations,
  messages,
  finalSnapshot,
};
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  teamRunId,
  agentRunId,
  durationMs: result.durationMs,
  sent,
  terminalAt,
  websocketError,
  messageCount: messages.length,
  typeCounts: messages.reduce((acc, entry) => {
    acc[entry.message.type] = (acc[entry.message.type] ?? 0) + 1;
    return acc;
  }, {}),
  tasks: finalSnapshot?.getTaskDelegationRecords ?? null,
  communications: finalSnapshot?.getTeamCommunicationMessages ?? null,
}, null, 2));
