import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { HttpManagedMcpServer } from '../../../../src/tools/mcp/server/http-managed-mcp-server.js';
import { StreamableHttpMcpServerConfig } from '../../../../src/tools/mcp/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const mcpsRoot = path.resolve(repoRoot, '..', 'autobyteus_mcps');
const httpToyDir = path.join(mcpsRoot, 'streamable_http_mcp_toy');

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
const SERVER_PORT = 8764;
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}/mcp`;

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

async function waitForServerReady(timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    const server = new HttpManagedMcpServer(
      new StreamableHttpMcpServerConfig({
        server_id: 'streamable-http-toy',
        url: SERVER_URL,
        headers: {}
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

  throw new Error(`Streamable HTTP MCP server did not become ready: ${String(lastError)}`);
}

describe('HttpManagedMcpServer integration (streamable_http_mcp_toy)', () => {
  let serverProcess: ChildProcessWithoutNullStreams | null = null;

  beforeAll(async () => {
    serverProcess = spawn(
      resolveUvCommand(),
      ['run', 'python', 'src/streamable_http_mcp_toy/server.py', '--host', SERVER_HOST, '--port', String(SERVER_PORT)],
      {
        cwd: httpToyDir,
        env: { ...process.env },
        stdio: 'pipe'
      }
    );

    await waitForServerReady();
  }, 60000);

  afterAll(async () => {
    await stopProcess(serverProcess);
  });

  it('lists tools and calls echo_text + server_time', async () => {
    const server = new HttpManagedMcpServer(
      new StreamableHttpMcpServerConfig({
        server_id: 'streamable-http-toy',
        url: SERVER_URL,
        headers: {}
      })
    );

    try {
      const tools = await server.listRemoteTools();
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toEqual(expect.arrayContaining(['echo_text', 'server_time']));

      const echoResponse = await server.callTool('echo_text', { text: 'pytest' });
      expect(echoResponse?.isError).toBe(false);
      const echoStructured = echoResponse?.structuredContent ?? {};
      const echoText = echoStructured.result ?? echoStructured.text ?? echoResponse?.content?.[0]?.text;
      expect(String(echoText).toLowerCase()).toContain('echo');

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
