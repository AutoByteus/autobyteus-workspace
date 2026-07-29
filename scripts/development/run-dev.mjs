import net from 'node:net';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  builtServerEntry,
  developmentBackendPort,
  developmentBackendUrl,
  developmentDataRoot,
  developmentFrontendPort,
  developmentFrontendUrl,
  developmentHost,
  materializeDevelopmentRuntime,
} from './development-runtime.mjs';

const STARTUP_TIMEOUT_MS = 120_000;
const SHUTDOWN_TIMEOUT_MS = 15_000;
const KILL_TIMEOUT_MS = 5_000;

const stableError = (code, details = {}) => {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, details);
  return error;
};

const isChildRunning = (child) => child.exitCode === null && !child.signalCode;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const portProbe = (host, port) => new Promise((resolve, reject) => {
  const server = net.createServer();
  let settled = false;
  const finish = (error) => {
    if (settled) return;
    settled = true;
    server.close(() => error ? reject(error) : resolve());
  };
  server.once('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      finish(stableError('DEV_PORT_OCCUPIED', { host, port }));
    } else {
      finish(stableError('DEV_PORT_PROBE_FAILED', { host, port }));
    }
  });
  server.listen({ host, port }, () => finish());
});

export const assertFixedPortsAvailable = async ({
  host = developmentHost,
  backendPort = developmentBackendPort,
  frontendPort = developmentFrontendPort,
  probe = portProbe,
} = {}) => {
  await probe(host, backendPort);
  await probe(host, frontendPort);
};

const fetchHttpSuccess = async (url, request = fetch) => {
  try {
    const response = await request(url, { signal: AbortSignal.timeout(5_000) });
    return response.ok;
  } catch {
    return false;
  }
};

const childFailure = (state, code) => {
  if (state.spawnError) throw stableError(code);
  if (!isChildRunning(state.child)) throw stableError(code);
};

export const waitForBackendReady = async ({
  child,
  output,
  url = developmentBackendUrl,
  host = developmentHost,
  port = developmentBackendPort,
  timeoutMs = STARTUP_TIMEOUT_MS,
  request = fetch,
  signal,
} = {}) => {
  const deadline = Date.now() + timeoutMs;
  const marker = `Server listening on ${host}:${port}`;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw stableError('DEV_SHUTDOWN_REQUESTED');
    childFailure(child, 'DEV_BACKEND_START_FAILED');
    if (output().includes(marker) && await fetchHttpSuccess(`${url}/rest/health`, request)) {
      return;
    }
    await wait(100);
  }
  childFailure(child, 'DEV_BACKEND_START_TIMEOUT');
  throw stableError('DEV_BACKEND_START_TIMEOUT');
};

export const waitForFrontendReady = async ({
  child,
  url = developmentFrontendUrl,
  timeoutMs = STARTUP_TIMEOUT_MS,
  request = fetch,
  signal,
} = {}) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw stableError('DEV_SHUTDOWN_REQUESTED');
    childFailure(child, 'DEV_FRONTEND_START_FAILED');
    if (await fetchHttpSuccess(url, request)) return;
    await wait(100);
  }
  childFailure(child, 'DEV_FRONTEND_START_TIMEOUT');
  throw stableError('DEV_FRONTEND_START_TIMEOUT');
};

const childCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const createChildState = (child, label) => {
  const state = { child, label, output: '', spawnError: null };
  child.stdout?.setEncoding?.('utf8');
  child.stderr?.setEncoding?.('utf8');
  child.stdout?.on('data', (chunk) => {
    state.output += chunk.toString();
    process.stdout.write(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    state.output += chunk.toString();
    process.stderr.write(chunk);
  });
  child.once('error', (error) => {
    state.spawnError = error;
  });
  return state;
};

const spawnChild = ({ command, args, cwd, env, label, spawnProcess = spawn }) => {
  let child;
  try {
    child = spawnProcess(command, args, {
      cwd,
      env,
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw stableError(`DEV_${label.toUpperCase()}_SPAWN_FAILED`);
  }
  return createChildState(child, label);
};

const sendOwnedSignal = (state, signal) => {
  const { child } = state;
  if (!isChildRunning(child)) return;
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch (error) {
    if (!['ESRCH', 'EINVAL'].includes(error?.code)) throw error;
  }
};

const waitForChildClose = (state, timeoutMs) => new Promise((resolve) => {
  if (!isChildRunning(state.child)) {
    resolve(true);
    return;
  }
  let settled = false;
  const finish = (closed) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    resolve(closed);
  };
  const timeout = setTimeout(() => finish(false), timeoutMs);
  state.child.once('close', () => finish(true));
});

const stopOwnedChild = async (state) => {
  if (!state || !isChildRunning(state.child)) return;
  sendOwnedSignal(state, 'SIGTERM');
  if (await waitForChildClose(state, SHUTDOWN_TIMEOUT_MS)) return;

  if (process.platform === 'win32' && state.child.pid) {
    try {
      spawn('taskkill', ['/pid', String(state.child.pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } catch {
      // The child handle below remains the final bounded fallback.
    }
    sendOwnedSignal(state, 'SIGKILL');
  } else {
    sendOwnedSignal(state, 'SIGKILL');
  }
  await waitForChildClose(state, KILL_TIMEOUT_MS);
};

const stopOwnedChildren = async (children) => {
  await Promise.all([...children].reverse().map((child) => stopOwnedChild(child)));
};

const waitForUnexpectedChildExit = (children, signal) => new Promise((resolve, reject) => {
  let settled = false;
  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    callback(value);
  };
  const onSignal = () => finish(resolve, 'signal');
  signal?.addEventListener('abort', onSignal, { once: true });
  for (const state of children) {
    if (!isChildRunning(state.child)) {
      finish(reject, stableError('DEV_CHILD_EXITED', {
        child: state.label,
        exitCode: state.child.exitCode,
        signal: state.child.signalCode,
      }));
      return;
    }
    state.child.once('close', (code, childSignal) => {
      if (signal?.aborted) return finish(resolve, 'signal');
      finish(reject, stableError('DEV_CHILD_EXITED', {
        child: state.label,
        exitCode: code,
        signal: childSignal,
      }));
    });
  }
});

export const startDevelopmentStack = async ({
  runtime = materializeDevelopmentRuntime(),
  timeoutMs = STARTUP_TIMEOUT_MS,
  probe = portProbe,
  request = fetch,
  spawnProcess = spawn,
} = {}) => {
  const children = [];
  const abortController = new AbortController();
  let deliberateShutdown = false;
  let signalName = null;
  const onSignal = (signal) => {
    deliberateShutdown = true;
    signalName ??= signal;
    abortController.abort();
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    await assertFixedPortsAvailable({ probe, signal: abortController.signal });
    if (abortController.signal.aborted) throw stableError('DEV_SHUTDOWN_REQUESTED');

    const backend = spawnChild({
      command: process.execPath,
      args: [
        builtServerEntry,
        '--host', developmentHost,
        '--port', String(developmentBackendPort),
        '--data-dir', runtime.dataRoot,
      ],
      cwd: runtime.serverRoot,
      env: runtime.backendEnvironment,
      label: 'backend',
      spawnProcess,
    });
    children.push(backend);
    await waitForBackendReady({
      child: backend,
      output: () => backend.output,
      timeoutMs,
      request,
      signal: abortController.signal,
    });

    const frontend = spawnChild({
      command: childCommand,
      args: ['dev', '--host', developmentHost, '--port', String(developmentFrontendPort)],
      cwd: runtime.webRoot,
      env: runtime.frontendEnvironment,
      label: 'frontend',
      spawnProcess,
    });
    children.push(frontend);
    await waitForFrontendReady({
      child: frontend,
      timeoutMs,
      request,
      signal: abortController.signal,
    });

    process.stdout.write(`DEV_SERVER_READY ${developmentBackendUrl}\n`);
    process.stdout.write(`DEV_WEB_READY ${developmentFrontendUrl}\n`);
    process.stdout.write(`DEV_DATA_ROOT ${developmentDataRoot}\n`);
    await waitForUnexpectedChildExit(children, abortController.signal);
    return { exitCode: 0, deliberateShutdown: false, signal: null };
  } catch (error) {
    if (deliberateShutdown || error?.code === 'DEV_SHUTDOWN_REQUESTED') {
      return { exitCode: 0, deliberateShutdown: true, signal: signalName };
    }
    throw error;
  } finally {
    abortController.abort();
    await stopOwnedChildren(children);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
  }
};

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const result = await startDevelopmentStack();
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${error?.code ?? 'DEV_START_FAILED'}\n`);
    process.exitCode = 1;
  }
}

export const __testOnly = Object.freeze({
  portProbe,
  createChildState,
  stopOwnedChild,
  fetchHttpSuccess,
});
