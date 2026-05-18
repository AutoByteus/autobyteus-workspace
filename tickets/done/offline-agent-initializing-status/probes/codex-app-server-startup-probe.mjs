#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const command = process.env.CODEX_APP_SERVER_COMMAND || 'codex';
const args = process.env.CODEX_APP_SERVER_ARGS ? process.env.CODEX_APP_SERVER_ARGS.split(/\s+/).filter(Boolean) : ['app-server'];
const cwd = path.resolve(process.env.CODEX_PROBE_CWD || process.cwd());
const timeoutMs = Number(process.env.CODEX_PROBE_TIMEOUT_MS || 120000);
const runThreadStart = process.env.CODEX_PROBE_THREAD_START !== '0';
const model = process.env.CODEX_PROBE_MODEL || process.env.CODEX_APP_SERVER_MODEL || null;

function nowMs() { return performance.now(); }
function elapsed(start) { return Math.round((nowMs() - start) * 10) / 10; }

async function probe() {
  const startedAt = nowMs();
  const proc = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pending = new Map();
  let nextId = 1;
  let stdoutBuffer = '';
  const notifications = [];
  const stderrLines = [];

  const failAll = (error) => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  };

  proc.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      stderrLines.push({ atMs: elapsed(startedAt), line });
    }
  });

  proc.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf8');
    while (true) {
      const index = stdoutBuffer.indexOf('\n');
      if (index < 0) break;
      const line = stdoutBuffer.slice(0, index).trim();
      stdoutBuffer = stdoutBuffer.slice(index + 1);
      if (!line) continue;
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch (error) {
        notifications.push({ atMs: elapsed(startedAt), invalidJson: line, error: String(error) });
        continue;
      }
      if (parsed && typeof parsed === 'object' && parsed.id != null && ('result' in parsed || 'error' in parsed)) {
        const entry = pending.get(parsed.id);
        if (entry) {
          clearTimeout(entry.timer);
          pending.delete(parsed.id);
          if (parsed.error) {
            entry.reject(new Error(`RPC ${entry.method} error: ${JSON.stringify(parsed.error)}`));
          } else {
            entry.resolve(parsed.result);
          }
        }
      } else if (parsed && typeof parsed === 'object' && typeof parsed.method === 'string') {
        notifications.push({ atMs: elapsed(startedAt), method: parsed.method, paramsKeys: Object.keys(parsed.params || {}) });
      } else {
        notifications.push({ atMs: elapsed(startedAt), message: parsed });
      }
    }
  });

  proc.on('error', (error) => failAll(error));
  proc.on('close', (code, signal) => {
    if (pending.size > 0) failAll(new Error(`codex app-server closed code=${code} signal=${signal}`));
  });

  const request = (method, params) => {
    const id = nextId++;
    const frame = { jsonrpc: '2.0', id, method, params: params || {} };
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`RPC ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, { method, resolve, reject, timer });
    });
    proc.stdin.write(`${JSON.stringify(frame)}\n`);
    return promise;
  };
  const notify = (method, params) => {
    proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params: params || {} })}\n`);
  };

  const result = {
    command,
    args,
    cwd,
    model,
    timingsMs: {},
    notifications,
    stderrLines,
  };

  try {
    const beforeInitialize = nowMs();
    await request('initialize', {
      clientInfo: { name: 'autobyteus-codex-startup-probe', version: '0.0.0' },
      capabilities: { experimentalApi: true },
    });
    result.timingsMs.spawnToInitializeResponse = elapsed(startedAt);
    result.timingsMs.initializeRequestDuration = Math.round((nowMs() - beforeInitialize) * 10) / 10;
    notify('initialized', {});

    if (runThreadStart) {
      const beforeThreadStart = nowMs();
      const threadResponse = await request('thread/start', {
        model,
        modelProvider: null,
        serviceTier: null,
        cwd,
        approvalPolicy: 'on-request',
        sandbox: process.env.CODEX_APP_SERVER_SANDBOX || 'workspace-write',
        config: null,
        baseInstructions: 'You are a startup timing probe. Do not perform work unless a turn is started.',
        developerInstructions: null,
        personality: null,
        ephemeral: true,
        dynamicTools: null,
        experimentalRawEvents: true,
        persistExtendedHistory: false,
      });
      result.timingsMs.threadStartDuration = Math.round((nowMs() - beforeThreadStart) * 10) / 10;
      result.timingsMs.spawnToThreadStartResponse = elapsed(startedAt);
      result.threadResponse = threadResponse;
    }
  } finally {
    proc.kill('SIGTERM');
    try {
      await Promise.race([once(proc, 'close'), new Promise((resolve) => setTimeout(resolve, 5000))]);
    } catch {}
    result.timingsMs.totalBeforeClose = elapsed(startedAt);
  }

  console.log(JSON.stringify(result, null, 2));
}

probe().catch((error) => {
  console.error(JSON.stringify({ error: String(error), stack: error?.stack }, null, 2));
  process.exitCode = 1;
});
