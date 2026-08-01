const { chromium } = require('playwright-core');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');

const outDir = __dirname;
const summaryPath = path.join(outDir, 'runtime-controls-persistence-summary.json');
const BASE_URL = 'http://127.0.0.1:3000';
const CODEX_TEAM = 'software_engineering_team_21f81d9055df4fb28659e73ac274049e';
const NATIVE_TEAM = 'software_engineering_team_985b0fa4443e45ed82d7a3fadb041024';
const memoryRoot = '/Users/normy/.autobyteus/server-data/memory/agent_teams';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function snapshotTree(teamId) {
  const root = path.join(memoryRoot, teamId);
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        const stat = fs.statSync(full);
        files.push({
          relativePath: path.relative(root, full),
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          sha256: sha256(full),
        });
      }
    }
  };
  visit(root);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

const result = {
  probeId: 'RUNTIME-CONTROLS-PERSIST-001',
  startedAt: new Date().toISOString(),
  topology: {
    frontend: BASE_URL,
    backend: 'Electron-started backend at http://127.0.0.1:29695',
    workspace: 'Temp Workspace',
    browser: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    mode: 'read-only historical current-reader and idle control',
  },
  persistedData: {
    approvedDecision: 'Directly Usable — No Migration',
    before: { codex: snapshotTree(CODEX_TEAM), native: snapshotTree(NATIVE_TEAM) },
  },
  codexControl: {},
  nativeCurrentReader: {},
  idle: {},
  network: { referenceResponses: [], failedRequests: [] },
  cleanup: {},
  errors: [],
};

(async () => {
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
    });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
    page.on('response', (response) => {
      const url = response.url();
      if (/team-communication\/messages\/.*\/references\/.*\/content/.test(url)) {
        result.network.referenceResponses.push({ url, status: response.status(), at: new Date().toISOString() });
      }
    });
    page.on('requestfailed', (request) => {
      result.network.failedRequests.push({ url: request.url(), failure: request.failure() });
    });
    page.on('pageerror', (error) => result.errors.push(`pageerror: ${error.message}`));
    await page.addInitScript(() => {
      const probe = window.__runtimeControlProbe = { gaps: [], maxGap: 0, wsContent: 0 };
      let last = performance.now();
      setInterval(() => {
        const now = performance.now();
        const gap = now - last;
        last = now;
        probe.gaps.push(gap);
        probe.maxGap = Math.max(probe.maxGap, gap);
      }, 50);
      const NativeWebSocket = window.WebSocket;
      window.WebSocket = class extends NativeWebSocket {
        constructor(url, protocols) {
          super(url, protocols);
          this.addEventListener('message', (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message?.type === 'SEGMENT_CONTENT') probe.wsContent += 1;
            } catch {}
          });
        }
      };
      for (const key of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
        Object.defineProperty(window.WebSocket, key, { value: NativeWebSocket[key] });
      }
    });

    await page.goto(`${BASE_URL}/workspace`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('[data-test=workspace-row]').filter({ hasText: /^Temp Workspace$/ }).click();
    await page.waitForTimeout(500);
    await page.locator('[data-test=workspace-team-definition-row-software-engineering-team]').click();
    await page.waitForTimeout(500);

    async function openHistoricalRun(teamId, promptPattern) {
      const row = page.locator(`[data-test="workspace-team-row-${teamId}"]`);
      await row.waitFor({ state: 'visible', timeout: 15000 });
      const started = performance.now();
      await row.click();
      await page.waitForFunction(
        ({ pattern }) => {
          const center = document.querySelector('[data-test=workspace-center-pane]');
          return Boolean(center && new RegExp(pattern, 'i').test(center.textContent || '') && (center.textContent || '').length > 500);
        },
        { pattern: promptPattern.source },
        { timeout: 30000 },
      );
      return performance.now() - started;
    }

    async function openReadme() {
      const files = page.locator('[data-test=right-side-tab-list] button').filter({ hasText: /^Files$/ }).first();
      await files.click();
      const search = page.locator('[data-test=right-side-files-panel] input[placeholder="Search..."]').first();
      await search.waitFor({ state: 'visible', timeout: 15000 });
      await search.fill('README.md');
      const item = page.locator('[data-test=right-side-files-panel]').getByText('README.md', { exact: true }).filter({ visible: true }).last();
      await item.waitFor({ state: 'visible', timeout: 15000 });
      const started = performance.now();
      await item.click();
      await page.waitForFunction(() => {
        const active = document.querySelector('[data-test=right-side-files-panel] [data-event-monitor-active-file-tab="true"]');
        const loading = [...document.querySelectorAll('[data-test=right-side-files-panel] [role=status]')]
          .some((entry) => /Loading file content/i.test(entry.textContent || ''));
        return Boolean(active && (active.textContent || '').includes('README.md') && !loading);
      }, null, { timeout: 10000 });
      return performance.now() - started;
    }

    async function openFirstReference() {
      const teamTab = page.locator('[data-test=right-side-tab-list] button').filter({ hasText: /^Team$/ }).first();
      await teamTab.click();
      const header = page.locator('[data-test=team-messages-header]');
      if (await header.count() && await header.getAttribute('aria-expanded') === 'false') await header.click();
      const row = page.locator('[data-test=team-communication-reference-row]').first();
      await row.waitFor({ state: 'visible', timeout: 15000 });
      const label = (await row.innerText()).trim();
      const started = performance.now();
      await row.click();
      const shell = page.locator('[data-test=team-reference-viewer-shell]');
      await shell.waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForFunction(() => {
        const entry = document.querySelector('[data-test=team-reference-viewer-shell]');
        const text = entry?.textContent || '';
        return text.length > 40 && !/Loading reference/i.test(text);
      }, null, { timeout: 10000 });
      return { label, latencyMs: performance.now() - started, sample: (await shell.innerText()).slice(0, 500) };
    }

    result.codexControl.historyOpenLatencyMs = await openHistoricalRun(CODEX_TEAM, /Build a minimal Vue Apple shop prototype/i);
    result.codexControl.centerSample = (await page.locator('[data-test=workspace-center-pane]').innerText()).slice(0, 1200);
    result.codexControl.readmeLatencyMs = await openReadme();
    result.codexControl.reference = await openFirstReference();
    await page.screenshot({ path: path.join(outDir, 'codex-current-reader-idle.png'), fullPage: true });

    const idleStarted = Date.now();
    const wsBeforeIdle = await page.evaluate(() => window.__runtimeControlProbe.wsContent);
    await page.waitForTimeout(10000);
    const idleProbe = await page.evaluate(() => JSON.parse(JSON.stringify(window.__runtimeControlProbe)));
    const wsAfterIdle = idleProbe.wsContent;
    const recentGaps = idleProbe.gaps.slice(-220);
    const drifts = recentGaps.map((gap) => Math.max(0, gap - 50));
    result.idle = {
      durationMs: Date.now() - idleStarted,
      timerSamples: recentGaps.length,
      timerDriftP95Ms: percentile(drifts, 95),
      timerGapMaxMs: Math.max(...recentGaps, 0),
      segmentContentEvents: wsAfterIdle - wsBeforeIdle,
    };

    result.nativeCurrentReader.historyOpenLatencyMs = await openHistoricalRun(NATIVE_TEAM, /API\/E2E validation task/i);
    result.nativeCurrentReader.centerSample = (await page.locator('[data-test=workspace-center-pane]').innerText()).slice(0, 1200);
    result.nativeCurrentReader.reference = await openFirstReference();
    await page.screenshot({ path: path.join(outDir, 'native-current-reader.png'), fullPage: true });

    result.persistedData.after = { codex: snapshotTree(CODEX_TEAM), native: snapshotTree(NATIVE_TEAM) };
    result.persistedData.unchangedAfterRead = {
      codex: JSON.stringify(result.persistedData.before.codex) === JSON.stringify(result.persistedData.after.codex),
      native: JSON.stringify(result.persistedData.before.native) === JSON.stringify(result.persistedData.after.native),
    };
    result.completedAt = new Date().toISOString();
  } catch (error) {
    result.errors.push(error?.stack || String(error));
  } finally {
    try { await browser?.close(); result.cleanup.browserClosed = true; }
    catch (error) { result.cleanup.browserClosed = false; result.cleanup.error = String(error); }
    result.cleanup.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - new Date(result.startedAt).getTime();
    fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
  }
  if (result.errors.length || !result.persistedData.unchangedAfterRead?.codex || !result.persistedData.unchangedAfterRead?.native) process.exitCode = 2;
})();
