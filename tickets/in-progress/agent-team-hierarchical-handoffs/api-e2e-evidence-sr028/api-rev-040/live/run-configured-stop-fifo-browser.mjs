import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import WebSocket from '../../../../../../node_modules/.pnpm/ws@8.19.0/node_modules/ws/wrapper.mjs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const base = 'http://127.0.0.1:31240';
const gqlEndpoint = 'http://127.0.0.1:60240/graphql';
const wsBase = 'ws://127.0.0.1:60240';
const outDir = new URL('./provider/', import.meta.url).pathname;
const agentName = 'API REV 040 Claude Stop FIFO Agent';
const expectedToken = `API40_FIFO_AFTER_STOP_${randomUUID().replaceAll('-', '_')}`;
fs.mkdirSync(outDir, { recursive: true });

async function gql(query, variables = {}) {
  const response = await fetch(gqlEndpoint, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) throw new Error(`GRAPHQL_FAILED:${response.status}:${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

async function ensureAgentDefinition() {
  const listed = await gql('query { agentDefinitions { id name } }');
  const existing = listed.agentDefinitions.find((agent) => agent.name === agentName);
  if (existing) return existing.id;
  const created = await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`, {
    input: {
      name: agentName,
      role: 'assistant',
      description: 'Disposable API-REV-040 configured Claude stop/FIFO browser agent.',
      instructions: 'Follow the user request exactly. When asked for an exact token, output that token exactly and nothing else.',
      category: 'runtime-e2e',
      toolNames: ['write_file'],
      skillNames: [],
    },
  });
  return created.createAgentDefinition.id;
}

const historyQuery = `query { listWorkspaceRunHistory(limitPerAgent:200) {
  agentDefinitions { agentDefinitionId runs { runId createdAt terminatedAt status isActive } }
} }`;

function historyRuns(history, agentDefinitionId) {
  return history.listWorkspaceRunHistory.flatMap((workspace) => workspace.agentDefinitions)
    .filter((agent) => agent.agentDefinitionId === agentDefinitionId)
    .flatMap((agent) => agent.runs);
}

function openSocket(runId) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/ws/agent/${runId}`);
    const records = [];
    socket.on('message', (raw) => {
      try { records.push({ at: new Date().toISOString(), receivedAtMs: Date.now(), message: JSON.parse(raw.toString()) }); }
      catch { records.push({ at: new Date().toISOString(), receivedAtMs: Date.now(), raw: raw.toString() }); }
    });
    socket.once('open', () => resolve({ socket, records }));
    socket.once('error', reject);
  });
}

async function waitFor(records, predicate, label, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = records.find((record) => record.message && predicate(record.message));
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`WS_TIMEOUT:${label}:${JSON.stringify(records.slice(-20))}`);
}

const agentDefinitionId = await ensureAgentDefinition();
const beforeIds = new Set(historyRuns(await gql(historyQuery), agentDefinitionId).map((run) => run.runId));
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
const consoleEvents = [];
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text(), at: new Date().toISOString() });
});

let runId = null;
let socket = null;
let records = [];
let termination = null;
let result = null;
const startedAt = new Date().toISOString();
try {
  await page.goto(`${base}/agents?view=list`, { waitUntil: 'networkidle', timeout: 120000 });
  const card = page.locator('div.group').filter({ hasText: agentName }).first();
  await card.waitFor({ state: 'visible', timeout: 120000 });
  await card.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForURL('**/workspace**', { timeout: 120000 });
  await page.locator('#agent-run-runtime-kind').selectOption('claude_agent_sdk');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  await page.getByPlaceholder('Search models...').fill('haiku');
  await page.locator('li').filter({ hasText: /haiku/i }).first().click();
  const autoApprove = page.locator('#auto-execute');
  if (!(await autoApprove.getAttribute('class'))?.includes('bg-gray')) await autoApprove.click();
  await page.getByRole('button', { name: 'Run Agent', exact: true }).click();
  const input = page.getByPlaceholder('Type a message...');
  await input.waitFor({ state: 'visible', timeout: 180000 });
  await input.fill('Use the write_file tool to create api40-stop-fifo-never-write.txt containing SHOULD_NOT_EXIST. Do not answer until the tool is approved.');
  await input.press('Enter');

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const fresh = historyRuns(await gql(historyQuery), agentDefinitionId).find((run) => !beforeIds.has(run.runId));
    if (fresh) { runId = fresh.runId; break; }
    await page.waitForTimeout(250);
  }
  if (!runId) throw new Error('FRESH_RUN_NOT_FOUND');
  ({ socket, records } = await openSocket(runId));
  await waitFor(records, (message) => message.type === 'CONNECTED', 'CONNECTED');
  await waitFor(records, (message) => message.type === 'AGENT_STATUS' && message.payload?.status === 'running', 'RUNNING');

  const interruptCommandId = `client_interrupt_${randomUUID()}`;
  const followupMessageId = `client_followup_${randomUUID()}`;
  const interruptSentAtMs = Date.now();
  socket.send(JSON.stringify({ type: 'INTERRUPT_GENERATION', payload: { command_id: interruptCommandId } }));
  await new Promise((resolve) => setTimeout(resolve, 5));
  const followupSentAtMs = Date.now();
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: {
    message_id: followupMessageId,
    dedupe_key: `agent_run_input:e2e:${followupMessageId}`,
    content: `Reply with exactly ${expectedToken} and nothing else.`,
    context_file_paths: [], image_urls: [],
  } }));

  const followupAck = await waitFor(records, (message) => message.type === 'AGENT_COMMAND_ACK' && message.payload?.message_id === followupMessageId, 'FOLLOWUP_ACK');
  const interruptAck = await waitFor(records, (message) => message.type === 'AGENT_COMMAND_ACK' && message.payload?.command_id === interruptCommandId, 'INTERRUPT_ACK');
  const interrupted = await waitFor(records, (message) => message.type === 'TURN_INTERRUPTED', 'TURN_INTERRUPTED');
  await page.getByText(expectedToken, { exact: true }).last().waitFor({ state: 'visible', timeout: 240000 });
  await waitFor(records, (message) => message.type === 'TURN_COMPLETED', 'FOLLOWUP_TURN_COMPLETED');
  await page.screenshot({ path: `${outDir}/configured-stop-fifo-claude.png`, fullPage: true });

  const interruptRecordIndex = records.indexOf(interrupted);
  const postInterruptRecords = records.slice(interruptRecordIndex + 1);
  const postInterruptStarted = postInterruptRecords.find((record) => record.message?.type === 'TURN_STARTED');
  const allAssistantText = records
    .filter((record) => record.message?.type === 'SEGMENT_CONTENT')
    .map((record) => record.message.payload?.delta)
    .filter((value) => typeof value === 'string')
    .join('');
  const tokenOccurrences = allAssistantText.split(expectedToken).length - 1;
  const conditions = {
    exactClaudeRuntimeConfigured: true,
    interruptSentBeforeFollowup: interruptSentAtMs < followupSentAtMs,
    followupAdmittedWhileInterruptOutstanding: followupAck.receivedAtMs <= interruptAck.receivedAtMs || followupSentAtMs < interruptAck.receivedAtMs,
    interruptAccepted: interruptAck.message.payload?.state === 'accepted',
    followupAcceptedOnce: followupAck.message.payload?.state === 'accepted' && followupAck.message.payload?.duplicate === false && records.filter((record) => record.message?.type === 'AGENT_COMMAND_ACK' && record.message.payload?.message_id === followupMessageId).length === 1,
    terminalBeforeNextStart: Boolean(postInterruptStarted) && interrupted.receivedAtMs <= postInterruptStarted.receivedAtMs,
    exactTokenRenderedOnce: (await page.getByText(expectedToken, { exact: true }).count()) === 1,
    exactTokenOnWireOnce: tokenOccurrences === 1,
    noBrowserConsoleErrors: consoleEvents.filter((event) => event.type === 'error').length === 0,
  };
  result = { schemaVersion: 1, passed: Object.values(conditions).every(Boolean), startedAt, completedAt: new Date().toISOString(),
    agentDefinitionId, runId, expectedToken, interruptCommandId, followupMessageId,
    interruptSentAtMs, followupSentAtMs, conditions, records, consoleEvents };
} catch (error) {
  result = { schemaVersion: 1, passed: false, startedAt, completedAt: new Date().toISOString(), agentDefinitionId, runId, expectedToken,
    fatalError: error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error), records, consoleEvents };
  try { await page.screenshot({ path: `${outDir}/configured-stop-fifo-claude-failure.png`, fullPage: true }); } catch {}
} finally {
  if (socket) socket.close();
  if (runId) {
    try { termination = (await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })).terminateAgentRun; }
    catch (error) { termination = { success: false, message: String(error) }; }
  }
  result = { ...result, termination };
  fs.writeFileSync(`${outDir}/configured-stop-fifo-claude.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ passed: result.passed, runId, conditions: result.conditions, fatalError: result.fatalError ?? null, termination }, null, 2));
  await browser.close();
}
if (!result.passed || !termination?.success) process.exitCode = 2;
