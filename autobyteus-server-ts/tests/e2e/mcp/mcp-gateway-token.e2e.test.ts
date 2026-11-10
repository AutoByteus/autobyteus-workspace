// The MCP gateway's own token on the real studio server (node access model NA-12, NAS-25; autobyteus-447 AC-003): an
// MCP client on this computer needs the gateway token, which the owner reads from the MCP gateway panel's route. The
// owner credential, which this test process attaches to every request to its node, is not that token. A client that
// connects through `connectMcpGatewayClient` (tests/e2e/helpers/mcp-gateway-client.ts) presents the token and is
// admitted; one that sends the owner credential, no token or a wrong one is refused 401 MCP_GATEWAY_TOKEN_REQUIRED.
// No token or credential appears in the server's output.
// Run (clean environment, TESTING.md):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/mcp/mcp-gateway-token.e2e.test.ts --no-watch
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { connectMcpGatewayClient } from "../helpers/mcp-gateway-client.js";
import { startStudioE2eRuntimeServer, type StartedStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

const GATEWAY = "/mcp/gateway";
const LIST_TOOLS = JSON.stringify({ jsonrpc: "2.0", id: "list", method: "tools/list", params: {} });
const MCP_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };
const TOKEN_REQUIRED = { error: "unauthorized", code: "MCP_GATEWAY_TOKEN_REQUIRED" };

describe("MCP gateway token on the real studio server (NAS-25)", () => {
  let dataDir: string;
  let started: StartedStudioE2eRuntimeServer;
  let gatewayToken: string;
  const output: string[] = [];

  beforeAll(async () => {
    for (const method of ["log", "info", "warn", "error"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { output.push(args.map(String).join(" ")); });
    }
    dataDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "mcp-gateway-token-e2e-")));
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\nAPP_ENV=test\n", "utf-8");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    started = await startStudioE2eRuntimeServer("127.0.0.1");
    // The owner reads the token as the MCP gateway panel does; the attachment presents the owner credential.
    const response = await fetch(new URL("/rest/mcp-gateway/token", started.mainUrl));
    expect(response.status).toBe(200);
    gatewayToken = ((await response.json()) as { token: string }).token;
    expect(gatewayToken.length).toBeGreaterThan(20);
  }, 120_000);

  afterAll(async () => {
    await started?.fastify.close();
    vi.restoreAllMocks();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  }, 60_000);

  it("refuses the owner credential the test process attaches: it is not the gateway token", async () => {
    // No authorization header of our own: the attachment adds `Bearer <owner credential>` for the node's port, as it
    // does for a test that opens the gateway without the helper.
    const attached = await fetch(new URL(GATEWAY, started.mainUrl), { method: "POST", headers: MCP_HEADERS, body: LIST_TOOLS });
    expect(attached.status).toBe(401);
    expect(await attached.json()).toMatchObject(TOKEN_REQUIRED);

    const named = await fetch(new URL(GATEWAY, started.mainUrl), {
      method: "POST",
      headers: { ...MCP_HEADERS, authorization: `Bearer ${started.ownerCredential}` },
      body: LIST_TOOLS,
    });
    expect(named.status).toBe(401);
    expect(await named.json()).toMatchObject(TOKEN_REQUIRED);
  });

  it("refuses a client with no token and one with a wrong token", async () => {
    const noToken = await started.fastify.inject({ method: "POST", url: GATEWAY, remoteAddress: "127.0.0.1", headers: MCP_HEADERS, payload: LIST_TOOLS });
    expect(noToken.statusCode).toBe(401);
    expect(noToken.json()).toMatchObject(TOKEN_REQUIRED);

    const wrongToken = `mcpg_${randomBytes(32).toString("base64url")}`;
    const wrong = await fetch(new URL(GATEWAY, started.mainUrl), {
      method: "POST",
      headers: { ...MCP_HEADERS, authorization: `Bearer ${wrongToken}` },
      body: LIST_TOOLS,
    });
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toMatchObject(TOKEN_REQUIRED);
  });

  it("admits a client connected through connectMcpGatewayClient and lists its tools", async () => {
    const client = await connectMcpGatewayClient(started.mainUrl, "mcp-gateway-token-e2e");
    try {
      const { tools } = await client.listTools();
      expect(Array.isArray(tools)).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("prints neither the gateway token nor the owner credential", () => {
    const printed = output.join("\n");
    expect(printed).not.toContain(gatewayToken);
    expect(printed).not.toContain(started.ownerCredential);
  });
});
