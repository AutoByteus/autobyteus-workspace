import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const metaPath = path.join(here, 'real-classroom-owned-runtime.json');
const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
const baseUrl = `http://127.0.0.1:${meta.frontendPort}`;
const token = `CLASSROOM_REAL_E2E_${Date.now()}`;
const evidence = {
  startedAt: new Date().toISOString(), baseUrl, backendPort: meta.port,
  teamDefinition: 'Classroom Simulation Team', modelIdentifier: 'deepseek-v4-flash',
  packagePath: meta.agentPackage, secretImportSource: meta.secretsSource,
  token, browserEvents: [], graphql: [], websocketFrames: [], timings: {}, assertions: {}, screenshots: {},
};
const waitFor = async (label, fn, timeoutMs = 360_000, intervalMs = 500) => {
  const started = Date.now(); let last; let lastError;
  while (Date.now() - started < timeoutMs) {
    try { last = await fn(); if (last) return last; } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}; last=${JSON.stringify(last)}${lastError ? ` error=${lastError.message}` : ''}`);
};
const percentile = (values, fraction) => [...values].sort((a,b)=>a-b)[Math.max(0, Math.ceil(values.length * fraction)-1)] ?? null;
const summary = (values) => ({count: values.length, min: Math.min(...values), p95: percentile(values, .95), max: Math.max(...values)});
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({at:Date.now(), type:`console:${message.type()}`, text:message.text()}));
  page.on('pageerror', (error) => evidence.browserEvents.push({at:Date.now(), type:'pageerror', text:error.message}));
  page.on('requestfailed', (request) => evidence.browserEvents.push({at:Date.now(), type:'requestfailed', text:`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`}));
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname !== '/graphql') return;
    const request = response.request();
    let operationName = null;
    try { operationName = request.postDataJSON()?.operationName ?? null; } catch {}
    const row = {at:Date.now(), operationName, status:response.status()};
    try {
      const body = await response.json();
      if (body?.data?.createAgentTeamRun?.teamRunId) {
        row.teamRunId = body.data.createAgentTeamRun.teamRunId;
        evidence.uiTeamRunId = row.teamRunId;
      }
      if (Array.isArray(body?.errors)) row.errors = body.errors.map((error) => error.message);
    } catch {}
    evidence.graphql.push(row);
  });
  page.on('websocket', (socket) => {
    if (!socket.url().includes('/ws/agent-team/')) return;
    evidence.teamSocketUrl = socket.url();
    const capture = (direction, payload) => {
      let parsed = null;
      try { parsed = JSON.parse(payload); } catch {}
      evidence.websocketFrames.push({at:Date.now(), direction, parsed, raw: parsed ? undefined : payload});
    };
    socket.on('framesent', (event) => capture('sent', event.payload));
    socket.on('framereceived', (event) => capture('received', event.payload));
    socket.on('socketerror', (error) => evidence.browserEvents.push({at:Date.now(), type:'team-websocket-error', text:String(error)}));
  });

  await page.goto(`${baseUrl}/agent-teams?view=list`, {waitUntil:'domcontentloaded', timeout:60_000});
  await page.getByText('Classroom Simulation Team', {exact:true}).waitFor({state:'visible', timeout:60_000});
  const teamCard = page.getByText('Classroom Simulation Team', {exact:true}).locator('xpath=../..');
  const launchStart = performance.now();
  await teamCard.getByRole('button', {name:'Run', exact:true}).click();
  await page.waitForURL('**/workspace', {timeout:30_000});
  evidence.timings.teamCardToWorkspaceMs = performance.now() - launchStart;

  await page.getByRole('button', {name:'Select a model', exact:true}).click();
  await page.getByText('deepseek-v4-flash', {exact:true}).click();
  const autoApproveButton = page.getByRole('button', {name:'Auto approve tools', exact:true});
  await autoApproveButton.click();
  await waitFor('global auto-approve toggle', async () => (
    (await autoApproveButton.getAttribute('class'))?.includes('bg-blue-600')
  ), 10_000);
  const runTeamButton = page.getByRole('button', {name:'Run Team', exact:true});
  await waitFor('Run Team enabled', async () => !(await runTeamButton.isDisabled()), 20_000);
  const runClickAt = performance.now();
  await runTeamButton.click();
  const composer = page.locator('textarea[placeholder*="Type a message"]:visible').first();
  await composer.waitFor({state:'visible', timeout:90_000});
  evidence.timings.runTeamToComposerMs = performance.now() - runClickAt;
  const liveScreenshot = path.join(here, 'real-classroom-ui-ready.png');
  await page.screenshot({path:liveScreenshot, fullPage:true});
  evidence.screenshots.ready = liveScreenshot;

  const prompt = `Run one short real classroom exchange. The professor must use run_bash to write a file-backed multiplication question asking the student to solve 17 x 6 and explain it in one sentence, then send it with send_message_to. The student must read the file, use run_bash to write an answer file, and reply with send_message_to. The professor must read the reply and finish with concise feedback containing the exact marker ${token}. Do not skip either agent-to-agent handoff.`;
  await composer.fill(prompt);
  const sendAt = performance.now();
  await composer.press('Enter');
  await waitFor('UI team run id', async () => evidence.uiTeamRunId, 60_000);
  meta.uiTeamRunId = evidence.uiTeamRunId;
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  await waitFor('professor running state', async () => {
    const body = await page.locator('body').innerText();
    return /professor\s+Running/i.test(body) || /Running/.test(body);
  }, 60_000, 200);
  evidence.timings.sendToRunningVisibleMs = performance.now() - sendAt;

  const navigationLatencies = [];
  for (let index = 0; index < 20; index += 1) {
    const targetName = index % 2 === 0 ? 'Team' : 'Files';
    const tab = page.getByRole('tab', {name:targetName, exact:true});
    if (await tab.count() === 0) continue;
    const started = performance.now();
    await tab.click();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    navigationLatencies.push(performance.now() - started);
    await page.waitForTimeout(100);
  }
  evidence.timings.liveFilesTeamNavigation = summary(navigationLatencies);

  const receivedFrames = () => evidence.websocketFrames.filter((frame) => frame.direction === 'received' && frame.parsed);
  const frameType = (frame) => frame.parsed?.type;
  const frameAgent = (frame) => String(frame.parsed?.payload?.agent_name ?? frame.parsed?.payload?.member_name ?? '').toLowerCase();
  const frameTool = (frame) => String(frame.parsed?.payload?.tool_name ?? frame.parsed?.payload?.name ?? frame.parsed?.payload?.toolName ?? '').toLowerCase();
  await waitFor('two successful real send_message_to handoffs and final professor marker', async () => {
    const frames = receivedFrames();
    const successfulHandoffs = frames.filter((frame) => frameType(frame) === 'TOOL_EXECUTION_SUCCEEDED' && frameTool(frame) === 'send_message_to').length;
    const professorContent = frames.filter((frame) => frameAgent(frame).includes('professor') && ['SEGMENT_CONTENT','ASSISTANT_MESSAGE'].includes(frameType(frame)))
      .map((frame) => JSON.stringify(frame.parsed?.payload ?? {})).join('');
    const body = await page.locator('body').innerText();
    return successfulHandoffs >= 2 && (professorContent.includes(token) || body.includes(token));
  }, 420_000, 1000);
  evidence.timings.sendToCompletedExchangeMs = performance.now() - sendAt;

  await waitFor('professor returns idle', async () => {
    const frames = receivedFrames();
    const professorStatuses = frames.filter((frame) => frameType(frame) === 'AGENT_STATUS' && frameAgent(frame).includes('professor'));
    return professorStatuses.some((frame) => String(frame.parsed?.payload?.status ?? '').toLowerCase() === 'idle');
  }, 90_000, 500);

  const finalBodyText = await page.locator('body').innerText();
  const finalScreenshot = path.join(here, 'real-classroom-ui-final.png');
  await page.screenshot({path:finalScreenshot, fullPage:true});
  evidence.screenshots.final = finalScreenshot;
  evidence.finalBodyText = finalBodyText.slice(0, 40_000);

  const frames = receivedFrames();
  const toolSucceeded = frames.filter((frame) => frameType(frame) === 'TOOL_EXECUTION_SUCCEEDED' && frameTool(frame) === 'send_message_to');
  const professorContentFrames = frames.filter((frame) => frameAgent(frame).includes('professor') && frameType(frame) === 'SEGMENT_CONTENT');
  const studentContentFrames = frames.filter((frame) => frameAgent(frame).includes('student') && frameType(frame) === 'SEGMENT_CONTENT');
  const statuses = frames.filter((frame) => frameType(frame) === 'AGENT_STATUS').map((frame) => ({agent:frameAgent(frame),status:frame.parsed?.payload?.status}));
  evidence.assertions = {
    packageImported: meta.agentPackage === '/Users/normy/autobyteus_org/autobyteus-agents',
    uiTeamRunCreated: Boolean(evidence.uiTeamRunId),
    teamSocketObserved: Boolean(evidence.teamSocketUrl),
    professorContentObserved: professorContentFrames.length > 0,
    studentContentObserved: studentContentFrames.length > 0,
    successfulSendMessageHandoffs: toolSucceeded.length,
    markerVisible: finalBodyText.includes(token) || professorContentFrames.some((frame) => JSON.stringify(frame.parsed).includes(token)),
    professorIdleObserved: statuses.some((entry) => entry.agent.includes('professor') && String(entry.status).toLowerCase() === 'idle'),
    navigationP95UnderOneSecond: navigationLatencies.length > 0 && percentile(navigationLatencies,.95) < 1000,
  };
  if (Object.values(evidence.assertions).some((value) => value === false) || toolSucceeded.length < 2) {
    throw new Error(`Real classroom assertions failed: ${JSON.stringify(evidence.assertions)}`);
  }

  const reloadAt = performance.now();
  await page.reload({waitUntil:'domcontentloaded', timeout:60_000});
  await page.waitForTimeout(8000);
  evidence.timings.reloadToHistoryMs = performance.now() - reloadAt;
  const reloadBody = await page.locator('body').innerText();
  evidence.reloadBodyText = reloadBody.slice(0, 40_000);
  evidence.assertions.historyPresentAfterReload = reloadBody.includes('Classroom Simulation Team') || reloadBody.includes(evidence.uiTeamRunId);
  const reloadScreenshot = path.join(here, 'real-classroom-ui-reload.png');
  await page.screenshot({path:reloadScreenshot, fullPage:true});
  evidence.screenshots.reload = reloadScreenshot;
  if (!evidence.assertions.historyPresentAfterReload) throw new Error('Classroom run was not present after browser reload');

  evidence.result = 'Pass';
  evidence.completedAt = new Date().toISOString();
  await context.close();
} catch (error) {
  evidence.result = 'Fail';
  evidence.failure = {message:error?.message ?? String(error), stack:error?.stack};
  evidence.completedAt = new Date().toISOString();
  throw error;
} finally {
  if (browser) await browser.close().catch(()=>{});
  await fs.writeFile(path.join(here, 'real-classroom-ui-evidence.json'), JSON.stringify(evidence, null, 2));
}
console.log(`Real Classroom Simulation Team UI run passed: ${evidence.uiTeamRunId}`);
