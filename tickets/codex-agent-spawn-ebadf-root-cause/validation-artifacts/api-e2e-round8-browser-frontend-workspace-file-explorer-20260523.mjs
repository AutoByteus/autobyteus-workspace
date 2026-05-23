import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const repoRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause';
const artifactDir = path.join(repoRoot, 'tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts');
const workspaceRoot = path.join(artifactDir, 'api-e2e-round8-browser-workspace-20260523');
const frontendUrl = 'http://127.0.0.1:3000';
const backendBaseUrl = 'http://127.0.0.1:8000';
const logPath = path.join(artifactDir, 'api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.log');
const summaryPath = path.join(artifactDir, 'api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.json');
const requireFromWeb = createRequire(path.join(repoRoot, 'autobyteus-web/package.json'));
const { chromium } = requireFromWeb('playwright-core');

const screenshots = {
  agents: path.join(artifactDir, 'api-e2e-round8-browser-01-agents-list-20260523.png'),
  configNoFiles: path.join(artifactDir, 'api-e2e-round8-browser-02-run-config-no-files-20260523.png'),
  filesTree: path.join(artifactDir, 'api-e2e-round8-browser-03-files-visible-tree-20260523.png'),
  readmeOpen: path.join(artifactDir, 'api-e2e-round8-browser-04-readme-open-20260523.png'),
  searchResults: path.join(artifactDir, 'api-e2e-round8-browser-05-search-results-20260523.png'),
  collapsed: path.join(artifactDir, 'api-e2e-round8-browser-06-right-panel-collapsed-20260523.png'),
};

const events = [];
const consoleEntries = [];
const websocketEvents = [];
const fdSamples = [];
let browser;
let page;

function log(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...data };
  events.push(entry);
  console.log(JSON.stringify(entry));
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function pidListeningOn(port) {
  try {
    const out = execFileSync('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    });
    const match = out.match(/p(\d+)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function countFds(pid) {
  if (!pid) return null;
  try {
    const output = execFileSync('/usr/sbin/lsof', ['-nP', '-p', String(pid)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
    }).trim();
    return output ? Math.max(0, output.split('\n').length - 1) : 0;
  } catch {
    return null;
  }
}

function sampleFds(label, serverPid) {
  const item = { label, fdCount: countFds(serverPid), at: new Date().toISOString() };
  fdSamples.push(item);
  log('fd_sample', item);
  return item;
}

function fileExplorerSockets() {
  return websocketEvents.filter((entry) => entry.url.includes('/ws/file-explorer/'));
}

function activeFileExplorerSockets() {
  return fileExplorerSockets().filter((entry) => !entry.closedAt);
}

async function waitForFileExplorerSocketCount(expected, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fileExplorerSockets().length === expected) return;
    await page.waitForTimeout(100);
  }
  assert(false, `Timed out waiting for file explorer websocket total=${expected}`, { websocketEvents });
}

async function waitForActiveFileExplorerSocketCount(expected, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (activeFileExplorerSockets().length === expected) return;
    await page.waitForTimeout(100);
  }
  assert(false, `Timed out waiting for active file explorer websocket count=${expected}`, { websocketEvents });
}

async function saveScreenshot(name, filePath) {
  await page.screenshot({ path: filePath, fullPage: false });
  log('screenshot', { name, filePath });
}

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(logPath, '');
  assert(fssync.existsSync(workspaceRoot), `workspace root missing: ${workspaceRoot}`);

  const serverPid = pidListeningOn(8000);
  assert(serverPid, 'backend server is not listening on port 8000');
  log('environment', {
    frontendUrl,
    backendBaseUrl,
    workspaceRoot,
    serverPid,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  sampleFds('before_browser_launch', serverPid);

  browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US',
  });
  page = await context.newPage();

  page.on('console', (message) => {
    const entry = { at: new Date().toISOString(), type: message.type(), text: message.text() };
    consoleEntries.push(entry);
    if (/FileExplorerStreaming|\[Workspace\]|WebSocket|file system watcher/i.test(entry.text)) {
      log('browser_console_signal', entry);
    }
  });
  page.on('pageerror', (error) => {
    consoleEntries.push({ at: new Date().toISOString(), type: 'pageerror', text: String(error) });
    log('page_error', { text: String(error), stack: error?.stack });
  });
  page.on('websocket', (ws) => {
    const entry = { at: new Date().toISOString(), url: ws.url(), closedAt: null };
    websocketEvents.push(entry);
    log('websocket_open', { url: ws.url() });
    ws.on('close', () => {
      entry.closedAt = new Date().toISOString();
      log('websocket_close', { url: ws.url() });
    });
  });

  await page.goto(`${frontendUrl}/agents?view=list`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Daily Assistant', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await saveScreenshot('agents', screenshots.agents);
  assert(fileExplorerSockets().length === 0, 'file explorer websocket opened on agents list before Files UI was visible', { websocketEvents });
  sampleFds('after_agents_list_before_workspace', serverPid);

  const dailyAssistantCard = page.locator('.group.h-full').filter({ hasText: 'Daily Assistant' }).first();
  await dailyAssistantCard.waitFor({ state: 'visible', timeout: 30000 });
  await dailyAssistantCard.getByRole('button', { name: 'Run' }).click();
  log('click', { label: 'Daily Assistant Run' });

  await page.waitForURL('**/workspace', { timeout: 30000 });
  await page.getByText('Workspace Directory', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await saveScreenshot('configNoFiles', screenshots.configNoFiles);
  const preCustomFileExplorerTotal = fileExplorerSockets().length;
  if (preCustomFileExplorerTotal > 0) {
    await page.getByPlaceholder('Search').waitFor({ state: 'visible', timeout: 10000 });
    await waitForActiveFileExplorerSocketCount(1, 15000);
    log('observed_auto_temp_files_tab', {
      reason: 'WorkspaceSelector auto-selected the temp workspace and the UI made Files visible.',
      fileExplorerSockets: fileExplorerSockets(),
    });
  }
  assert(preCustomFileExplorerTotal <= 1, 'workspace config screen should have at most one visible Files live stream', { websocketEvents });
  sampleFds('after_run_config_before_custom_workspace_load', serverPid);

  const newTab = page.getByRole('tab', { name: 'New' });
  if (await newTab.isEnabled().catch(() => false)) {
    await newTab.click();
    log('click', { label: 'WorkspaceSelector New tab' });
  }
  const pathInput = page.getByPlaceholder('/absolute/path/to/workspace');
  await pathInput.waitFor({ state: 'visible', timeout: 10000 });
  await pathInput.fill(workspaceRoot);
  log('fill', { label: 'Workspace path', value: workspaceRoot });
  await page.getByRole('button', { name: 'Load' }).click();
  log('click', { label: 'Load workspace' });

  const readmeFileItem = page.locator('.file-header').filter({ hasText: 'README.md' }).first();
  await readmeFileItem.waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('.file-header').filter({ hasText: 'src' }).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('.file-header').filter({ hasText: 'docs' }).first().waitFor({ state: 'visible', timeout: 30000 });
  await waitForFileExplorerSocketCount(preCustomFileExplorerTotal + 1, 15000);
  await waitForActiveFileExplorerSocketCount(1, 15000);
  assert(!activeFileExplorerSockets()[0]?.url.includes('temp_ws_default'), 'custom workspace load should replace any temp-workspace live stream', { websocketEvents });
  await saveScreenshot('filesTree', screenshots.filesTree);
  sampleFds('after_files_visible_one_live_stream', serverPid);

  await readmeFileItem.click();
  log('click', { label: 'README.md' });
  await page.getByText('Browser E2E Workspace', { exact: false }).waitFor({ state: 'visible', timeout: 30000 });
  await saveScreenshot('readmeOpen', screenshots.readmeOpen);

  const searchInput = page.getByPlaceholder('Search');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('search-target');
  log('fill', { label: 'File explorer search', value: 'search-target' });
  await page.locator('.file-header').filter({ hasText: 'search-target.md' }).first().waitFor({ state: 'visible', timeout: 30000 });
  await saveScreenshot('searchResults', screenshots.searchResults);
  assert(activeFileExplorerSockets().length === 1, 'search should keep exactly one active visible file explorer websocket', { websocketEvents });
  sampleFds('after_search_results_one_live_stream', serverPid);

  const toggleButton = page.locator('[data-test="workspace-right-panel"] > div > div.flex.items-center.justify-between button').last();
  await toggleButton.waitFor({ state: 'visible', timeout: 10000 });
  await toggleButton.click();
  log('click', { label: 'Collapse right panel' });
  await page.getByTestId('workspace-right-panel').waitFor({ state: 'detached', timeout: 10000 });
  await waitForActiveFileExplorerSocketCount(0, 15000);
  await saveScreenshot('collapsed', screenshots.collapsed);
  sampleFds('after_right_panel_collapsed_stream_released', serverPid);

  await page.getByTitle('Files').click();
  log('click', { label: 'Reopen Files from right sidebar strip' });
  await page.locator('.file-header').filter({ hasText: 'README.md' }).first().waitFor({ state: 'visible', timeout: 30000 });
  await waitForFileExplorerSocketCount(preCustomFileExplorerTotal + 2, 15000);
  await waitForActiveFileExplorerSocketCount(1, 15000);
  sampleFds('after_files_reopened_one_live_stream', serverPid);

  await page.goto(`${frontendUrl}/agents?view=list`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForActiveFileExplorerSocketCount(0, 15000);
  sampleFds('after_navigate_away_stream_released', serverPid);

  const fileExplorerWs = fileExplorerSockets();
  assert(fileExplorerWs.length === preCustomFileExplorerTotal + 2, 'expected file-explorer websocket creations to equal optional auto-temp stream plus custom open and custom reopen', { fileExplorerWs, preCustomFileExplorerTotal });
  assert(fileExplorerWs.every((entry) => entry.closedAt), 'all file explorer websockets should be closed after navigation away', { fileExplorerWs });

  const errorConsole = consoleEntries.filter((entry) => ['error', 'pageerror'].includes(entry.type));
  const unexpectedErrors = errorConsole.filter((entry) => !/Failed to load resource.*favicon|ResizeObserver loop/i.test(entry.text));
  assert(unexpectedErrors.length === 0, 'unexpected browser console/page errors during browser E2E', { unexpectedErrors });

  await fs.writeFile(summaryPath, JSON.stringify({
    result: 'pass',
    frontendUrl,
    backendBaseUrl,
    workspaceRoot,
    serverPid,
    screenshots,
    websocketEvents,
    fdSamples,
    consoleSignalEntries: consoleEntries.filter((entry) => /FileExplorerStreaming|\[Workspace\]|file system/i.test(entry.text)),
    events,
  }, null, 2));
  log('result', { result: 'pass', summaryPath });
}

try {
  await main();
} catch (error) {
  const failure = {
    result: 'fail',
    error: String(error),
    stack: error?.stack,
    details: error?.details,
    websocketEvents,
    fdSamples,
    consoleEntries,
    events,
  };
  await fs.writeFile(summaryPath, JSON.stringify(failure, null, 2)).catch(() => undefined);
  log('result', { result: 'fail', error: String(error), summaryPath });
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close().catch(() => undefined);
  }
  await fs.writeFile(logPath, events.map((entry) => JSON.stringify(entry)).join('\n') + '\n').catch(() => undefined);
}
