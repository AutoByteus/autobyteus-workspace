import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { WebsocketManagedMcpServer } from '../../../../src/tools/mcp/server/websocket-managed-mcp-server.js';
import { WebsocketMcpServerConfig } from '../../../../src/tools/mcp/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const mcpsRoot = path.resolve(repoRoot, '..', 'autobyteus_mcps');
const wssToyDir = path.join(mcpsRoot, 'wss_mcp_toy');

const resolveUvCommand = (): string => {
  const envOverride = process.env.UV_BIN;
  if (envOverride && envOverride.trim()) {
    return envOverride;
  }
  const candidates = [
    path.join(os.homedir(), '.local', 'bin', 'uv'),
    '/usr/local/bin/uv',
    '/opt/homebrew/bin/uv'
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return 'uv';
};

const SERVER_HOST = '127.0.0.1';
const SERVER_PORT = 8765;
const SERVER_URL = `wss://${SERVER_HOST}:${SERVER_PORT}/mcp`;
const SERVER_ORIGIN = 'https://localhost';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function stopProcess(child: ChildProcessWithoutNullStreams | null): Promise<void> {
  if (!child || child.killed) return;
  child.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => child.once('exit', () => resolve(true))),
    sleep(2000).then(() => false)
  ]);
  if (!exited) {
    child.kill('SIGKILL');
  }
}

async function waitForServerReady(timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    const server = new WebsocketManagedMcpServer(
      new WebsocketMcpServerConfig({
        server_id: 'toy-wss-server',
        url: SERVER_URL,
        origin: SERVER_ORIGIN,
        headers: {},
        verify_tls: false
      })
    );

    try {
      const tools = await server.listRemoteTools();
      const toolNames = tools.map((tool: any) => tool.name);
      if (toolNames.includes('echo_text') && toolNames.includes('server_time')) {
        await server.close();
        return;
      }
    } catch (error) {
      lastError = error;
    } finally {
      await server.close();
    }

    await sleep(500);
  }

  throw new Error(`WSS MCP server did not become ready: ${String(lastError)}`);
}

describe('WebsocketManagedMcpServer integration (wss_mcp_toy)', () => {
  let serverProcess: ChildProcessWithoutNullStreams | null = null;

  let originalTlsSetting: string | undefined;

  beforeAll(async () => {
    originalTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    serverProcess = spawn(
      resolveUvCommand(),
      [
        'run',
        'python',
        'src/wss_mcp_toy/server.py',
        '--cert',
        'certs/dev-cert.pem',
        '--key',
        'certs/dev-key.pem',
        '--host',
        SERVER_HOST,
        '--port',
        String(SERVER_PORT),
        '--allowed-origin',
        '*'
      ],
      {
        cwd: wssToyDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        stdio: 'pipe'
      }
    );

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (chunk) => {
        process.stdout.write(`[wss_mcp_toy] ${chunk.toString()}`);
      });
    }
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (chunk) => {
        process.stderr.write(`[wss_mcp_toy] ${chunk.toString()}`);
      });
    }

    await waitForServerReady();
  }, 60000);

  afterAll(async () => {
    await stopProcess(serverProcess);
    if (originalTlsSetting === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsSetting;
    }
  });

  it('lists tools and calls echo_text + server_time', async () => {
    const server = new WebsocketManagedMcpServer(
      new WebsocketMcpServerConfig({
        server_id: 'toy-wss-server',
        url: SERVER_URL,
        origin: SERVER_ORIGIN,
        headers: {},
        verify_tls: false
      })
    );

    try {
      const tools = await server.listRemoteTools();
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toEqual(expect.arrayContaining(['echo_text', 'server_time']));

      const echoResponse = await server.callTool('echo_text', { text: 'pytest', uppercase: true });
      expect(echoResponse?.isError).toBe(false);
      const echoText = echoResponse?.content?.[0]?.text ?? '';
      expect(echoText.toLowerCase()).toContain('echo');

      const timeResponse = await server.callTool('server_time', {});
      expect(timeResponse?.isError).toBe(false);
      const timeStructured = timeResponse?.structuredContent ?? {};
      expect(timeStructured).toHaveProperty('iso8601');
      expect(timeStructured).toHaveProperty('epoch');
    } finally {
      await server.close();
    }
  }, 60000);
});
