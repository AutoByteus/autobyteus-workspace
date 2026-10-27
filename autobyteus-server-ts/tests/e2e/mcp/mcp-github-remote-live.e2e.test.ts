/**
 * Live check (DS-005, autobyteus-244): GitHub's remote MCP server through a real built server, with its token stored
 * as an MCP secret in that server's own vault.
 *
 * Purpose: the real store → resolve path against GitHub. The test reads the GitHub test token from the test vault
 * (read-only, in the test process) and sends it once, as a locked `Authorization` header, through
 * `configureMcpServer`. Then:
 *   - `mcps.json` holds only a secret reference and `mcpServers` returns the state `CONFIGURED` and no value;
 *   - tool discovery works, and the issue tool reads issue #1 of `ryan-zheng-teki/autobyteus-mcp-test` through
 *     `/mcp/gateway` (the server resolves the header from its vault at connect);
 *   - the token appears in no response, in no server output and in no file under the runtime root.
 * The server is started without the test-vault setting, so it uses its own application vault and its normal startup
 * (`installRuntimeMcpSecretResolver` in `server-runtime.ts`); no test-only wiring.
 * Gate: RUN_GITHUB_MCP_E2E=1, with AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault holding `test.github.token`
 * (alias AUTOBYTEUS_TEST_GITHUB_TOKEN, imported with `pnpm test-vault setup --source <file>`). Without the secret the
 * test is skipped with its reason (AUTOBYTEUS_LIVE_STRICT=1 fails instead). The token expires 2026-11-25; after that
 * GitHub refuses it and the test fails with GitHub's status (renew the token).
 * Prerequisites: network access to api.githubcopilot.com; a current build (`pnpm -C autobyteus-ts build`, then
 * `pnpm -C autobyteus-server-ts build`). The test owns its server process, port, runtime root and database.
 * Command: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_MCP_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";

const GATE = process.env["RUN_GITHUB_MCP_E2E"] === "1";
const GITHUB_MCP_URL = "https://api.githubcopilot.com/mcp/";
const REPOSITORY = { owner: "ryan-zheng-teki", repo: "autobyteus-mcp-test" };
const ISSUE_NUMBER = 1;
const PREFIX = "gh";

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;

describe.skipIf(!GATE)("GitHub remote MCP with its token in the vault (live)", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const runtimeRoot = path.join(testRuntimeRoot, `mcp-github-live-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/mcp-github-live-${suffix}.db`);
  let server: RunningTestServer | null = null;

  afterAll(async () => {
    if (server && server.child.exitCode === null) await server.stop().catch(() => server?.child.kill("SIGKILL"));
    await removeOwnedTestRuntime(runtimeRoot, database);
  }, 60_000);

  it("stores the token as a vault reference, discovers the tools and reads the test issue", async (context) => {
    const token = await readLiveTestSecret(context, "test.github.token");
    server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl });
    const responses: string[] = [];
    const gql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
      const response = await fetch(`${server!.serverUrl}/graphql`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
      });
      const text = await response.text();
      responses.push(text);
      const body = JSON.parse(text) as { data?: T; errors?: Array<{ message: string }> };
      // Error messages name fields only; they are printed without the request.
      if (!body.data || body.errors?.length) throw new Error(`GraphQL failed: ${(body.errors ?? []).map((error) => error.message).join("; ")}`);
      return body.data;
    };

    // The only place the token is revealed: the locked header value of this one request.
    await gql(`mutation($input: McpServerInput!) { configureMcpServer(input: $input) { savedConfig { __typename } } }`, { input: {
      serverId: "github", transportType: "STREAMABLE_HTTP", enabled: true, toolNamePrefix: PREFIX,
      streamableHttpConfig: { url: GITHUB_MCP_URL, token: null,
        headers: [{ name: "Authorization", secret: true, value: `Bearer ${token.revealToTrustedConsumer()}` }] },
    } });

    const stored = JSON.parse(fs.readFileSync(path.join(runtimeRoot, "mcps.json"), "utf8")) as { mcpServers: Record<string, any> };
    expect(stored.mcpServers.github.headers).toEqual({ Authorization: { vaultSecretId: expect.stringMatching(/^mcp\.[0-9a-f-]{36}$/) } });
    const listed = await gql<{ mcpServers: Array<{ serverId: string; headers?: Array<{ name: string; value: string | null; state: string }> }> }>(
      `query { mcpServers { ... on StreamableHttpMcpServerConfig { serverId headers { name value state } } } }`);
    expect(listed.mcpServers.find((entry) => entry.serverId === "github")?.headers)
      .toEqual([{ name: "Authorization", value: null, state: "CONFIGURED" }]);

    const discovered = await gql<{ discoverAndRegisterMcpServerTools: { success: boolean; message: string; discoveredTools: Array<{ name: string }> } }>(
      `mutation { discoverAndRegisterMcpServerTools(serverId: "github") { success message discoveredTools { name } } }`);
    expect(discovered.discoverAndRegisterMcpServerTools.success, discovered.discoverAndRegisterMcpServerTools.message).toBe(true);
    const toolNames = discovered.discoverAndRegisterMcpServerTools.discoveredTools.map((tool) => tool.name);
    expect(toolNames.length).toBeGreaterThan(0);

    // GitHub's server names the issue tool `issue_read` (method `get`); older releases call it `get_issue`.
    const issueCall = toolNames.includes(`${PREFIX}_issue_read`)
      ? { name: `${PREFIX}_issue_read`, arguments: { method: "get", ...REPOSITORY, issue_number: ISSUE_NUMBER } }
      : { name: `${PREFIX}_get_issue`, arguments: { ...REPOSITORY, issue_number: ISSUE_NUMBER } };
    expect(toolNames, `issue tool among ${toolNames.length} tools`).toContain(issueCall.name);
    const client = new Client({ name: "mcp-github-live-e2e", version: "1.0.0" });
    let issueText = "";
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL(`${server.serverUrl}/mcp/gateway`)));
      const result = await client.callTool(issueCall) as { content?: Array<{ text?: string }>; isError?: boolean };
      issueText = (result.content ?? []).map((part) => part.text ?? "").join("");
      expect(result.isError ?? false, issueText.slice(0, 500)).toBe(false);
    } finally {
      await client.close().catch(() => undefined);
    }
    expect(issueText).toMatch(/"number":\s*1\b|#1\b/);

    await server.stop();
    const output = server.output();
    server = null;

    // The token is never compared in an assertion message: only booleans are reported.
    const secret = token.revealToTrustedConsumer();
    const filesWithToken: string[] = [];
    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (fs.readFileSync(full).includes(secret)) filesWithToken.push(full);
      }
    };
    scan(runtimeRoot);
    expect({
      inResponses: responses.some((text) => text.includes(secret)),
      inIssueResult: issueText.includes(secret),
      inServerOutput: output.includes(secret),
      filesWithToken,
    }).toEqual({ inResponses: false, inIssueResult: false, inServerOutput: false, filesWithToken: [] });
  }, 180_000);
});
