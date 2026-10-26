/**
 * `mcps.json` with secret references: the file provider stores and reloads references, writes the backup (mode
 * 0600) before a stored plain value becomes a reference, rewrites the file for the move in one locked write, and
 * skips an invalid entry with a warning that names the server and never a value. Dummy values only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { secretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import {
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
} from "autobyteus-ts/tools/mcp/types.js";

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

const REF_A = { vaultSecretId: secretId("mcp.00000000-0000-4000-8000-00000000000a") };
const REF_B = { vaultSecretId: secretId("mcp.00000000-0000-4000-8000-00000000000b") };

const filePath = () => path.join(appData.dir, "mcps.json");
const readStoredFile = async (): Promise<{ mcpServers: Record<string, Record<string, unknown>> }> =>
  JSON.parse(await fs.readFile(filePath(), "utf8"));
const backups = async (): Promise<string[]> =>
  (await fs.readdir(appData.dir)).filter((name) => name.startsWith("mcps.json.backup-before-vault-move-"));

const stdio = (env: StdioMcpServerConfig["env"]) =>
  new StdioMcpServerConfig({ server_id: "local", command: "node", args: ["server.js"], env });

describe("FileMcpServerConfigProvider secret references", () => {
  beforeEach(async () => {
    appData.dir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-secret-refs-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(appData.dir, { recursive: true, force: true });
  });

  it("stores a reference in place of the value and reloads it as a reference", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(new StreamableHttpMcpServerConfig({
      server_id: "remote", url: "http://127.0.0.1:9000/mcp", token: REF_B, headers: { "X-Api-Key": REF_A, "X-Toolsets": "repos" },
    }));

    expect((await readStoredFile()).mcpServers.remote).toEqual({
      url: "http://127.0.0.1:9000/mcp",
      token: { vaultSecretId: REF_B.vaultSecretId },
      headers: { "X-Api-Key": { vaultSecretId: REF_A.vaultSecretId }, "X-Toolsets": "repos" },
    });
    const reloaded = (await new FileMcpServerConfigProvider().getByServerId("remote")) as StreamableHttpMcpServerConfig;
    expect(reloaded.token).toEqual(REF_B);
    expect(reloaded.headers).toEqual({ "X-Api-Key": REF_A, "X-Toolsets": "repos" });
  });

  it("writes a 0600 backup of the plain file before an update turns a plain value into a reference", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(stdio({ API_KEY: "test-dummy-env-secret", LOG_LEVEL: "debug" }));
    const before = await fs.readFile(filePath(), "utf8");

    await provider.update(stdio({ API_KEY: REF_A, LOG_LEVEL: "debug" }));

    const [backup, ...others] = await backups();
    expect(others).toEqual([]);
    expect(await fs.readFile(path.join(appData.dir, backup as string), "utf8")).toBe(before);
    expect((await fs.stat(path.join(appData.dir, backup as string))).mode & 0o777).toBe(0o600);
    expect((await readStoredFile()).mcpServers.local?.env).toEqual({ API_KEY: { vaultSecretId: REF_A.vaultSecretId }, LOG_LEVEL: "debug" });
    expect(await fs.readFile(filePath(), "utf8")).not.toContain("test-dummy-env-secret");
  });

  it("writes no backup when no plain value becomes a reference", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(stdio({ API_KEY: REF_A }));
    await provider.update(stdio({ API_KEY: REF_B, LOG_LEVEL: "debug" }));
    await provider.update(stdio({ API_KEY: "test-dummy-unlocked" }));

    expect(await backups()).toEqual([]);
  });

  it("replaces plain values with references in one write, after writing the backup", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(stdio({ API_KEY: "test-dummy-env-secret", LOG_LEVEL: "debug" }));
    await provider.create(new StreamableHttpMcpServerConfig({
      server_id: "remote", url: "http://127.0.0.1:9000/mcp", headers: { Authorization: "Bearer test-dummy-header-secret" },
    }));
    const before = await fs.readFile(filePath(), "utf8");

    const result = await provider.replaceWithReferences([
      { serverId: "local", field: "env:API_KEY", reference: REF_A },
      { serverId: "remote", field: "header:Authorization", reference: REF_B },
    ]);

    expect(path.dirname(result.backupPath)).toBe(appData.dir);
    expect(await fs.readFile(result.backupPath, "utf8")).toBe(before);
    expect((await fs.stat(result.backupPath)).mode & 0o777).toBe(0o600);
    const stored = await readStoredFile();
    expect(stored.mcpServers.local?.env).toEqual({ API_KEY: { vaultSecretId: REF_A.vaultSecretId }, LOG_LEVEL: "debug" });
    expect(stored.mcpServers.remote?.headers).toEqual({ Authorization: { vaultSecretId: REF_B.vaultSecretId } });
    expect(result.configs.map((config) => config.server_id)).toEqual(["local", "remote"]);
    expect((result.configs[1] as StreamableHttpMcpServerConfig).headers).toEqual({ Authorization: REF_B });
  });

  it("leaves the file unchanged and no backup when a value to replace is no longer plain", async () => {
    const provider = new FileMcpServerConfigProvider();
    await provider.create(stdio({ API_KEY: REF_A, OTHER_TOKEN: "test-dummy-env-secret" }));
    const before = await fs.readFile(filePath(), "utf8");

    await expect(provider.replaceWithReferences([
      { serverId: "local", field: "env:OTHER_TOKEN", reference: REF_B },
      { serverId: "local", field: "env:API_KEY", reference: REF_B },
    ])).rejects.toThrow("MCP server 'local' env:API_KEY is no longer stored as plain text in mcps.json.");

    expect(await fs.readFile(filePath(), "utf8")).toBe(before);
    expect(await backups()).toEqual([]);
  });

  it("skips an invalid entry with a warning naming the server and the error, never a value", async () => {
    await fs.writeFile(filePath(), JSON.stringify({
      mcpServers: {
        broken: { command: "node", env: { API_KEY: "test-dummy-env-secret", PORT: 8080 } },
        fine: { command: "node" },
      },
    }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const all = await new FileMcpServerConfigProvider().getAll();

    expect(all.map((config) => config.server_id)).toEqual(["fine"]);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toMatch(/^Skipping MCP server 'broken' in mcps\.json: .*StdioMcpServerConfig 'broken' 'env' must map names to strings or secret references\.$/);
    expect(line).not.toContain("test-dummy-env-secret");
  });
});
