import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const root = process.cwd();
const outputDir = path.join(root, 'tickets/in-progress/event-monitor-history-transparency/probes/api-e2e/full-stack-runtime');
const require = createRequire(path.join(root, 'autobyteus-server-ts/package.json'));
const WebSocket = require('ws');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readId = async (file, field) => {
  const payload = JSON.parse(await fs.readFile(path.join(outputDir, file), 'utf8'));
  return payload.data[field].runId ?? payload.data[field].teamRunId;
};
const summarize = (message) => {
  const payload = message?.payload && typeof message.payload === 'object' ? message.payload : {};
  const text = [payload.delta, payload.text, payload.content, payload.result]
    .find((value) => typeof value === 'string');
  const summary = {
    type: message.type,
    agentName: payload.agent_name ?? null,
    memberAddress: payload.member_address ?? payload.member_route_key ?? null,
    status: payload.status ?? null,
    segmentType: payload.segment_type ?? null,
    toolName: payload.tool_name ?? payload.metadata?.tool_name ?? null,
    invocationId: payload.invocation_id ?? payload.id ?? null,
  };
  if (message.type === 'SYSTEM_INSTRUCTIONS_SUPPLIED') {
    const content = typeof payload.content === 'string' ? payload.content : '';
    return { ...summary, rawTraceId: payload.trace_id ?? payload.id ?? null, contentLength: content.length, contentSha256: sha256(content) };
  }
  return text ? { ...summary, textLength: text.length, textSha256: sha256(text), tokenPreview: text.slice(0, 120) } : summary;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runFlow = async ({ id, socketUrl, content, token, requireOpenTab = false, agentRunId = null }) => {
  const messages = [];
  const summaries = [];
  const socket = new WebSocket(socketUrl);
  socket.on('message', (raw) => {
    const parsed = JSON.parse(raw.toString());
    messages.push(parsed);
    summaries.push(summarize(parsed));
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${id} socket open timeout`)), 15000);
    socket.once('open', () => { clearTimeout(timer); resolve(); });
    socket.once('error', reject);
  });
  const connectedDeadline = Date.now() + 15000;
  while (!messages.some((message) => message.type === 'CONNECTED')) {
    if (Date.now() > connectedDeadline) throw new Error(`${id} CONNECTED timeout`);
    await wait(100);
  }
  const messageId = `api-e2e-${randomUUID()}`;
  const payload = {
      content,
      context_file_paths: [],
      image_urls: [],
      message_id: messageId,
      dedupe_key: `agent_run_input:api-e2e:${messageId}`,
  };
  if (agentRunId) payload.agent_run_id = agentRunId;
  socket.send(JSON.stringify({
    type: 'SEND_MESSAGE',
    payload,
  }));
  const deadline = Date.now() + 360000;
  let tokenSeen = false;
  let openTabSucceeded = false;
  let runningSeen = false;
  while (Date.now() < deadline) {
    tokenSeen = tokenSeen || messages.some((message) => JSON.stringify(message.payload ?? {}).includes(token));
    runningSeen = runningSeen || messages.some((message) => message.type === 'AGENT_STATUS' && message.payload?.status === 'running');
    openTabSucceeded = openTabSucceeded || messages.some((message) =>
      message.type === 'TOOL_EXECUTION_SUCCEEDED'
      && (message.payload?.tool_name === 'open_tab' || message.payload?.metadata?.tool_name === 'open_tab'));
    const lastIdleIndex = messages.findLastIndex((message) => message.type === 'AGENT_STATUS' && message.payload?.status === 'idle');
    const lastRunningIndex = messages.findLastIndex((message) => message.type === 'AGENT_STATUS' && message.payload?.status === 'running');
    if (runningSeen && tokenSeen && (!requireOpenTab || openTabSucceeded) && lastIdleIndex > lastRunningIndex) break;
    await wait(250);
  }
  const evidence = {
    id,
    result: runningSeen && tokenSeen && (!requireOpenTab || openTabSucceeded) ? 'Pass' : 'Fail',
    socketUrl,
    messageId,
    token,
    runningSeen,
    tokenSeen,
    openTabSucceeded,
    messageCount: messages.length,
    messageTypeCounts: Object.fromEntries([...new Set(messages.map((message) => message.type))].map((type) => [type, messages.filter((message) => message.type === type).length])),
    systemInstructionEvents: summaries.filter((entry) => entry.type === 'SYSTEM_INSTRUCTIONS_SUPPLIED'),
    summaries,
  };
  await fs.writeFile(path.join(outputDir, `${id}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  socket.close();
  if (evidence.result !== 'Pass') throw new Error(`${id} failed: ${JSON.stringify({ runningSeen, tokenSeen, openTabSucceeded, tail: summaries.slice(-30) })}`);
  return evidence;
};

const dailyRunId = await readId('daily-create.json', 'createAgentRun');
const teamRunId = await readId('team-create.json', 'createAgentTeamRun');
const teamResume = JSON.parse(await fs.readFile(path.join(outputDir, 'team-resume.json'), 'utf8'));
const professorRunId = teamResume.data.getTeamRunResumeConfig.executionTree.root_team.members
  .find((member) => member.address === '/professor').agent_run_id;
const teamOnly = process.argv.includes('--team-only');
const daily = teamOnly ? { result: 'Skipped' } : await runFlow({
  id: 'daily-assistant-open-tab-flow',
  socketUrl: `ws://127.0.0.1:54587/ws/agent/${dailyRunId}`,
  content: 'Use the open_tab tool exactly once to open http://127.0.0.1:54588/ and wait for domcontentloaded. Do not use any other tool. After open_tab succeeds, reply with exactly DAILY_ASSISTANT_FRONTEND_OPEN_OK and nothing else.',
  token: 'DAILY_ASSISTANT_FRONTEND_OPEN_OK',
  requireOpenTab: true,
});
const classroom = await runFlow({
  id: 'classroom-team-flow',
  socketUrl: `ws://127.0.0.1:54587/ws/agent-team/${teamRunId}`,
  content: 'Run one file-backed classroom round. Ask /student to solve 17 + 25 and explain the addition briefly. Follow the team protocol, wait for the student reply, read the answer file, and then reply to me with exactly CLASSROOM_ROUNDTRIP_OK if the answer is correct.',
  token: 'CLASSROOM_ROUNDTRIP_OK',
  agentRunId: professorRunId,
});
console.log(JSON.stringify({ daily: daily.result, classroom: classroom.result, dailyRunId, teamRunId, professorRunId }));
