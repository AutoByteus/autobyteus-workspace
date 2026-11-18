import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamableHttpMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

const appData = vi.hoisted(() => ({ dir: "" }));

vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getAppDataDir: () => appData.dir,
      getMemoryDir: () => path.join(appData.dir, "memory"),
    },
  },
}));

import { FileMcpServerConfigProvider } from "../../../src/mcp-server-management/providers/file-provider.js";

const readStoredFile = async (): Promise<{ mcpServers: Record<string, Record<string, unknown>> }> =>
  JSON.parse(await fs.readFile(path.join(appData.dir, "mcps.json"), "utf8"));

describe("FileMcpServerConfigProvider streamable HTTP credentials", () => {
  beforeEach(async () => {
    appData.dir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-http-auth-"));
  });

  afterEach(async () => {
    await fs.rm(appData.dir, { recursive: true, force: true });
  });

  it("saves the token and headers as separate fields and reloads them", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(
      new StreamableHttpMcpServerConfig({
        server_id: "remote",
        url: "http://127.0.0.1:9000/mcp",
        token: "test-dummy",
        headers: { "X-Test-Tenant": "test-tenant" },
      }),
    );

    const stored = await readStoredFile();
    expect(stored.mcpServers.remote).toEqual({
      url: "http://127.0.0.1:9000/mcp",
      token: "test-dummy",
      headers: { "X-Test-Tenant": "test-tenant" },
    });

    const reloaded = (await new FileMcpServerConfigProvider().getByServerId("remote")) as StreamableHttpMcpServerConfig;
    expect(reloaded).toBeInstanceOf(StreamableHttpMcpServerConfig);
    expect(reloaded.token).toBe("test-dummy");
    expect(reloaded.headers).toEqual({ "X-Test-Tenant": "test-tenant" });
  });

  it("writes no token key when the token is blank, and updates replace a saved token", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(
      new StreamableHttpMcpServerConfig({ server_id: "remote", url: "http://127.0.0.1:9000/mcp", token: "test-dummy" }),
    );
    await provider.update(
      new StreamableHttpMcpServerConfig({ server_id: "remote", url: "http://127.0.0.1:9000/mcp", token: "  " }),
    );

    const stored = await readStoredFile();
    expect(stored.mcpServers.remote).toEqual({ url: "http://127.0.0.1:9000/mcp" });
  });

  it("loads an existing entry written without a token unchanged", async () => {
    await fs.writeFile(
      path.join(appData.dir, "mcps.json"),
      JSON.stringify({
        mcpServers: {
          existing: { url: "http://127.0.0.1:9000/mcp", headers: { Authorization: "Basic test-dummy" } },
        },
      }),
    );

    const loaded = (await new FileMcpServerConfigProvider().getByServerId("existing")) as StreamableHttpMcpServerConfig;
    expect(loaded.token).toBeNull();
    expect(loaded.headers).toEqual({ Authorization: "Basic test-dummy" });
  });
});
