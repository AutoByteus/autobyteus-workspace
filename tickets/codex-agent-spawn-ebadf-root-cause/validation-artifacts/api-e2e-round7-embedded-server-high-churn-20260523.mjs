import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import process from 'node:process';
import { createRequire } from 'node:module';

const repoRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause';
const serverCwd = path.join(repoRoot, 'autobyteus-server-ts');
const serverEntry = path.join(serverCwd, 'dist/app.js');
const artifactDir = path.join(repoRoot, 'tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts');
const requireFromServer = createRequire(path.join(serverCwd, 'package.json'));
const WebSocket = requireFromServer('ws');
const summaryPath = path.join(artifactDir, 'api-e2e-round7-embedded-server-high-churn-20260523.json');
const serverStdoutPath = path.join(artifactDir, 'api-e2e-round7-embedded-server-high-churn-20260523-server.stdout.log');
const serverStderrPath = path.join(artifactDir, 'api-e2e-round7-embedded-server-high-churn-20260523-server.stderr.log');

const events = [];
const fdSamples = [];
const childProcessSamples = [];
const serverStdout = [];
const serverStderr = [];
const tempRoots = [];
let server = null;
let dataDir = null;
let port = null;

function log(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...data };
  events.push(entry);
  console.log(JSON.stringify(entry));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  const srv = net.createServer();
  await new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', resolve);
  });
  const address = srv.address();
  await new Promise((resolve) => srv.close(resolve));
  return address.port;
}

function countFds(pid) {
  try {
    const output = execFileSync('/usr/sbin/lsof', ['-nP', '-p', String(pid)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    }).trim();
    if (!output) return 0;
    return Math.max(0, output.split('\n').length - 1);
  } catch (error) {
    return null;
  }
}

function sampleFds(label) {
  const count = server?.pid ? countFds(server.pid) : null;
  const sample = { label, count, at: new Date().toISOString() };
  fdSamples.push(sample);
  log('fd_sample', sample);
  return count;
}

function listDirectChildren(pid) {
  try {
    const output = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,comm='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
        if (!match) return null;
        return {
          pid: Number(match[1]),
          ppid: Number(match[2]),
          command: match[3],
        };
      })
      .filter((entry) => entry && entry.ppid === pid);
  } catch (error) {
    return null;
  }
}

function sampleChildProcesses(label) {
  const children = server?.pid ? listDirectChildren(server.pid) : null;
  const sample = {
    label,
    count: Array.isArray(children) ? children.length : null,
    children,
    at: new Date().toISOString(),
  };
  childProcessSamples.push(sample);
  log('child_process_sample', sample);
  return children;
}

function findPrismaEnginePair() {
  const target = process.platform === 'darwin'
    ? (process.arch === 'arm64' ? 'darwin-arm64' : 'darwin')
    : process.platform === 'win32'
      ? 'windows'
      : 'debian-openssl-3.0.x';
  const cacheRoot = path.join(os.homedir(), '.cache', 'prisma', 'master');
  let best = null;
  try {
    for (const version of fs.readdirSync(cacheRoot)) {
      const targetDir = path.join(cacheRoot, version, target);
      const query = path.join(targetDir, 'libquery-engine');
      const schema = path.join(targetDir, process.platform === 'win32' ? 'schema-engine.exe' : 'schema-engine');
      if (!fs.existsSync(query) || !fs.existsSync(schema)) continue;
      const mtimeMs = Math.max(fs.statSync(query).mtimeMs, fs.statSync(schema).mtimeMs);
      if (!best || mtimeMs > best.mtimeMs) {
        best = { target, sourcePath: targetDir, query, schema, mtimeMs };
      }
    }
  } catch {
    return null;
  }
  return best;
}

async function waitForHealth(baseUrl, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) {
      throw new Error(`server exited before health became ready: code=${server.exitCode} signal=${server.signalCode}`);
    }
    try {
      const res = await fetch(`${baseUrl}/rest/health`);
      if (res.ok) {
        const body = await res.json();
        if (body?.status === 'ok') return body;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(`timed out waiting for /rest/health: ${String(lastError)}`);
}

async function graphql(baseUrl, query, variables = {}) {
  const res = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    throw new Error(`GraphQL response was not JSON (${res.status}): ${text.slice(0, 500)}`);
  }
  if (!res.ok || body.errors?.length) {
    throw new Error(`GraphQL error (${res.status}): ${JSON.stringify(body).slice(0, 1000)}`);
  }
  return body.data;
}

async function writeWorkspace(root, fileCount) {
  await fsp.mkdir(path.join(root, 'src', 'nested'), { recursive: true });
  await fsp.mkdir(path.join(root, 'docs'), { recursive: true });
  await fsp.writeFile(path.join(root, 'README.md'), '# high churn watcher lifecycle\n');
  for (let i = 0; i < fileCount; i += 1) {
    const dir = i % 2 === 0 ? path.join(root, 'src') : path.join(root, 'src', 'nested');
    await fsp.writeFile(path.join(dir, `file-${i}.ts`), `export const value${i} = ${i};\n`);
  }
  await fsp.writeFile(path.join(root, 'docs', 'search-target.md'), 'codex descriptor watcher target\n');
}

function waitForMessage(socket, predicate, label, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const seen = [];
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error(`Timed out waiting for ${label}; seen=${seen.slice(-8).join(' | ')}`));
    }, timeoutMs);
    const onMessage = (raw) => {
      const text = raw.toString();
      seen.push(text);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      if (predicate(parsed)) {
        clearTimeout(timer);
        socket.off('message', onMessage);
        resolve(parsed);
      }
    };
    socket.on('message', onMessage);
  });
}

async function openExplorerSocket(baseUrl, workspaceId) {
  const wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + `/ws/file-explorer/${workspaceId}`;
  const socket = new WebSocket(wsUrl);
  const connectedPromise = waitForMessage(socket, (message) => message?.type === 'CONNECTED', 'CONNECTED');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out opening websocket ${wsUrl}`)), 10_000);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  const connected = await connectedPromise;
  return { socket, connected };
}

async function closeExplorerSocket(socket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.terminate();
      resolve();
    }, 5_000);
    socket.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.close();
  });
}

async function openTerminalSocket(baseUrl, sessionId, cwd) {
  const wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    + `/ws/terminal/${encodeURIComponent(sessionId)}?cwd=${encodeURIComponent(cwd)}`;
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out opening terminal websocket ${wsUrl}`)), 10_000);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return socket;
}

function sendTerminalInput(socket, input) {
  socket.send(JSON.stringify({
    type: 'input',
    data: Buffer.from(input, 'utf8').toString('base64'),
  }));
}

function waitForTerminalOutput(socket, predicate, label, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error(`Timed out waiting for terminal output ${label}; output=${output.slice(-1000)}`));
    }, timeoutMs);
    const onMessage = (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (message?.type !== 'output' || typeof message.data !== 'string') return;
      output += Buffer.from(message.data, 'base64').toString('utf8');
      if (predicate(output)) {
        clearTimeout(timer);
        socket.off('message', onMessage);
        resolve(output);
      }
    };
    socket.on('message', onMessage);
  });
}

async function closeTerminalSocket(socket) {
  await closeExplorerSocket(socket);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(fs.existsSync(serverEntry), `server entry missing: ${serverEntry}`);
  await fsp.mkdir(artifactDir, { recursive: true });
  port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'autobyteus-e2e-server-data-'));
  await fsp.mkdir(path.join(dataDir, 'db'), { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'memory'), { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'logs'), { recursive: true });
  await fsp.mkdir(path.join(dataDir, 'temp_workspace'), { recursive: true });
  const dbUrl = `file:${path.join(dataDir, 'db', 'production.db').replace(/\\/g, '/')}`;
  const envFile = path.join(dataDir, '.env');
  await fsp.writeFile(envFile, [
    'APP_ENV=production',
    'LOG_LEVEL=INFO',
    'PRISMA_LOG_QUERIES=0',
    'DB_TYPE=sqlite',
    `DATABASE_URL=${dbUrl}`,
    `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}`,
    `AUTOBYTEUS_MEMORY_DIR=${path.join(dataDir, 'memory')}`,
    `AUTOBYTEUS_LOG_DIR=${path.join(dataDir, 'logs')}`,
    `AUTOBYTEUS_TEMP_WORKSPACE_DIR=${path.join(dataDir, 'temp_workspace')}`,
    '',
  ].join('\n'));
  const prismaEnginePair = findPrismaEnginePair();
  const childEnv = {
    ...process.env,
    APP_ENV: 'production',
    LOG_LEVEL: 'INFO',
    PRISMA_LOG_QUERIES: '0',
    DB_TYPE: 'sqlite',
    DATABASE_URL: dbUrl,
    AUTOBYTEUS_DATA_DIR: dataDir,
    AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`,
    AUTOBYTEUS_INTERNAL_SERVER_BASE_URL: `http://127.0.0.1:${port}`,
    AUTOBYTEUS_MEMORY_DIR: path.join(dataDir, 'memory'),
    AUTOBYTEUS_LOG_DIR: path.join(dataDir, 'logs'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataDir, 'temp_workspace'),
    AUTOBYTEUS_LOG_LEVEL: 'info',
    AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'off',
    CODEX_APP_SERVER_REQUEST_TIMEOUT_MS: '60000',
  };
  if (prismaEnginePair) {
    childEnv.PRISMA_QUERY_ENGINE_LIBRARY = prismaEnginePair.query;
    childEnv.PRISMA_SCHEMA_ENGINE_BINARY = prismaEnginePair.schema;
  } else {
    delete childEnv.PRISMA_QUERY_ENGINE_LIBRARY;
    delete childEnv.PRISMA_SCHEMA_ENGINE_BINARY;
  }
  log('start_server', { serverEntry, serverCwd, port, dataDir, envFile, dbUrl, prismaEnginePair, node: process.version, platform: `${process.platform}/${process.arch}` });
  server = spawn(process.execPath, [serverEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverCwd,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    serverStdout.push(text);
  });
  server.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    serverStderr.push(text);
  });
  server.on('exit', (code, signal) => log('server_exit_observed', { code, signal }));

  const health = await waitForHealth(baseUrl);
  log('health_ok', { health });
  await sleep(1_000);
  const baseline = sampleFds('after_server_health');

  const createWorkspaceMutation = `mutation CreateWorkspace($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId name absolutePath workspaceRootPath isTemp kind } }`;
  const searchQuery = `query Search($workspaceId: String!, $query: String!) { searchFiles(workspaceId: $workspaceId, query: $query) }`;
  const folderChildrenQuery = `query FolderChildren($workspaceId: String!, $folderPath: String!) { folderChildren(workspaceId: $workspaceId, folderPath: $folderPath) }`;
  const providerQuery = `query Providers($runtimeKind: String) { availableLlmProvidersWithModels(runtimeKind: $runtimeKind) { provider { id name } models { modelIdentifier name providerId } } }`;

  const workspaces = [];
  for (let workspaceIndex = 0; workspaceIndex < 3; workspaceIndex += 1) {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), `autobyteus-e2e-real-ws-${workspaceIndex}-`));
    tempRoots.push(root);
    await writeWorkspace(root, 120);
    const data = await graphql(baseUrl, createWorkspaceMutation, { input: { rootPath: root } });
    const workspace = data.createWorkspace;
    workspaces.push({ ...workspace, root });
    log('workspace_created', { workspaceIndex, workspaceId: workspace.workspaceId, root, workspaceRootPath: workspace.workspaceRootPath, kind: workspace.kind });
    const search = await graphql(baseUrl, searchQuery, { workspaceId: workspace.workspaceId, query: 'search-target' });
    assert(Array.isArray(search.searchFiles), 'searchFiles did not return array');
    assert(search.searchFiles.some((item) => String(item).includes('search-target.md')), 'searchFiles did not find search-target.md');
    const children = await graphql(baseUrl, folderChildrenQuery, { workspaceId: workspace.workspaceId, folderPath: '.' });
    assert(typeof children.folderChildren === 'string' && children.folderChildren.includes('README.md'), 'folderChildren did not return expected README.md');
    sampleFds(`after_workspace_${workspaceIndex + 1}_create_search_folder_snapshot_no_ws`);
  }

  const afterSnapshotOnly = sampleFds('after_all_snapshot_queries_no_websocket');
  if (baseline !== null && afterSnapshotOnly !== null) {
    assert(afterSnapshotOnly <= baseline + 40, `snapshot/search-only FD growth too high: baseline=${baseline}, after=${afterSnapshotOnly}`);
  }

  const primary = workspaces[0];
  const { socket: socketA } = await openExplorerSocket(baseUrl, primary.workspaceId);
  sampleFds('after_first_visible_websocket_open');
  const { socket: socketB } = await openExplorerSocket(baseUrl, primary.workspaceId);
  sampleFds('after_second_visible_websocket_open_same_workspace');

  const liveFile = path.join(primary.root, 'src', 'live-added-from-harness.txt');
  await fsp.writeFile(liveFile, 'visible explorer must receive this real fs event\n');
  const liveChange = await waitForMessage(socketA, (message) => {
    if (message?.type !== 'FILE_SYSTEM_CHANGE') return false;
    const changes = Array.isArray(message?.payload?.changes) ? message.payload.changes : [];
    return changes.some((change) => change?.type === 'add' && change?.node?.name === 'live-added-from-harness.txt');
  }, 'FILE_SYSTEM_CHANGE live-added-from-harness.txt');
  log('live_change_received', { type: liveChange.type, changeCount: liveChange.payload?.changes?.length ?? null });

  await closeExplorerSocket(socketA);
  await sleep(1_000);
  sampleFds('after_closing_first_of_two_visible_websockets');
  await closeExplorerSocket(socketB);
  await sleep(2_000);
  const afterClosingShared = sampleFds('after_closing_final_shared_visible_websocket');

  const churnWorkspace = workspaces[1];
  for (let cycle = 1; cycle <= 20; cycle += 1) {
    const { socket } = await openExplorerSocket(baseUrl, churnWorkspace.workspaceId);
    if (cycle === 1 || cycle === 10 || cycle === 20) sampleFds(`cycle_${cycle}_open`);
    await closeExplorerSocket(socket);
    await sleep(cycle % 5 === 0 ? 500 : 100);
    if (cycle === 1 || cycle === 10 || cycle === 20) sampleFds(`cycle_${cycle}_closed`);
  }
  await sleep(2_000);
  const afterChurn = sampleFds('after_20_open_close_cycles');

  const earlyWorkspace = workspaces[2];
  for (let cycle = 1; cycle <= 10; cycle += 1) {
    const wsUrl = baseUrl.replace(/^http:/, 'ws:') + `/ws/file-explorer/${earlyWorkspace.workspaceId}`;
    const socket = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('early-close socket did not open')), 10_000);
      socket.once('open', () => {
        clearTimeout(timer);
        socket.close();
        resolve();
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    await closeExplorerSocket(socket);
  }
  await sleep(2_000);
  const afterEarlyClose = sampleFds('after_10_close_before_connected_cycles');

  const terminalWorkspace = workspaces[0];
  const terminalRoot = terminalWorkspace.workspaceRootPath ?? terminalWorkspace.absolutePath ?? terminalWorkspace.root;
  const terminalSocket = await openTerminalSocket(baseUrl, 'round6-terminal-cwd', `${terminalRoot}${path.sep}`);
  const terminalOutputPromise = waitForTerminalOutput(
    terminalSocket,
    (output) => output.includes('__AB_ROUND6_TERMINAL_CWD_OK__'),
    '__AB_ROUND6_TERMINAL_CWD_OK__',
  );
  sendTerminalInput(
    terminalSocket,
    'if [ -f README.md ]; then printf "__AB_ROUND6_TERMINAL_CWD_OK__:%s\\n" "$PWD"; else printf "__AB_ROUND6_TERMINAL_NO_MARKER__\\n"; fi\n',
  );
  const terminalOutput = await terminalOutputPromise;
  assert(terminalOutput.includes('__AB_ROUND6_TERMINAL_CWD_OK__'), 'terminal cwd marker output missing');
  assert(terminalOutput.includes(path.basename(terminalRoot)), `terminal cwd output did not include workspace basename: ${terminalOutput.slice(-500)}`);
  sampleFds('after_terminal_real_cwd_open');
  await closeTerminalSocket(terminalSocket);
  await sleep(1_500);
  const afterTerminalClose = sampleFds('after_terminal_real_cwd_close');
  const afterTerminalCloseChildren = sampleChildProcesses('after_terminal_real_cwd_close');

  for (let cycle = 1; cycle <= 10; cycle += 1) {
    const socket = await openTerminalSocket(baseUrl, `round6-terminal-churn-${cycle}`, terminalRoot);
    if (cycle === 1 || cycle === 10) sampleFds(`terminal_cycle_${cycle}_open`);
    await closeTerminalSocket(socket);
    await sleep(cycle % 5 === 0 ? 500 : 100);
    if (cycle === 1 || cycle === 10) sampleFds(`terminal_cycle_${cycle}_closed`);
  }
  await sleep(1_500);
  const afterTerminalChurn = sampleFds('after_10_terminal_open_close_cycles');
  const afterTerminalChurnChildren = sampleChildProcesses('after_10_terminal_open_close_cycles');

  const echoOutput = execFileSync('/bin/echo', ['codex-spawn-probe-ok'], { encoding: 'utf8' }).trim();
  assert(echoOutput === 'codex-spawn-probe-ok', `spawn echo probe failed: ${echoOutput}`);
  let codexVersion = null;
  try {
    codexVersion = execFileSync('codex', ['--version'], { encoding: 'utf8', timeout: 15_000 }).trim();
    log('codex_cli_version_probe_ok', { codexVersion });
  } catch (error) {
    throw new Error(`codex --version probe failed after watcher churn: ${String(error)}`);
  }

  let codexProviderProbe = { attempted: true, ok: false, providerCount: null, modelCount: null, error: null };
  try {
    const providerData = await graphql(baseUrl, providerQuery, { runtimeKind: 'codex_app_server' });
    const providers = providerData.availableLlmProvidersWithModels;
    codexProviderProbe.ok = Array.isArray(providers);
    codexProviderProbe.providerCount = Array.isArray(providers) ? providers.length : null;
    codexProviderProbe.modelCount = Array.isArray(providers)
      ? providers.reduce((sum, provider) => sum + (Array.isArray(provider.models) ? provider.models.length : 0), 0)
      : null;
    log('codex_app_server_model_catalog_probe_ok', codexProviderProbe);
  } catch (error) {
    codexProviderProbe.error = String(error);
    log('codex_app_server_model_catalog_probe_failed', codexProviderProbe);
    throw error;
  }

  const finalFd = sampleFds('after_codex_probe_final');
  const comparisonBase = afterSnapshotOnly ?? baseline;
  if (comparisonBase !== null && finalFd !== null) {
    assert(finalFd <= comparisonBase + 60, `final FD growth too high: base=${comparisonBase}, final=${finalFd}`);
  }
  if (afterClosingShared !== null && afterChurn !== null) {
    assert(afterChurn <= afterClosingShared + 50, `FD growth after churn too high: afterShared=${afterClosingShared}, afterChurn=${afterChurn}`);
  }
  if (afterChurn !== null && afterEarlyClose !== null) {
    assert(afterEarlyClose <= afterChurn + 25, `early-close cycles grew FDs too high: afterChurn=${afterChurn}, afterEarlyClose=${afterEarlyClose}`);
  }
  if (afterEarlyClose !== null && afterTerminalClose !== null) {
    assert(afterTerminalClose <= afterEarlyClose + 80, `terminal cwd session retained too many FDs: afterEarlyClose=${afterEarlyClose}, afterTerminalClose=${afterTerminalClose}`);
  }
  if (afterTerminalClose !== null && afterTerminalChurn !== null) {
    assert(afterTerminalChurn <= afterTerminalClose + 80, `terminal churn grew FDs too high: afterTerminalClose=${afterTerminalClose}, afterTerminalChurn=${afterTerminalChurn}`);
  }
  assert(!afterTerminalCloseChildren || afterTerminalCloseChildren.length === 0, `terminal cwd close left child processes: ${JSON.stringify(afterTerminalCloseChildren)}`);
  assert(!afterTerminalChurnChildren || afterTerminalChurnChildren.length === 0, `terminal churn left child processes: ${JSON.stringify(afterTerminalChurnChildren)}`);

  const summary = {
    result: 'pass',
    scenario: 'embedded server macOS high-churn file-explorer websocket, terminal cwd, and codex activation lifecycle',
    platform: `${process.platform}/${process.arch}`,
    node: process.version,
    serverPid: server.pid,
    port,
    dataDir,
    workspaceCount: workspaces.length,
    fileCountPerWorkspace: 123,
    websocketCycles: { sharedConsumers: 2, repeatedOpenClose: 20, closeBeforeConnected: 10 },
    terminalCycles: { realCwdSessions: 1, repeatedOpenClose: 10 },
    fdSamples,
    childProcessSamples,
    codexVersion,
    codexProviderProbe,
    events,
  };
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  log('summary_written', { summaryPath, result: summary.result });
}

async function cleanup() {
  await fsp.writeFile(serverStdoutPath, serverStdout.join('')).catch(() => undefined);
  await fsp.writeFile(serverStderrPath, serverStderr.join('')).catch(() => undefined);
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => server.once('exit', resolve)),
      sleep(8_000).then(() => {
        if (server.exitCode === null) server.kill('SIGKILL');
      }),
    ]).catch(() => undefined);
  }
  for (const root of tempRoots) {
    await fsp.rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
  if (dataDir) {
    await fsp.rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

try {
  await main();
} catch (error) {
  const failure = {
    result: 'fail',
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    platform: `${process.platform}/${process.arch}`,
    node: process.version,
    serverPid: server?.pid ?? null,
    port,
    dataDir,
    fdSamples,
    childProcessSamples,
    events,
  };
  await fsp.writeFile(summaryPath, JSON.stringify(failure, null, 2)).catch(() => undefined);
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await cleanup();
}
