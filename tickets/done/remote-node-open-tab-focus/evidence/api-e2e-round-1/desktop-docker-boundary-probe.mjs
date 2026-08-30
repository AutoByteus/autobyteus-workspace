#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const webDir = process.argv[2];
const outputDir = process.argv[3];
assert(webDir && outputDir, 'Usage: node desktop-docker-boundary-probe.mjs <web-dir> <output-dir>');

const requireFromWeb = createRequire(path.join(webDir, 'package.json'));
const { _electron } = requireFromWeb('playwright-core');
const { prepareElectronE2ELaunch } = await import(pathToFileURL(
  path.join(webDir, 'scripts/electron-e2e/electronE2ELaunchPreparation.mjs'),
));
const { launchPreparedElectronWithPlaywright } = await import(pathToFileURL(
  path.join(webDir, 'scripts/electron-e2e/playwrightElectronProcessAdapter.mjs'),
));

const evidencePath = path.join(outputDir, '14-desktop-docker-probe.json');
const logPath = path.join(outputDir, '14-desktop-docker-probe.log');
const dockerLogPath = path.join(outputDir, '14-owned-docker.log');
const electronLogPath = path.join(outputDir, '14-owned-electron.log');
const embeddedScreenshotPath = path.join(outputDir, '14-embedded-window.png');
const remoteScreenshotPath = path.join(outputDir, '14-remote-window.png');
const unique = `${process.pid}-${Date.now()}`;
const containerName = `autobyteus-api-e2e-open-tab-${unique}`;
const dockerRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-api-e2e-remote-'));
const targetToken = `REMOTE_OPEN_TAB_TARGET_${unique}`;
const embeddedToken = `EMBEDDED_BROWSER_TARGET_${unique}`;
const evidence = {
  generatedAt: new Date().toISOString(),
  executionMode: 'Owned published Docker node plus project E2E-profile packaged Electron launched with Playwright',
  result: 'Fail',
  docker: { containerName, image: 'autobyteus/autobyteus-server:latest', tempRoot: dockerRoot },
  electron: {},
  targetServer: { requests: [] },
  scenarios: {},
  cleanup: {},
};

const run = async (command, args, options = {}) => execFileAsync(command, args, {
  maxBuffer: 20 * 1024 * 1024,
  ...options,
});

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '0.0.0.0', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const waitFor = async (label, predicate, timeoutMs = 180_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};

const listProductionAutoByteusProcesses = async () => {
  const { stdout } = await run('/bin/ps', ['-ax', '-o', 'pid=,command=']);
  return stdout.split('\n')
    .filter((line) => line.includes('/Applications/AutoByteus.app/Contents/'))
    .map((line) => line.trim());
};

const listExistingAutoByteusContainers = async () => {
  const { stdout } = await run('docker', ['ps', '--format', '{{.Names}}|{{.ID}}|{{.Status}}|{{.Image}}']);
  return stdout.split('\n').filter((line) => line.trim().length > 0 && line.includes('autobyteus'));
};

const closeHttpServer = (server) => new Promise((resolve, reject) => {
  if (!server) return resolve();
  server.close((error) => error ? reject(error) : resolve());
});

await fs.mkdir(outputDir, { recursive: true });
for (const name of ['data', 'root-home', 'chromium-profile', 'workspace', 'shared']) {
  const directory = path.join(dockerRoot, name);
  await fs.mkdir(directory, { recursive: true });
  await fs.chmod(directory, 0o777);
}

let targetServer;
let prepared;
let session;
let dockerStarted = false;
let remoteTabId;
let executionError;
let cleanupError;

try {
  evidence.safetyBefore = {
    productionAutoByteusProcesses: await listProductionAutoByteusProcesses(),
    existingAutoByteusContainers: await listExistingAutoByteusContainers(),
  };

  const [backendPort, vncPort, noVncPort, debugPort, targetPort] = await Promise.all([
    getFreePort(), getFreePort(), getFreePort(), getFreePort(), getFreePort(),
  ]);
  const dockerBaseUrl = `http://127.0.0.1:${backendPort}`;
  evidence.docker.ports = { backendPort, vncPort, noVncPort, debugPort };
  evidence.docker.baseUrl = dockerBaseUrl;
  evidence.targetServer.port = targetPort;

  targetServer = http.createServer((request, response) => {
    evidence.targetServer.requests.push({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'] ?? null,
      at: new Date().toISOString(),
    });
    const isRemote = request.url?.startsWith('/remote-target');
    const token = isRemote ? targetToken : embeddedToken;
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html><head><title>${token}</title></head><body><main><h1>${token}</h1></main></body></html>`);
  });
  await new Promise((resolve, reject) => {
    targetServer.once('error', reject);
    targetServer.listen(targetPort, '0.0.0.0', resolve);
  });

  const dockerArgs = [
    'run', '-d', '--rm',
    '--name', containerName,
    '--cap-add', 'SYS_ADMIN',
    '--security-opt', 'seccomp=unconfined',
    '-p', `127.0.0.1:${backendPort}:8000`,
    '-p', `127.0.0.1:${vncPort}:5900`,
    '-p', `127.0.0.1:${noVncPort}:6080`,
    '-p', `127.0.0.1:${debugPort}:9223`,
    '-e', `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${backendPort}`,
    '-e', `AUTOBYTEUS_VNC_SERVER_HOSTS=127.0.0.1:${noVncPort}`,
    '-e', 'AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace',
    '-v', `${path.join(dockerRoot, 'data')}:/home/autobyteus/data`,
    '-v', `${path.join(dockerRoot, 'root-home')}:/root`,
    '-v', `${path.join(dockerRoot, 'chromium-profile')}:/home/vncuser/.config/chromium`,
    '-v', `${path.join(dockerRoot, 'workspace')}:/home/autobyteus/workspace`,
    '-v', `${path.join(dockerRoot, 'shared')}:/home/autobyteus/shared`,
    'autobyteus/autobyteus-server:latest',
  ];
  const started = await run('docker', dockerArgs);
  dockerStarted = true;
  evidence.docker.containerId = started.stdout.trim();
  await waitFor('owned Docker /rest/health', async () => {
    const response = await fetch(`${dockerBaseUrl}/rest/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  });
  evidence.docker.health = await (await fetch(`${dockerBaseUrl}/rest/health`)).json();
  const debugVersion = await waitFor('owned Docker Chromium debug endpoint', async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(2000) });
    return response.ok ? response.json() : null;
  });
  evidence.docker.chromeDebugVersion = debugVersion;

  const remoteTargetUrl = `http://host.docker.internal:${targetPort}/remote-target`;
  const openReadScript = [
    "const { openTab } = await import('/app/autobyteus-server-ts/dist/agent-tools/browser/open-tab.js');",
    "const { readPage } = await import('/app/autobyteus-server-ts/dist/agent-tools/browser/read-page.js');",
    "const opened = JSON.parse(await openTab({agentId:'api-e2e-open-tab-probe'}, process.argv[1], 'API/E2E remote target', false, 'load'));",
    "const page = JSON.parse(await readPage({agentId:'api-e2e-open-tab-probe'}, opened.tab_id, 'thorough'));",
    "console.log('API_E2E_BROWSER_RESULT=' + JSON.stringify({opened, page}));",
  ].join('\n');
  try {
    const toolExecution = await run('docker', [
      'exec', containerName, 'node', '--input-type=module', '-e', openReadScript, remoteTargetUrl,
    ]);
    const marker = toolExecution.stdout.split('\n').find((line) => line.startsWith('API_E2E_BROWSER_RESULT='));
    assert(marker, `Owned Docker browser tool result marker missing: ${toolExecution.stdout}`);
    const remoteBrowserResult = JSON.parse(marker.slice('API_E2E_BROWSER_RESULT='.length));
    assert.equal(remoteBrowserResult.opened.status, 'opened');
    assert.equal(remoteBrowserResult.opened.url, remoteTargetUrl);
    assert.equal(typeof remoteBrowserResult.opened.tab_id, 'string');
    assert(remoteBrowserResult.opened.tab_id.length > 0);
    assert(JSON.stringify(remoteBrowserResult.page).includes(targetToken), 'Docker read_page did not observe the owned destination token');
    remoteTabId = remoteBrowserResult.opened.tab_id;
    evidence.docker.browserToolAttempt = { status: 'Pass', stdout: toolExecution.stdout };
    evidence.docker.openTabResult = remoteBrowserResult.opened;
    evidence.docker.readPageResult = remoteBrowserResult.page;
  } catch (error) {
    const message = `${error?.stderr ?? ''}\n${error?.message ?? String(error)}`;
    assert.match(message, /browser_unsupported_in_current_environment/);
    evidence.docker.browserToolAttempt = {
      status: 'Not Tested — clean published node has no configured BrowserServer MCP',
      explanation: 'Docker/remote browser tools are supplied by a user-configured BrowserServer MCP, not the Electron embedded adapter. The disposable clean node intentionally contains no user MCP checkout/configuration.',
      observedError: message,
    };
    const createdResponse = await fetch(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(remoteTargetUrl)}`,
      { method: 'PUT' },
    );
    assert(createdResponse.ok, `Chrome target creation failed with ${createdResponse.status}`);
    const createdTarget = await createdResponse.json();
    const observedTarget = await waitFor('owned destination in Docker Chromium', async () => {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      return targets.find((target) => target.id === createdTarget.id && target.url === remoteTargetUrl && target.title === targetToken) ?? null;
    });
    remoteTabId = observedTarget.id;
    evidence.docker.cdpOpenedTarget = observedTarget;
    evidence.docker.openTabResult = {
      tab_id: observedTarget.id,
      status: 'opened',
      url: observedTarget.url,
      title: observedTarget.title,
    };
  }
  assert(remoteTabId);
  assert(await waitFor('remote destination request', () => evidence.targetServer.requests.some((item) => item.url?.startsWith('/remote-target'))));
  evidence.scenarios['API-E2E-008'] = {
    result: 'Pass',
    expected: 'The owned remote Docker node has a healthy backend plus independent Chromium runtime that opens and owns the destination URL; no host Electron browser is involved.',
    actual: {
      remoteBrowserOutcome: evidence.docker.openTabResult,
      destinationRequestObserved: true,
      chromeProduct: debugVersion.Browser ?? null,
      browserToolAttempt: evidence.docker.browserToolAttempt.status,
    },
  };

  const electronSourceEnv = { ...process.env };
  // The Codex host exports this for its own tool subprocesses. A normal desktop
  // launch must not inherit it or Electron intentionally behaves as plain Node.
  delete electronSourceEnv.ELECTRON_RUN_AS_NODE;
  evidence.electron.environmentCorrection = 'Removed host-only ELECTRON_RUN_AS_NODE for the documented desktop launch semantics.';
  prepared = await prepareElectronE2ELaunch({ webRoot: webDir, build: false, sourceEnv: electronSourceEnv });
  evidence.electron.prepared = prepared.metadata;
  session = await launchPreparedElectronWithPlaywright(prepared, _electron);
  evidence.electron.rootPid = session.electronApplication.process().pid;
  await session.waitUntilReady(180_000);
  const embeddedPage = await session.firstWindow({ timeout: 120_000 });
  await embeddedPage.waitForLoadState('domcontentloaded');
  await embeddedPage.waitForFunction(() => Boolean(window.electronAPI?.getWindowContext));
  const embeddedContext = await embeddedPage.evaluate(() => window.electronAPI.getWindowContext());
  assert.equal(embeddedContext.nodeId, 'embedded-local');
  const initialEmbeddedBrowserSnapshot = await embeddedPage.evaluate(() => window.electronAPI.getBrowserShellSnapshot());

  const embeddedTargetUrl = `http://127.0.0.1:${targetPort}/embedded-target`;
  const embeddedOpened = await embeddedPage.evaluate(
    (url) => window.electronAPI.openBrowserTab({ url, title: 'API/E2E embedded target', waitUntil: 'load' }),
    embeddedTargetUrl,
  );
  assert.equal(embeddedOpened.activeTabId, embeddedOpened.sessions.at(-1)?.tab_id);
  assert.equal(embeddedOpened.sessions.at(-1)?.url, embeddedTargetUrl);
  const embeddedTabId = embeddedOpened.activeTabId;
  assert(embeddedTabId);
  const embeddedFocused = await embeddedPage.evaluate(
    (tabId) => window.electronAPI.focusBrowserTab(tabId),
    embeddedTabId,
  );
  assert.equal(embeddedFocused.activeTabId, embeddedTabId);
  await embeddedPage.screenshot({ path: embeddedScreenshotPath });

  const now = new Date().toISOString();
  const nodeProfile = {
    id: 'api-e2e-owned-docker-node',
    name: 'API/E2E Owned Docker Node',
    baseUrl: dockerBaseUrl,
    nodeType: 'remote',
    capabilities: { terminal: true, fileExplorerStreaming: true },
    capabilityProbeState: 'ready',
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
  const registrySnapshot = await embeddedPage.evaluate(
    (node) => window.electronAPI.upsertNodeRegistry({ type: 'add', node }),
    nodeProfile,
  );
  assert(registrySnapshot.nodes.some((node) => node.id === nodeProfile.id && node.baseUrl === dockerBaseUrl));
  const openedRemoteWindow = await embeddedPage.evaluate(
    (nodeId) => window.electronAPI.openNodeWindow(nodeId),
    nodeProfile.id,
  );
  assert.equal(openedRemoteWindow.created, true);

  const remotePage = await waitFor('node-bound remote Electron window', async () => {
    for (const candidate of session.electronApplication.windows()) {
      try {
        const context = await candidate.evaluate(() => window.electronAPI?.getWindowContext?.());
        if (context?.nodeId === nodeProfile.id) return candidate;
      } catch {
        // A window may be between creation and preload readiness.
      }
    }
    return null;
  });
  await remotePage.waitForLoadState('domcontentloaded');
  const remoteContext = await remotePage.evaluate(() => window.electronAPI.getWindowContext());
  assert.equal(remoteContext.windowId, openedRemoteWindow.windowId);
  assert.equal(remoteContext.nodeId, nodeProfile.id);
  const remoteBrowserSnapshotBefore = await remotePage.evaluate(() => window.electronAPI.getBrowserShellSnapshot());
  const invalidRemoteFocus = await remotePage.evaluate(async (tabId) => {
    try {
      const snapshot = await window.electronAPI.focusBrowserTab(tabId);
      return { accepted: true, snapshot };
    } catch (error) {
      return { accepted: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, remoteTabId);
  assert.equal(invalidRemoteFocus.accepted, false, 'A Docker tab id must not be focusable in Electron local Browser runtime');
  assert.match(invalidRemoteFocus.error, /not found|does not exist/i);
  const remoteBrowserSnapshotAfter = await remotePage.evaluate(() => window.electronAPI.getBrowserShellSnapshot());
  assert.deepEqual(remoteBrowserSnapshotAfter, remoteBrowserSnapshotBefore);
  const embeddedSnapshotAfterInvalidRemoteFocus = await embeddedPage.evaluate(() => window.electronAPI.getBrowserShellSnapshot());
  assert.equal(embeddedSnapshotAfterInvalidRemoteFocus.activeTabId, embeddedTabId);
  await remotePage.screenshot({ path: remoteScreenshotPath });

  evidence.scenarios['API-E2E-006-DESKTOP'] = {
    result: 'Pass',
    expected: 'The isolated current-worktree package starts with an embedded node-bound window, real Browser preload API, and a focusable local session.',
    actual: {
      embeddedContext,
      initialBrowserSnapshot: initialEmbeddedBrowserSnapshot,
      openedBrowserSnapshot: embeddedOpened,
      focusedBrowserSnapshot: embeddedFocused,
      destinationRequestObserved: evidence.targetServer.requests.some((item) => item.url?.startsWith('/embedded-target')),
    },
  };
  assert(evidence.scenarios['API-E2E-006-DESKTOP'].actual.destinationRequestObserved);

  evidence.scenarios['API-E2E-005-DESKTOP-REMOTE'] = {
    result: 'Pass',
    expected: 'The actual Node Registry opens the owned Docker backend in an immutable remote node-bound Electron window with Browser preload available; a real Docker tab id is not a local Electron session and cannot mutate either shell snapshot.',
    actual: {
      registryNode: registrySnapshot.nodes.find((node) => node.id === nodeProfile.id),
      openNodeWindowResult: openedRemoteWindow,
      remoteContext,
      remoteBrowserApiAvailable: true,
      remoteBrowserSnapshotBefore,
      invalidRemoteFocus,
      remoteBrowserSnapshotAfter,
      embeddedSnapshotAfterInvalidRemoteFocus,
    },
  };

  const logFilePath = await embeddedPage.evaluate(() => window.electronAPI.getLogFilePath());
  evidence.electron.logFilePath = logFilePath;
  if (existsSync(logFilePath)) await fs.copyFile(logFilePath, electronLogPath);

  await embeddedPage.evaluate((tabId) => window.electronAPI.closeBrowserShellSession(tabId), embeddedTabId);
  if (evidence.docker.browserToolAttempt.status === 'Pass') {
    const closeRemoteScript = [
      "const { closeTab } = await import('/app/autobyteus-server-ts/dist/agent-tools/browser/close-tab.js');",
      "console.log('API_E2E_CLOSE_RESULT=' + await closeTab({agentId:'api-e2e-open-tab-probe'}, process.argv[1]));",
    ].join('\n');
    const closeRemote = await run('docker', [
      'exec', containerName, 'node', '--input-type=module', '-e', closeRemoteScript, remoteTabId,
    ]);
    evidence.docker.closeTabStdout = closeRemote.stdout;
  } else {
    const closeResponse = await fetch(`http://127.0.0.1:${debugPort}/json/close/${remoteTabId}`);
    evidence.docker.closeTarget = { status: closeResponse.status, body: await closeResponse.text() };
    assert(closeResponse.ok);
  }
  evidence.result = 'Pass';
} catch (error) {
  executionError = error;
  evidence.failure = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
} finally {
  if (session) {
    try {
      evidence.cleanup.electron = await session.cleanup();
      evidence.cleanup.electronDataRootExistsAfterCleanup = existsSync(session.metadata.dataRoot);
    } catch (error) {
      cleanupError = cleanupError ?? error;
      evidence.cleanup.electron = { status: 'failed', message: error instanceof Error ? error.message : String(error) };
    }
  } else if (prepared?.getClaimState() === 'prepared') {
    await prepared.disposeOwnedDataRoot();
    evidence.cleanup.electron = { status: 'disposed-before-launch' };
  }

  if (dockerStarted) {
    try {
      const logs = await run('docker', ['logs', containerName]);
      await fs.writeFile(dockerLogPath, `${logs.stdout}${logs.stderr}`);
    } catch (error) {
      evidence.cleanup.dockerLogCapture = `failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    try {
      await run('docker', ['rm', '-f', containerName]);
      evidence.cleanup.dockerContainer = 'removed';
    } catch (error) {
      const inspect = await run('docker', ['inspect', containerName]).then(() => true).catch(() => false);
      if (inspect) {
        cleanupError = cleanupError ?? error;
        evidence.cleanup.dockerContainer = `failed: ${error instanceof Error ? error.message : String(error)}`;
      } else {
        evidence.cleanup.dockerContainer = 'already-removed';
      }
    }
  } else {
    evidence.cleanup.dockerContainer = 'not-started';
  }

  try {
    await closeHttpServer(targetServer);
    evidence.cleanup.targetServer = 'closed';
  } catch (error) {
    cleanupError = cleanupError ?? error;
    evidence.cleanup.targetServer = `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  try {
    await fs.rm(dockerRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    evidence.cleanup.dockerTempRoot = existsSync(dockerRoot) ? 'still-exists' : 'removed';
  } catch (error) {
    cleanupError = cleanupError ?? error;
    evidence.cleanup.dockerTempRoot = `failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  evidence.safetyAfter = {
    productionAutoByteusProcesses: await listProductionAutoByteusProcesses().catch(() => []),
    existingAutoByteusContainers: await listExistingAutoByteusContainers().catch(() => []),
    ownedContainerExists: await run('docker', ['inspect', containerName]).then(() => true).catch(() => false),
  };
  evidence.cleanup.productionAppProcessListUnchanged = JSON.stringify(evidence.safetyBefore?.productionAutoByteusProcesses ?? [])
    === JSON.stringify(evidence.safetyAfter.productionAutoByteusProcesses);
  evidence.cleanup.preExistingContainerIdentitiesUnchanged = JSON.stringify(evidence.safetyBefore?.existingAutoByteusContainers ?? [])
    === JSON.stringify(evidence.safetyAfter.existingAutoByteusContainers);
  if (cleanupError && !executionError) {
    evidence.result = 'Fail';
    evidence.failure = {
      message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
    };
  }
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  const lines = [
    `result=${evidence.result}`,
    `scenarios=${Object.entries(evidence.scenarios).map(([id, value]) => `${id}:${value.result}`).join(',')}`,
    `docker=${containerName}`,
    `electronPort=${evidence.electron.prepared?.port ?? 'not-started'}`,
    `electronDataRoot=${evidence.electron.prepared?.dataRoot ?? 'not-started'}`,
    `cleanup=${JSON.stringify(evidence.cleanup)}`,
    `productionAppUnaffected=${evidence.cleanup.productionAppProcessListUnchanged}`,
    `preExistingContainersUnaffected=${evidence.cleanup.preExistingContainerIdentitiesUnchanged}`,
    `evidence=${evidencePath}`,
  ];
  if (evidence.failure) lines.push(`failure=${JSON.stringify(evidence.failure)}`);
  await fs.writeFile(logPath, `${lines.join('\n')}\n`);
}

if (executionError) throw executionError;
if (cleanupError) throw cleanupError;
console.log(JSON.stringify({ result: evidence.result, scenarios: evidence.scenarios, cleanup: evidence.cleanup }, null, 2));
