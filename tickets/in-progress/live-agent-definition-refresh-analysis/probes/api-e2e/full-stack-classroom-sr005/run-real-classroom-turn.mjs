import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../../../../autobyteus-web/node_modules/playwright-core/index.mjs';

const evidenceDir = path.resolve('tickets/in-progress/live-agent-definition-refresh-analysis/probes/api-e2e/full-stack-classroom-sr005');
const runId = 'classroom_simulation_team_9b06404930c64dad8ff1aa865e1d7e46';
const result = {
  startedAt: new Date().toISOString(),
  runId,
  browser: { realTab: true, interception: false, executablePath: '/usr/bin/chromium' },
  graphql: [],
  webSockets: [],
  assertions: [],
  failures: [],
};
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
const op = (payload) => payload?.operationName || /\b(?:query|mutation)\s+(\w+)/.exec(payload?.query || '')?.[1] || 'anonymous';
const assert = (id, pass, details = {}) => {
  result.assertions.push({ id, pass, details, at: new Date().toISOString() });
  if (!pass) throw new Error(`${id}: ${JSON.stringify(details)}`);
};
let browser;
let page;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(60_000);
  page.on('request', (request) => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    const payload = json(request.postData() || '');
    result.graphql.push({ operationName: op(payload), variables: payload?.variables ?? null, status: null, response: null });
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/graphql') || response.request().method() !== 'POST') return;
    const payload = json(response.request().postData() || '');
    const name = op(payload);
    const row = [...result.graphql].reverse().find((candidate) => candidate.operationName === name && candidate.status === null);
    if (!row) return;
    row.status = response.status();
    if (['RestoreAgentTeamRun', 'GetTeamRunResumeConfig', 'TerminateAgentTeamRun'].includes(name)) {
      row.response = json(await response.text());
    }
  });
  page.on('websocket', (socket) => {
    const row = { url: socket.url(), framesSent: 0, framesReceived: 0, errors: [], closedAt: null };
    result.webSockets.push(row);
    socket.on('framesent', () => row.framesSent++);
    socket.on('framereceived', () => row.framesReceived++);
    socket.on('socketerror', (error) => row.errors.push(String(error)));
    socket.on('close', () => row.closedAt = new Date().toISOString());
  });

  await page.goto('http://127.0.0.1:33123/workspace', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Temp Workspace', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Temp Workspace', exact: true }).click();
  await page.locator('[data-test="workspace-team-definition-row-classroom-simulation-team"]').click();
  const runRow = page.locator(`[data-test="workspace-team-row-${runId}"]`);
  await runRow.waitFor();
  await runRow.click();
  await page.locator('[data-testid="agent-team-event-monitor"]').waitFor({ timeout: 120_000 });
  assert('STOPPED-CLASSROOM-RUN-OPENED', await page.locator('[data-test="workspace-header-edit-config"]').count() === 1, { runId });
  await page.screenshot({ path: path.join(evidenceDir, '10-classroom-stopped-run-opened.png'), fullPage: true });

  const prompt = 'Reply only with: CLASSROOM_E2E_OK';
  const composer = page.locator('textarea[placeholder="Type a message..."]');
  await composer.waitFor();
  await composer.fill(prompt);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  result.sentAt = new Date().toISOString();
  const assistantResponse = page.locator('div.flex.items-start.gap-3.pr-8')
    .filter({ has: page.locator('div.bg-emerald-50') })
    .filter({ hasText: 'CLASSROOM_E2E_OK' })
    .last();
  await assistantResponse.waitFor({ timeout: 300_000 });
  const responseText = (await assistantResponse.innerText()).replace(/\s+/g, ' ').trim();
  result.responseText = responseText;
  assert('REAL-CODEX-ASSISTANT-RESPONSE', responseText.includes('CLASSROOM_E2E_OK'), { responseText });
  const teamSocket = result.webSockets.find((socket) => socket.url.includes(`/ws/agent-team/${runId}`));
  assert('REAL-TEAM-WEBSOCKET-TRAFFIC', Boolean(teamSocket && teamSocket.framesSent > 0 && teamSocket.framesReceived > 0), { teamSocket, webSockets: result.webSockets });
  await page.screenshot({ path: path.join(evidenceDir, '11-classroom-real-codex-response.png'), fullPage: true });

  // Explicit validation-owned cleanup through the same real UI.
  const stop = page.getByRole('button', { name: 'Terminate team', exact: true });
  await stop.first().waitFor({ timeout: 60_000 });
  await stop.first().click();
  await page.waitForTimeout(2_000);
  result.completedAt = new Date().toISOString();
  result.result = 'PASS';
} catch (error) {
  result.completedAt = new Date().toISOString();
  result.result = 'FAIL';
  result.failures.push({ message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null });
  if (page) {
    result.failureUrl = page.url();
    result.failureBody = await page.locator('body').innerText().catch(() => '');
    await page.screenshot({ path: path.join(evidenceDir, 'real-turn-failure.png'), fullPage: true }).catch(() => undefined);
  }
} finally {
  await browser?.close().catch(() => undefined);
  await fs.writeFile(path.join(evidenceDir, 'real-turn-evidence.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ result: result.result, assertions: result.assertions, failures: result.failures }, null, 2));
if (result.result !== 'PASS') process.exitCode = 1;
