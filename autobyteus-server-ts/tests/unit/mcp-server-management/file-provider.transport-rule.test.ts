import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StdioMcpServerConfig, StreamableHttpMcpServerConfig } from "autobyteus-ts/tools/mcp/types.js";

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

describe("FileMcpServerConfigProvider transport of stored entries (the core parser's rule)", () => {
  beforeEach(async () => {
    appData.dir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-transport-rule-"));
  });

  afterEach(async () => {
    await fs.rm(appData.dir, { recursive: true, force: true });
  });

  it("loads stored stdio and HTTP entries without transport_type, and skips one with neither command nor url", async () => {
    await fs.writeFile(path.join(appData.dir, "mcps.json"), JSON.stringify({
      mcpServers: {
        local: { command: "node", args: ["server.js"], env: { DUMMY: "test-dummy" }, enabled: false },
        remote: { url: "http://127.0.0.1:9000/mcp", headers: { "X-Test": "test-dummy" }, tool_name_prefix: "rm" },
        broken: { args: ["server.js"] },
      },
    }));

    const configs = await new FileMcpServerConfigProvider().getAll();

    expect(configs.map((config) => config.server_id)).toEqual(["local", "remote"]);
    const [local, remote] = configs as [StdioMcpServerConfig, StreamableHttpMcpServerConfig];
    expect(local).toBeInstanceOf(StdioMcpServerConfig);
    expect(local).toMatchObject({ command: "node", args: ["server.js"], env: { DUMMY: "test-dummy" }, enabled: false });
    expect(remote).toBeInstanceOf(StreamableHttpMcpServerConfig);
    expect(remote).toMatchObject({ url: "http://127.0.0.1:9000/mcp", headers: { "X-Test": "test-dummy" }, tool_name_prefix: "rm" });
  });
});
