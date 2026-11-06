#!/usr/bin/env node
/**
 * Live VNC Viewer probe: the web app's VNC Viewer tab against a test-owned Docker node, through the
 * node's own server (`/ws/node-desktop`). Prerequisites: a web app at --base-url whose bound node is
 * the test container's server, and the container labelled com.autobyteus.api-e2e-owner=<label>.
 * Cases: VNC-LIVE-001-003 connect/reconnect, Maximize keeps the agent desktop's size, View only by
 * default with no clipboard to the viewer, Control with clipboard both ways; VNC-LIVE-004 denied and
 * missing Clipboard API stay non-fatal. Run:
 *   pnpm -C autobyteus-web test:e2e:vnc-live --base-url <url> --vnc-container <name> --output-dir <new dir>
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const getArg = (name, fallback = undefined) => {
  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
};

const trimSlash = (value) => value.replace(/\/$/, '');
const baseUrl = trimSlash(getArg('base-url', 'http://127.0.0.1:13018'));
const origin = new URL(baseUrl).origin;
const outputDir = path.resolve(getArg('output-dir', 'test-results/vnc-live'));
const vncContainer = getArg('vnc-container');
const vncDisplay = getArg('vnc-display', ':100');
const expectedOwnerLabel = getArg('expected-container-label', 'replace-vendored-novnc');
const timeoutMs = Number(getArg('timeout-ms', '60000'));
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserExecutableCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserExecutableCandidates.find((candidate) => existsSync(candidate));

if (!vncContainer) {
  throw new Error('--vnc-container is required; the probe refuses to discover or reuse an arbitrary container');
}

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
};

const dockerExecArgs = (...args) => [
  'exec',
  '--user', 'vncuser',
  '--env', `DISPLAY=${vncDisplay}`,
  vncContainer,
  ...args,
];

const readRemoteClipboard = () => run('docker', dockerExecArgs('xclip', '-selection', 'clipboard', '-out')).trim();
const writeRemoteClipboard = (text) => {
  run(
    'docker',
    [
      'exec', '-i',
      '--user', 'vncuser',
      '--env', `DISPLAY=${vncDisplay}`,
      vncContainer,
      'xclip', '-selection', 'clipboard', '-in',
    ],
    { input: text },
  );
};
const readRemoteDimensions = () => {
  const output = run('docker', dockerExecArgs('bash', '-lc', "xdpyinfo | awk '/dimensions:/{print $2; exit}'"));
  const match = output.trim().match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error(`Unable to parse remote display dimensions from: ${output}`);
  return { width: Number(match[1]), height: Number(match[2]), text: match[0] };
};

const waitFor = async (description, fn, timeout = timeoutMs, interval = 150) => {
  const startedAt = Date.now();
  let lastValue;
  let lastError;
  while (Date.now() - startedAt < timeout) {
    try {
      lastValue = await fn();
      if (lastValue) return lastValue;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timed out waiting for ${description}; lastValue=${JSON.stringify(lastValue)}${lastError ? `; lastError=${lastError.message}` : ''}`);
};

const ownerLabel = run('docker', [
  'inspect',
  '--format', '{{ index .Config.Labels "com.autobyteus.api-e2e-owner" }}',
  vncContainer,
]).trim();
if (ownerLabel !== expectedOwnerLabel) {
  throw new Error(`Refusing container ${vncContainer}: expected owned label ${expectedOwnerLabel}, observed ${ownerLabel || '<empty>'}`);
}

await fs.mkdir(outputDir, { recursive: true });

const evidence = {
  startedAt: new Date().toISOString(),
  baseUrl,
  origin,
  vncContainer,
  vncDisplay,
  expectedOwnerLabel,
  browserExecutable: executablePath || 'playwright-default',
  platform: `${process.platform}-${process.arch}`,
  scenarios: {},
  browserEvents: [],
  failures: [],
};

let browser;
const contexts = [];

const recordPageEvents = (page, scenarioId) => {
  page.on('console', (message) => {
    evidence.browserEvents.push({ scenarioId, type: `console:${message.type()}`, text: message.text() });
  });
  page.on('pageerror', (error) => {
    evidence.browserEvents.push({ scenarioId, type: 'pageerror', text: error.message });
  });
  page.on('requestfailed', (request) => {
    evidence.browserEvents.push({
      scenarioId,
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    });
  });
  page.on('websocket', (socket) => {
    const event = { scenarioId, type: 'websocket', url: socket.url(), framesSent: 0, framesReceived: 0, closed: false };
    evidence.browserEvents.push(event);
    socket.on('framesent', () => { event.framesSent += 1; });
    socket.on('framereceived', () => { event.framesReceived += 1; });
    socket.on('close', () => { event.closed = true; });
    socket.on('socketerror', (error) => { event.error = String(error); });
  });
};

const locateAndOpenVnc = async (page, scenarioId) => {
  await page.goto(`${baseUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="workspace-adaptive-layout"]').waitFor({ state: 'visible', timeout: timeoutMs });

  const selectors = [
    '[data-test="workspace-right-panel"] [data-tab-name="vnc"]',
    '[data-test="workspace-right-tool-drawer"] [data-tab-name="vnc"]',
    '[data-test="workspace-right-tool-strip"] [data-tab-name="vnc"]',
  ];
  let selected = false;
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      selected = true;
      break;
    }
  }
  if (!selected) throw new Error(`${scenarioId}: no visible VNC tab/strip control found`);

  const viewer = page.locator('.vnc-viewer');
  await viewer.waitFor({ state: 'visible', timeout: timeoutMs });

  const tile = viewer.locator('[data-testid="node-desktop-tile"]').first();
  await tile.waitFor({ state: 'visible', timeout: timeoutMs });
  await waitForStatus(tile, 'Connected · View only');
  const canvas = tile.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: timeoutMs });
  await waitFor(`${scenarioId} framebuffer canvas dimensions`, async () => {
    const box = await canvas.boundingBox();
    return box && box.width > 20 && box.height > 20 ? box : null;
  });
  await waitFor(`${scenarioId} active VNC WebSocket frames`, async () => evidence.browserEvents.find(
    (event) => event.scenarioId === scenarioId && event.type === 'websocket' && event.framesSent > 0 && event.framesReceived > 0,
  ));
  return { viewer, tile, canvas };
};

const waitForStatus = (tile, text) =>
  tile.locator('[data-testid="node-desktop-status"]').getByText(text, { exact: true })
    .waitFor({ state: 'visible', timeout: timeoutMs });

const switchMode = async (tile, from, to) => {
  await tile.getByRole('button', { name: from, exact: true }).click();
  await waitForStatus(tile, `Connected · ${to}`);
  await tile.getByRole('button', { name: to, exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
};

/** Every desktop socket goes to the node's server route; nothing dials a VNC port. */
const assertNodeDesktopSockets = (scenarioId) => {
  const sockets = evidence.browserEvents.filter((event) => event.scenarioId === scenarioId && event.type === 'websocket'
    && !event.url.includes('/graphql') && !event.url.includes('/_nuxt'));
  const desktopSockets = sockets.filter((event) => new URL(event.url).pathname === '/ws/node-desktop');
  if (desktopSockets.length === 0) throw new Error(`${scenarioId}: no /ws/node-desktop socket observed`);
  for (const event of desktopSockets) {
    const mode = new URL(event.url).searchParams.get('mode');
    if (mode !== 'view' && mode !== 'control') throw new Error(`${scenarioId}: unexpected stream URL ${event.url}`);
  }
  const vncPortSockets = sockets.filter((event) => /websockify|:6080|:5900/.test(event.url));
  if (vncPortSockets.length > 0) throw new Error(`${scenarioId}: a socket dialled a VNC port: ${vncPortSockets[0].url}`);
  return desktopSockets.map((event) => ({ url: event.url, framesSent: event.framesSent, framesReceived: event.framesReceived }));
};

const createContext = async (scenarioId, options = {}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    ...options,
  });
  contexts.push(context);
  const page = await context.newPage();
  recordPageEvents(page, scenarioId);
  return { context, page };
};

try {
  browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--disable-dev-shm-usage'],
  });

  // VNC-LIVE-001/002/003: lifecycle through /ws/node-desktop, no resize, View only and Control clipboard.
  {
    const scenarioId = 'VNC-LIVE-001-003';
    const { context, page } = await createContext(scenarioId);
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const { tile, canvas } = await locateAndOpenVnc(page, scenarioId);
    const initialCanvas = await canvas.boundingBox();
    const initialRemote = readRemoteDimensions();
    const permissionStates = await page.evaluate(async () => ({
      read: (await navigator.permissions.query({ name: 'clipboard-read' })).state,
      write: (await navigator.permissions.query({ name: 'clipboard-write' })).state,
    }));

    await tile.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await tile.getByRole('button', { name: 'Connect', exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    await tile.getByRole('button', { name: 'Connect', exact: true }).click();
    await waitForStatus(tile, 'Connected · View only');

    await tile.getByTitle('Maximize view').click();
    const maximizedTile = page.locator('.vnc-maximized');
    await maximizedTile.waitFor({ state: 'visible', timeout: timeoutMs });
    await maximizedTile.locator('canvas').first().waitFor({ state: 'visible', timeout: timeoutMs });
    await page.waitForTimeout(1500);
    const maximizedRemote = readRemoteDimensions();
    if (maximizedRemote.text !== initialRemote.text) {
      throw new Error(`${scenarioId}: Maximize resized the agent desktop from ${initialRemote.text} to ${maximizedRemote.text}`);
    }
    await page.keyboard.press('Escape');
    await maximizedTile.waitFor({ state: 'detached', timeout: timeoutMs });
    await tile.waitFor({ state: 'visible', timeout: timeoutMs });

    // View only: the agent's clipboard does not reach the viewer's device (AC-020).
    const browserClipboardBefore = `autobyteus-local-before-${Date.now()}`;
    await page.evaluate((text) => navigator.clipboard.writeText(text), browserClipboardBefore);
    writeRemoteClipboard(`autobyteus-remote-view-only-${Date.now()}`);
    await page.waitForTimeout(1500);
    const browserClipboardInViewOnly = await page.evaluate(() => navigator.clipboard.readText());
    if (browserClipboardInViewOnly !== browserClipboardBefore) {
      throw new Error(`${scenarioId}: View only copied the agent's clipboard to the viewer`);
    }

    await switchMode(tile, 'View only', 'Control');
    await page.waitForTimeout(400);

    const localToRemoteText = `autobyteus-local-to-remote-${Date.now()}`;
    await page.evaluate((text) => navigator.clipboard.writeText(text), localToRemoteText);
    await canvas.focus();
    const observedRemoteClipboard = await waitFor(`${scenarioId} local-to-remote clipboard`, () => {
      const value = readRemoteClipboard();
      return value === localToRemoteText ? value : null;
    });

    const remoteToLocalText = `autobyteus-remote-to-local-${Date.now()}`;
    writeRemoteClipboard(remoteToLocalText);
    const observedBrowserClipboard = await waitFor(`${scenarioId} remote-to-local clipboard`, async () => {
      const value = await page.evaluate(() => navigator.clipboard.readText());
      return value === remoteToLocalText ? value : null;
    });

    const controlRemote = readRemoteDimensions();
    if (controlRemote.text !== initialRemote.text) {
      throw new Error(`${scenarioId}: Control resized the agent desktop from ${initialRemote.text} to ${controlRemote.text}`);
    }
    await page.screenshot({ path: path.join(outputDir, 'vnc-live-connected-control.png'), fullPage: true });
    await tile.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await tile.getByRole('button', { name: 'Connect', exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });

    evidence.scenarios[scenarioId] = {
      result: 'Pass',
      permissionStates,
      initialCanvas,
      initialRemote,
      maximizedRemote,
      controlRemote,
      browserClipboardInViewOnly,
      localToRemoteText,
      observedRemoteClipboard,
      remoteToLocalText,
      observedBrowserClipboard,
      nodeDesktopSockets: assertNodeDesktopSockets(scenarioId),
    };
    await context.close();
  }

  // VNC-LIVE-004A: actual denied browser clipboard permissions remain non-fatal.
  {
    const scenarioId = 'VNC-LIVE-004-denied';
    const { context, page } = await createContext(scenarioId);
    const cdp = await context.newCDPSession(page);
    const targetInfo = await cdp.send('Target.getTargetInfo');
    const browserContextId = targetInfo.targetInfo.browserContextId;
    for (const name of ['clipboard-read', 'clipboard-write']) {
      await cdp.send('Browser.setPermission', {
        origin,
        browserContextId,
        permission: { name },
        setting: 'denied',
      });
    }
    const { tile, canvas } = await locateAndOpenVnc(page, scenarioId);
    const permissionStates = await page.evaluate(async () => ({
      read: (await navigator.permissions.query({ name: 'clipboard-read' })).state,
      write: (await navigator.permissions.query({ name: 'clipboard-write' })).state,
    }));
    if (permissionStates.read !== 'denied' || permissionStates.write !== 'denied') {
      throw new Error(`${scenarioId}: expected denied permissions, observed ${JSON.stringify(permissionStates)}`);
    }
    await switchMode(tile, 'View only', 'Control');
    await canvas.focus();
    writeRemoteClipboard(`denied-nonfatal-${Date.now()}`);
    await page.waitForTimeout(800);
    await waitForStatus(tile, 'Connected · Control');
    const readAttempt = await page.evaluate(async () => {
      try {
        await navigator.clipboard.readText();
        return 'unexpected-success';
      } catch (error) {
        return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      }
    });
    if (readAttempt === 'unexpected-success') throw new Error(`${scenarioId}: denied clipboard read unexpectedly succeeded`);
    evidence.scenarios[scenarioId] = { result: 'Pass', permissionStates, readAttempt };
    await context.close();
  }

  // VNC-LIVE-004B: missing Clipboard API remains non-fatal.
  {
    const scenarioId = 'VNC-LIVE-004-unsupported';
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
      timezoneId: 'Europe/Berlin',
    });
    contexts.push(context);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    });
    const page = await context.newPage();
    recordPageEvents(page, scenarioId);
    const { tile, canvas } = await locateAndOpenVnc(page, scenarioId);
    const clipboardType = await page.evaluate(() => typeof navigator.clipboard);
    if (clipboardType !== 'undefined') throw new Error(`${scenarioId}: clipboard override did not apply`);
    await switchMode(tile, 'View only', 'Control');
    await canvas.focus();
    writeRemoteClipboard(`unsupported-nonfatal-${Date.now()}`);
    await page.waitForTimeout(800);
    await waitForStatus(tile, 'Connected · Control');
    evidence.scenarios[scenarioId] = { result: 'Pass', clipboardType };
    await context.close();
  }
} catch (error) {
  evidence.failures.push({ message: error.message, stack: error.stack });
  for (let index = 0; index < contexts.length; index += 1) {
    const pages = contexts[index].pages();
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      await pages[pageIndex].screenshot({
        path: path.join(outputDir, `failure-context-${index}-page-${pageIndex}.png`),
        fullPage: true,
      }).catch(() => {});
    }
  }
  process.exitCode = 1;
} finally {
  evidence.finishedAt = new Date().toISOString();
  evidence.result = evidence.failures.length === 0 ? 'Pass' : 'Fail';
  await fs.writeFile(path.join(outputDir, 'vnc-live-results.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close().catch(() => {});
}

if (evidence.failures.length > 0) {
  console.error(JSON.stringify({ result: evidence.result, failures: evidence.failures }, null, 2));
} else {
  console.log(JSON.stringify({
    result: evidence.result,
    scenarios: evidence.scenarios,
    evidence: path.join(outputDir, 'vnc-live-results.json'),
  }, null, 2));
}
