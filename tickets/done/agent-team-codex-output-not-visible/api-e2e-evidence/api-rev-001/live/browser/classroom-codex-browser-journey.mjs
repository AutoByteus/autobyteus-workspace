import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const require = createRequire(pathToFileURL(path.join(root, 'autobyteus-web/package.json')));
const { chromium } = require('playwright-core');
const outputRoot = path.resolve(
  'tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-001/live',
);
const browserOutput = path.join(outputRoot, 'browser');
const providerOutput = path.join(outputRoot, 'provider');
const marker = 'CODEX_TEAM_VISIBLE_API_REV_001_FINAL_20260817';
const prompt = `Reply with exactly ${marker} and no other text.`;
const startedAt = Date.now();
const consoleMessages = [];
const pageWebSocketFrames = [];
let creationResult = null;

const parseFrame = (raw) => {
  try { return JSON.parse(String(raw)); } catch { return { type: 'UNPARSEABLE', raw: String(raw) }; }
};

const openTeamCapture = async (teamRunId) => {
  const messages = [];
  const ws = new WebSocket(`ws://127.0.0.1:60418/ws/agent-team/${teamRunId}`);
  ws.addEventListener('message', (event) => {
    messages.push({ atMs: Date.now() - startedAt, message: parseFrame(event.data) });
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('TEAM_CAPTURE_OPEN_TIMEOUT')), 30_000);
    ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('TEAM_CAPTURE_OPEN_FAILED')); }, { once: true });
  });
  const waitFor = async (predicate, timeoutMs = 60_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = messages.find(predicate);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('TEAM_CAPTURE_MESSAGE_TIMEOUT');
  };
  return { ws, messages, waitFor };
};

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

let teamCapture = null;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    consoleMessages.push({ atMs: Date.now() - startedAt, type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => {
    consoleMessages.push({ atMs: Date.now() - startedAt, type: 'pageerror', text: error.message });
  });
  page.on('websocket', (socket) => {
    if (!socket.url().includes('/ws/agent-team/')) return;
    const record = { url: socket.url(), frames: [] };
    pageWebSocketFrames.push(record);
    socket.on('framereceived', ({ payload }) => {
      record.frames.push({ atMs: Date.now() - startedAt, direction: 'received', message: parseFrame(payload) });
    });
    socket.on('framesent', ({ payload }) => {
      record.frames.push({ atMs: Date.now() - startedAt, direction: 'sent', message: parseFrame(payload) });
    });
  });
  page.on('response', async (response) => {
    if (!response.url().endsWith('/graphql')) return;
    const postData = response.request().postData() ?? '';
    if (!postData.includes('CreateAgentTeamRun')) return;
    try { creationResult = await response.json(); } catch { /* recorded by missing assertion */ }
  });

  await page.goto('http://127.0.0.1:31418/workspace', {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  await page.getByRole('button', { name: 'Agent Teams', exact: true }).click();
  await page.getByPlaceholder('Search teams by name').fill('Classroom Simulation Team');
  const classroomCard = page.getByRole('heading', { name: 'Classroom Simulation Team', exact: true })
    .locator('xpath=../../..');
  await classroomCard.getByRole('button', { name: 'Run', exact: true }).click();

  await page.locator('select').first().selectOption({ label: 'Codex App Server' });
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  await page.getByPlaceholder('Search models...').fill('gpt-5.6-luna');
  await page.getByText('GPT-5.6-Luna (default reasoning: medium)', { exact: true }).click();
  const runButton = page.getByRole('button', { name: 'Run Team', exact: true });
  await runButton.waitFor({ state: 'visible', timeout: 30_000 });
  if (await runButton.isDisabled()) throw new Error('RUN_TEAM_REMAINED_DISABLED');
  await page.screenshot({ path: path.join(browserOutput, 'classroom-codex-configured.png'), fullPage: true });
  await runButton.click();

  const deadline = Date.now() + 60_000;
  while (!creationResult && Date.now() < deadline) await page.waitForTimeout(50);
  const teamRunId = creationResult?.data?.createAgentTeamRun?.teamRunId;
  if (!creationResult?.data?.createAgentTeamRun?.success || !teamRunId) {
    throw new Error(`TEAM_CREATION_FAILED ${JSON.stringify(creationResult)}`);
  }
  await fs.writeFile(
    path.join(providerOutput, 'classroom-create-result.json'),
    `${JSON.stringify(creationResult, null, 2)}\n`,
  );

  await page.getByTestId('agent-team-event-monitor').waitFor({ state: 'visible', timeout: 60_000 });
  teamCapture = await openTeamCapture(teamRunId);
  const snapshotEntry = await teamCapture.waitFor(
    (entry) => entry.message.type === 'TEAM_EXECUTION_VIEW_SNAPSHOT',
  );
  const snapshot = snapshotEntry.message.payload;
  const professor = snapshot.execution_tree.root_team.members.find(
    (member) => member.address === '/professor',
  );
  if (!professor?.agent_run_id) throw new Error('PROFESSOR_RUN_ID_MISSING');
  if (snapshot.root_team_run_id !== teamRunId) throw new Error('SNAPSHOT_ROOT_MISMATCH');
  if (snapshot.agent_statuses.length !== 2) throw new Error('SNAPSHOT_STATUS_COUNT_MISMATCH');
  if (snapshot.agent_statuses.some((status) => !status.agent_run_id || !status.member_address)) {
    throw new Error('SNAPSHOT_STATUS_IDENTITY_MISSING');
  }

  const composer = page.locator('textarea[placeholder="Type a message..."]');
  await composer.waitFor({ state: 'visible', timeout: 30_000 });
  await composer.fill(prompt);
  await page.getByTitle('Send message').click();

  await teamCapture.waitFor(
    (entry) => entry.message.type === 'TURN_COMPLETED'
      && entry.message.payload?.agent_run_id === professor.agent_run_id,
    300_000,
  );
  await page.getByText(marker, { exact: true }).waitFor({ state: 'visible', timeout: 60_000 });
  const liveMarkerCount = await page.getByText(marker, { exact: true }).count();
  await page.screenshot({ path: path.join(browserOutput, 'classroom-codex-visible-live.png'), fullPage: true });

  const sequenced = teamCapture.messages
    .map((entry) => entry.message)
    .filter((message) => Number.isInteger(message.payload?.change_sequence));
  const base = snapshot.base_change_sequence;
  const sequenceValues = sequenced.map((message) => message.payload.change_sequence);
  const sequenceContiguous = sequenceValues.every(
    (value, index) => value === base + index + 1,
  );
  const liveStatuses = sequenced.filter((message) => message.type === 'AGENT_STATUS');
  const statusWireShapeExact = liveStatuses.length >= 2
    && liveStatuses.every((message) => (
      typeof message.payload.agent_run_id === 'string'
      && !Object.hasOwn(message.payload, 'member_address')
      && Number.isInteger(message.payload.change_sequence)
    ));
  const rootAndRunCorrelated = sequenced
    .filter((message) => [
      'MEMBER_INPUT_MESSAGE', 'AGENT_STATUS', 'TURN_STARTED', 'SEGMENT_START',
      'SEGMENT_CONTENT', 'SEGMENT_END', 'TURN_COMPLETED',
    ].includes(message.type))
    .every((message) => {
      if (message.type === 'MEMBER_INPUT_MESSAGE') {
        return message.payload.recipient_agent_run_id === professor.agent_run_id;
      }
      return message.payload.agent_run_id === professor.agent_run_id;
    });
  const liveWireSummary = {
    teamRunId,
    professorAgentRunId: professor.agent_run_id,
    baseChangeSequence: base,
    sequenceValues,
    sequenceContiguous,
    liveStatusCount: liveStatuses.length,
    statusWireShapeExact,
    rootAndRunCorrelated,
    liveMarkerCount,
    typeCounts: Object.fromEntries(sequenced.map((message) => message.type).map(
      (type, _, all) => [type, all.filter((candidate) => candidate === type).length],
    )),
  };
  await fs.writeFile(
    path.join(providerOutput, 'classroom-codex-live-wire-summary.json'),
    `${JSON.stringify(liveWireSummary, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(providerOutput, 'classroom-codex-live-wire.json'),
    `${JSON.stringify({ teamRunId, messages: teamCapture.messages }, null, 2)}\n`,
  );
  if (!sequenceContiguous) throw new Error('LIVE_SEQUENCE_NOT_CONTIGUOUS');
  if (!statusWireShapeExact) throw new Error('LIVE_STATUS_WIRE_SHAPE_INVALID');
  if (!rootAndRunCorrelated) throw new Error('LIVE_ROOT_OR_RUN_CORRELATION_FAILED');
  if (liveMarkerCount !== 1) throw new Error('LIVE_MARKER_COUNT_INVALID');

  await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByRole('button', { name: 'Open runs/history', exact: true }).click();
  await page.getByText('Temp Workspace', { exact: true }).click();
  await page.getByText('Classroom Simulation Team', { exact: true }).click();
  await page.getByText(prompt, { exact: true }).click();
  await page.getByText(marker, { exact: true }).waitFor({ state: 'visible', timeout: 90_000 });
  const refreshedMarkerCount = await page.getByText(marker, { exact: true }).count();
  await page.screenshot({ path: path.join(browserOutput, 'classroom-codex-visible-after-refresh.png'), fullPage: true });
  if (refreshedMarkerCount !== 1) throw new Error('REFRESHED_MARKER_COUNT_INVALID');

  const browserSummary = {
    teamRunId,
    professorAgentRunId: professor.agent_run_id,
    runtimeKind: professor.launch_configuration.runtime_kind,
    modelIdentifier: professor.launch_configuration.llm_model_identifier,
    marker,
    prompt,
    visibleBeforeRefresh: liveMarkerCount === 1,
    visibleAfterRefresh: refreshedMarkerCount === 1,
    duplicateCountBeforeRefresh: liveMarkerCount,
    duplicateCountAfterRefresh: refreshedMarkerCount,
    pageWebSocketCount: pageWebSocketFrames.length,
    pageConsoleErrors: consoleMessages.filter((entry) => ['error', 'pageerror'].includes(entry.type)),
  };
  await fs.writeFile(
    path.join(browserOutput, 'classroom-codex-browser-summary.json'),
    `${JSON.stringify(browserSummary, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(browserOutput, 'classroom-codex-page-websockets.json'),
    `${JSON.stringify(pageWebSocketFrames, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(browserOutput, 'classroom-codex-console.json'),
    `${JSON.stringify(consoleMessages, null, 2)}\n`,
  );
  console.log(JSON.stringify({ browserSummary, liveWireSummary }, null, 2));
} finally {
  if (teamCapture?.ws?.readyState === WebSocket.OPEN) teamCapture.ws.close();
  await Promise.race([
    browser.close(),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}
process.exit(0);
