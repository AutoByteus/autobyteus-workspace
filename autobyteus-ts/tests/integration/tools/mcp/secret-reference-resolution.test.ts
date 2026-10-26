/**
 * Managed MCP servers resolve their secret references when they connect, against the tiny real MCP test server.
 *
 * Purpose: a stdio env value and an HTTP `Authorization` header (and token) stored as secret references reach the
 * server as values; a reference the resolver cannot resolve fails to connect with an error naming the server and
 * field, never a value; a server without a resolver refuses references (`VAULT_UNAVAILABLE`), with no plain fallback.
 * The resolver here is a test fake (the server's vault resolver is tested in autobyteus-server-ts).
 * Implementations: Python via `uv` (skipped with the reason when `uv` cannot prepare it) and Node (always).
 * Command: env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp
 * Values: dummy only.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SecretValue } from '../../../../src/secrets/secret-value.js';
import { secretId } from '../../../../src/secrets/vault/secret-id.js';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { HttpManagedMcpServer } from '../../../../src/tools/mcp/server/http-managed-mcp-server.js';
import type { BaseManagedMcpServer } from '../../../../src/tools/mcp/server/base-managed-mcp-server.js';
import {
  McpSecretUnavailableError,
  type McpSecretResolutionContext,
  type McpSecretResolver
} from '../../../../src/tools/mcp/mcp-secret-resolver.js';
import { StdioMcpServerConfig, StreamableHttpMcpServerConfig, type McpSecretReference } from '../../../../src/tools/mcp/types.js';
import { prepareMcpTestServers, startHttpTestServer, stdioServerConfig, type HttpTestServer } from './mcp-test-server-launcher.js';

type ToolResult = { content: Array<{ type: string; text: string }> };

const reference = (id: string): McpSecretReference => ({ vaultSecretId: secretId(id) });
const STORED_ENV = reference('mcp.00000000-0000-4000-8000-0000000000e1');
const STORED_AUTHORIZATION = reference('mcp.00000000-0000-4000-8000-0000000000a1');
const STORED_TOKEN = reference('mcp.00000000-0000-4000-8000-0000000000b1');
const ABSENT = reference('mcp.00000000-0000-4000-8000-0000000000ff');

/** A fake vault: known IDs give their dummy value; any other ID is missing. Records each request (never values). */
class FakeResolver implements McpSecretResolver {
  readonly requests: Array<{ id: string } & McpSecretResolutionContext> = [];
  constructor(private readonly values: Record<string, string>) {}
  async resolve(ref: McpSecretReference, context: McpSecretResolutionContext): Promise<SecretValue> {
    this.requests.push({ id: ref.vaultSecretId, ...context });
    const value = this.values[ref.vaultSecretId];
    if (value === undefined) throw new McpSecretUnavailableError(context.serverId, context.field, 'MISSING');
    return SecretValue.fromString(value);
  }
}

const connectError = async (server: BaseManagedMcpServer): Promise<unknown> =>
  server.connect().then(() => null, (error: unknown) => error);

for (const { impl, available, reason } of prepareMcpTestServers()) {
  describe.skipIf(!available)(`Secret references resolved at connect (${impl}${available ? '' : ` — skipped: ${reason}`})`, () => {
    let workDir = '';
    let client: BaseManagedMcpServer | null = null;
    let httpServer: HttpTestServer | null = null;

    beforeEach(() => {
      workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `mcp-secret-ref-${impl}-`)));
    });

    afterEach(async () => {
      await client?.close();
      client = null;
      await httpServer?.close();
      httpServer = null;
      fs.rmSync(workDir, { recursive: true, force: true });
    });

    /** The launcher's stdio config for `impl`, with `MCP_TEST_SECRET` stored as `value`. */
    const stdioWithSecret = (serverId: string, value: StdioMcpServerConfig['env'][string]) => {
      const base = stdioServerConfig(impl, { serverId, cwd: workDir });
      return new StdioMcpServerConfig({
        server_id: base.server_id, command: base.command, args: base.args, cwd: base.cwd,
        env: { ...base.env, MCP_TEST_SECRET: value }
      });
    };

    it('delivers a stdio env value stored as a reference to the server process', async () => {
      const resolver = new FakeResolver({ [STORED_ENV.vaultSecretId]: 'test-dummy-env-secret' });
      client = new StdioManagedMcpServer(stdioWithSecret(`stdio-ref-${impl}`, STORED_ENV), resolver);

      const result = (await client.callTool('report_env_and_cwd', { name: 'MCP_TEST_SECRET' })) as ToolResult;

      expect(JSON.parse(result.content[0]?.text ?? '{}').value).toBe('test-dummy-env-secret');
      expect(resolver.requests).toEqual([{ id: STORED_ENV.vaultSecretId, serverId: `stdio-ref-${impl}`, field: 'env:MCP_TEST_SECRET' }]);
    });

    it.each([
      ['an Authorization header', (url: string) => ({ url, headers: { Authorization: STORED_AUTHORIZATION } })],
      ['the token', (url: string) => ({ url, token: STORED_TOKEN })]
    ])('sends %s stored as a reference on every request', async (_label, settings) => {
      httpServer = await startHttpTestServer(impl);
      const resolver = new FakeResolver({
        [STORED_AUTHORIZATION.vaultSecretId]: `Bearer ${httpServer.token}`,
        [STORED_TOKEN.vaultSecretId]: httpServer.token
      });
      client = new HttpManagedMcpServer(new StreamableHttpMcpServerConfig({ server_id: `http-ref-${impl}`, ...settings(httpServer.url) }), resolver);

      const tools = (await client.listRemoteTools()) as Array<{ name: string }>;

      expect(tools.map((tool) => tool.name)).toContain('echo');
      expect(httpServer.requests().length).toBeGreaterThan(0);
      expect(httpServer.requests().every((auth) => auth === 'ok')).toBe(true);
    });

    it('fails to connect, naming the server and field only, when a stored value is missing', async () => {
      client = new StdioManagedMcpServer(stdioWithSecret(`stdio-missing-${impl}`, ABSENT), new FakeResolver({}));

      const error = await connectError(client);

      expect(error).toBeInstanceOf(McpSecretUnavailableError);
      expect(error).toMatchObject({ serverId: `stdio-missing-${impl}`, field: 'env:MCP_TEST_SECRET', reason: 'MISSING' });
      expect((error as Error).message).toBe(`MCP server 'stdio-missing-${impl}' needs secret: env:MCP_TEST_SECRET (no value is stored).`);
    });

    it('refuses a reference without a resolver, and never falls back to a plain value', async () => {
      httpServer = await startHttpTestServer(impl);
      client = new HttpManagedMcpServer(new StreamableHttpMcpServerConfig({
        server_id: `http-no-resolver-${impl}`, url: httpServer.url, headers: { Authorization: STORED_AUTHORIZATION }
      }));

      const error = await connectError(client);

      expect(error).toMatchObject({ field: 'header:Authorization', reason: 'VAULT_UNAVAILABLE' });
      expect(httpServer.requests()).toEqual([]);
    });
  });
}
