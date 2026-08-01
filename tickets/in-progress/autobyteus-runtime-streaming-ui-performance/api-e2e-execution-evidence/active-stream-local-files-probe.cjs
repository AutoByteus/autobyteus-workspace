const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const outDir = __dirname;
const summaryPath = path.join(outDir, 'active-stream-local-files-summary.json');
const result = {
  probeId: 'ACTIVE-STREAM-FILES-001',
  startedAt: new Date().toISOString(),
  topology: {
    frontend: 'http://127.0.0.1:3000',
    backend: 'http://127.0.0.1:29695',
    workspace: 'Temp Workspace',
    teamDefinition: 'Software Engineering Team',
    runtime: 'autobyteus',
    model: 'deepseek-v4-flash',
  },
  run: {},
  opens: [],
  errors: [],
  cleanup: {},
};

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * p / 100) - 1)] ?? null;
}

(async () => {
  let browser;
  let teamRunId;
  try {
    browser = await chromium.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
    page.on('pageerror', (error) => result.errors.push(`pageerror: ${error.message}`));
    await page.addInitScript(() => {
      const NativeWebSocket = window.WebSocket;
      const probe = window.__activeFileProbe = { sockets: {} };
      window.WebSocket = class extends NativeWebSocket {
        constructor(url, protocols) {
          super(url, protocols);
          const key = String(url);
          const socket = probe.sockets[key] ||= { contentEvents: 0, contentChars: 0, lastContentAt: 0 };
          this.addEventListener('message', (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message?.type === 'SEGMENT_CONTENT') {
                const delta = typeof message.payload?.delta === 'string' ? message.payload.delta : '';
                socket.contentEvents += 1;
                socket.contentChars += delta.length;
                socket.lastContentAt = performance.now();
              }
            } catch {}
          });
        }
      };
      for (const key of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
        Object.defineProperty(window.WebSocket, key, { value: NativeWebSocket[key] });
      }
    });

    await page.goto('http://127.0.0.1:3000/agent-teams', { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByPlaceholder(/Search teams/i).fill('Software Engineering Team');
    await page.waitForTimeout(500);
    const card = page.locator('div.group').filter({ hasText: 'Software Engineering Team' }).first();
    await card.getByRole('button', { name: /^Run$/ }).click();
    await page.waitForURL(/\/workspace/, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Select a model' }).click();
    await page.getByPlaceholder('Search models...').fill('deepseek-v4-flash');
    await page.getByText('deepseek-v4-flash', { exact: true }).last().click();
    await page.getByRole('button', { name: 'Run Team' }).click();
    const composer = page.getByPlaceholder('Type a message...');
    await composer.waitFor({ state: 'visible', timeout: 30000 });
    await composer.fill('Short runtime-neutral streaming control. Explain a careful validation plan in prose. Do not modify repositories. Keep the response detailed enough to stream continuously for several seconds before any tool is needed.');
    await page.getByTitle('Send message').click();

    await page.waitForFunction(() => Object.keys(window.__activeFileProbe.sockets).some((url) => url.includes('/ws/agent-team/')), null, { timeout: 30000 });
    const socketUrl = await page.evaluate(() => Object.keys(window.__activeFileProbe.sockets).find((url) => url.includes('/ws/agent-team/')));
    teamRunId = decodeURIComponent(socketUrl.match(/\/ws\/agent-team\/([^/?]+)/)[1]);
    result.run.teamRunId = teamRunId;
    await page.waitForFunction((id) => {
      const entry = Object.entries(window.__activeFileProbe.sockets).find(([url]) => url.includes(id));
      return entry && entry[1].contentEvents >= 20 && performance.now() - entry[1].lastContentAt < 1000;
    }, teamRunId, { timeout: 120000 });

    const filesTab = page.locator('[data-test=right-side-tab-list] button').filter({ hasText: /^Files$/ }).first();
    await filesTab.click();
    const search = page.locator('[data-test=right-side-files-panel] input[placeholder="Search..."]').first();
    await search.waitFor({ state: 'visible', timeout: 15000 });

    for (let index = 0; index < 10; index += 1) {
      const name = index % 2 === 0 ? 'article.md' : 'README.md';
      await search.fill(name);
      const item = page.locator('[data-test=right-side-files-panel]').getByText(name, { exact: true }).filter({ visible: true }).last();
      await item.waitFor({ state: 'visible', timeout: 15000 });
      const streamBefore = await page.evaluate((id) => {
        const entry = Object.entries(window.__activeFileProbe.sockets).find(([url]) => url.includes(id));
        return { ...entry[1], recentContentAgeMs: performance.now() - entry[1].lastContentAt };
      }, teamRunId);
      const started = performance.now();
      await item.click();
      await page.waitForFunction((target) => {
        const active = document.querySelector('[data-test=right-side-files-panel] [data-event-monitor-active-file-tab="true"]');
        const loading = [...document.querySelectorAll('[data-test=right-side-files-panel] [role=status]')]
          .some((entry) => /Loading file content/i.test(entry.textContent || ''));
        return Boolean(active && (active.textContent || '').includes(target) && !loading);
      }, name, { timeout: 5000 });
      await page.waitForTimeout(100);
      const streamAfter = await page.evaluate((id) => {
        const entry = Object.entries(window.__activeFileProbe.sockets).find(([url]) => url.includes(id));
        return { ...entry[1], recentContentAgeMs: performance.now() - entry[1].lastContentAt };
      }, teamRunId);
      result.opens.push({
        index: index + 1,
        name,
        latencyMs: performance.now() - started - 100,
        streamBefore,
        streamAfter,
      });
      await search.fill('');
    }
    result.run.contentAtFirstOpen = result.opens[0].streamBefore.contentChars;
    result.run.contentAtLastOpen = result.opens.at(-1).streamAfter.contentChars;
    result.run.contentEventsDuringOpenWindow = result.opens.at(-1).streamAfter.contentEvents - result.opens[0].streamBefore.contentEvents;
    result.openP95Ms = percentile(result.opens.map((entry) => entry.latencyMs), 95);
    result.allOpenedWhileFreshStream = result.opens.every((entry) => entry.streamBefore.recentContentAgeMs < 1000 || entry.streamAfter.recentContentAgeMs < 1000);
    await page.screenshot({ path: path.join(outDir, 'active-stream-local-files.png'), fullPage: true });
    result.completedAt = new Date().toISOString();
  } catch (error) {
    result.errors.push(error?.stack || String(error));
  } finally {
    if (teamRunId) {
      try {
        const response = await fetch('http://127.0.0.1:29695/graphql', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: 'mutation TerminateAgentTeamRun($teamRunId: String!) { terminateAgentTeamRun(teamRunId: $teamRunId) { success message } }',
            variables: { teamRunId },
          }),
        });
        result.cleanup.terminateTeam = { status: response.status, body: await response.json() };
      } catch (error) { result.cleanup.terminateTeam = { error: String(error) }; }
    }
    try { await browser?.close(); result.cleanup.browserClosed = true; }
    catch (error) { result.cleanup.browserClosed = false; result.cleanup.browserError = String(error); }
    result.cleanup.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - new Date(result.startedAt).getTime();
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
  }
  if (result.errors.length || result.opens.length !== 10 || !result.allOpenedWhileFreshStream || result.openP95Ms > 500) process.exitCode = 2;
})();
