/**
 * Launcher for the tiny MCP test server used by the MCP integration tests in this folder.
 *
 * It owns which implementation runs and how:
 * - "python": `tests/fixtures/mcp-test-server/` (official Python SDK) via `uv run`, when `uv` is on PATH
 *   and `uv sync --frozen` prepares it. The environment lives outside the repository: `UV_PROJECT_ENVIRONMENT`
 *   (default `<os.tmpdir()>/autobyteus-mcp-test-server-venv-<lock hash>`) and `UV_CACHE_DIR` (default
 *   `<os.tmpdir()>/autobyteus-mcp-test-server-uv-cache`); both can be set by the caller. The first preparation
 *   needs the network to fetch the pinned packages. The server is started as
 *   `/usr/bin/env UV_PROJECT_ENVIRONMENT=… UV_CACHE_DIR=… PYTHONDONTWRITEBYTECODE=1 uv run …`: these location
 *   variables are on the command line, not in the stdio config's `env`, so where `uv` and Python write files
 *   does not depend on the env delivery of the code under test.
 * - "node": `tests/fixtures/mcp-stdio-fixture-server.mjs` (TypeScript SDK) with the current `node`; always available.
 * A preparation failure makes the Python cases skip with the reason (never a pass). Once a server has started,
 * every failure is a real test failure.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';

export type McpTestServerImpl = 'python' | 'node';
export type McpTestServerMode = 'normal' | 'exit-at-start' | 'hang-at-start';
export type PreparedImpl = { impl: McpTestServerImpl; available: boolean; reason: string };

const fixturesDir = fileURLToPath(new URL('../../../fixtures/', import.meta.url));
const pythonProjectDir = path.join(fixturesDir, 'mcp-test-server');
const nodeServerPath = path.join(fixturesDir, 'mcp-stdio-fixture-server.mjs');

const lastLine = (text: string): string => text.trim().split('\n').filter(Boolean).at(-1) ?? '(no output)';

/** uv's whole error block (`× …` or `error: …` and every cause line, up to its `help:` line) on one line; else the last line of output. */
const uvError = (text: string): string => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => line.startsWith('×') || line.startsWith('error:'));
  if (start < 0) return lastLine(text);
  const help = lines.findIndex((line, index) => index > start && line.startsWith('help:'));
  return lines.slice(start, help < 0 ? undefined : help).join(' ');
};

const findOnPath = (command: string): string | null => {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // not in this directory
    }
  }
  return null;
};

let uvPath: string | null = null;
/** Where `uv` and Python write files; set on the launch command line and for `uv sync`. */
let uvLocations: Record<string, string> = {};

const preparePython = (): PreparedImpl => {
  uvPath = findOnPath('uv');
  if (!uvPath) {
    return { impl: 'python', available: false, reason: 'uv unavailable (not on PATH)' };
  }
  const lockHash = createHash('sha256')
    .update(fs.readFileSync(path.join(pythonProjectDir, 'uv.lock')))
    .update(fs.readFileSync(path.join(pythonProjectDir, 'pyproject.toml')))
    .digest('hex')
    .slice(0, 12);
  uvLocations = {
    UV_PROJECT_ENVIRONMENT:
      process.env.UV_PROJECT_ENVIRONMENT ?? path.join(os.tmpdir(), `autobyteus-mcp-test-server-venv-${lockHash}`),
    UV_CACHE_DIR: process.env.UV_CACHE_DIR ?? path.join(os.tmpdir(), 'autobyteus-mcp-test-server-uv-cache'),
    PYTHONDONTWRITEBYTECODE: '1'
  };
  const sync = spawnSync(uvPath, ['sync', '--frozen', '--project', pythonProjectDir], {
    env: { ...process.env, ...uvLocations },
    encoding: 'utf8',
    timeout: 300_000
  });
  if (sync.status !== 0) {
    const detail = sync.error ? String(sync.error) : uvError(sync.stderr ?? '');
    return { impl: 'python', available: false, reason: `uv could not prepare the fixture: ${detail}` };
  }
  return { impl: 'python', available: true, reason: `python via uv (${uvLocations.UV_PROJECT_ENVIRONMENT})` };
};

let prepared: PreparedImpl[] | null = null;

/** Prepares each implementation once per test file and reports which can run, with the reason. */
export const prepareMcpTestServers = (): PreparedImpl[] => {
  if (!prepared) {
    prepared = [preparePython(), { impl: 'node', available: true, reason: `node ${process.version}` }];
    for (const entry of prepared) {
      console.info(`[mcp-test-server] ${entry.impl}: ${entry.available ? 'used' : 'skipped'}: ${entry.reason}`);
    }
  }
  return prepared;
};

const serverCommand = (impl: McpTestServerImpl, serverArgs: string[]): { command: string; args: string[]; env: Record<string, string> } =>
  impl === 'python'
    ? {
        command: '/usr/bin/env',
        args: [
          ...Object.entries(uvLocations).map(([name, value]) => `${name}=${value}`),
          uvPath as string,
          'run',
          '--frozen',
          '--project',
          pythonProjectDir,
          'python',
          path.join(pythonProjectDir, 'server.py'),
          ...serverArgs
        ],
        env: {}
      }
    : { command: process.execPath, args: [nodeServerPath, ...serverArgs], env: {} };

/** A stdio config for the chosen implementation; `env` and `cwd` are passed through unchanged. */
export const stdioServerConfig = (
  impl: McpTestServerImpl,
  opts: { serverId: string; mode?: McpTestServerMode; env?: Record<string, string>; cwd?: string; pidFile?: string }
): StdioMcpServerConfig => {
  const { command, args, env } = serverCommand(impl, ['--mode', opts.mode ?? 'normal']);
  return new StdioMcpServerConfig({
    server_id: opts.serverId,
    command,
    args,
    env: { ...env, ...opts.env, ...(opts.pidFile ? { MCP_TEST_SERVER_PID_FILE: opts.pidFile } : {}) },
    cwd: opts.cwd ?? null
  });
};

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as net.AddressInfo;
      probe.close(() => resolve(port));
    });
  });

export type HttpTestServer = {
  url: string;
  token: string;
  /** Auth outcome of every HTTP request the server received: 'ok' | 'missing' | 'wrong'. */
  requests: () => string[];
  close: () => Promise<void>;
};

/** Starts the HTTP fixture on a free port; every request must carry `Authorization: Bearer <token>`. */
export const startHttpTestServer = async (impl: McpTestServerImpl, token = 'test-dummy-token'): Promise<HttpTestServer> => {
  const port = await freePort();
  const { command, args, env } = serverCommand(impl, ['--transport', 'http', '--port', String(port), '--require-token', token]);
  const child: ChildProcess = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
  const auths: string[] = [];
  let stderr = '';
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`HTTP test server did not start within 30 s: ${lastLine(stderr)}`)), 30_000);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`HTTP test server exited with ${code} before it was ready: ${lastLine(stderr)}`));
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
      for (const match of chunk.matchAll(/MCP_TEST_SERVER_REQUEST auth=(\w+)/g)) auths.push(match[1] as string);
      const ready = /MCP_TEST_SERVER_READY (\S+)/.exec(stderr);
      if (ready) {
        clearTimeout(timer);
        resolve(ready[1] as string);
      }
    });
  });
  return { url, token, requests: () => [...auths], close: () => stopProcess(child) };
};

const stopProcess = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
  await exited;
  clearTimeout(timer);
};

/** True while a process with this pid exists. */
export const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Waits until the pid is gone; returns false if it is still alive after `timeoutMs`. */
export const waitForExit = async (pid: number, timeoutMs = 5_000): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !isAlive(pid);
};

/** Reads the pid the server wrote, waiting briefly for the file to appear. */
export const readPidFile = async (pidFile: string, timeoutMs = 10_000): Promise<number> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const content = fs.existsSync(pidFile) ? fs.readFileSync(pidFile, 'utf8').trim() : '';
    if (content) return Number(content);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`The test server wrote no pid to ${pidFile} within ${timeoutMs} ms`);
};
