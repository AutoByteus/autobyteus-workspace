/**
 * MCP server secrets in the vault (autobyteus-244), through `McpConfigService` with a real one-database vault, the
 * real `mcps.json` provider in a temp data dir, and the tiny MCP test server (Node, autobyteus-189).
 *
 * Purpose:
 * - a saved secret is a vault entry and `mcps.json` holds only its reference; the managed server receives the value
 *   at connect (stdio env, HTTP Authorization);
 * - keep, replace and unlock; delete removes the entries; preview stores nothing;
 * - states: CONFIGURED / MISSING, and VAULT_UNAVAILABLE while the vault is locked or not open (the list still works);
 * - the move: backup (0600), references in the file and the cache at once, servers re-registered; when the file
 *   write fails, the new entries are removed and the file is unchanged;
 * - no value appears in `mcps.json` (once locked), in a view, or in any console line.
 * Command: env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/integration/mcp-server-management/mcp-secrets-in-vault.integration.test.ts
 * Values: dummy only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { initializePrisma, shutdownPrisma } from "repository_prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpConfigService as CoreMcpConfigService, McpToolRegistrar } from "autobyteus-ts";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { secretId, type SecretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import { McpServerInstanceManager } from "autobyteus-ts/tools/mcp/server-instance-manager.js";
import { McpTransportType, StdioMcpServerConfig, type BaseMcpConfig } from "autobyteus-ts/tools/mcp/types.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import { startHttpTestServer, type HttpTestServer } from "../../../../autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.js";

const appData = vi.hoisted(() => ({ dir: "" }));

vi.mock("../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getAppDataDir: () => appData.dir,
      getMemoryDir: () => path.join(appData.dir, "memory"),
    },
  },
}));

import { ApplicationDatabaseLocation } from "../../../src/config/application-database-location.js";
import { SecretVaultBootstrap } from "../../../src/secret-management/bootstrap/secret-vault-bootstrap.js";
import { SecretVaultRepository } from "../../../src/secret-management/persistence/secret-vault-repository.js";
import { SecretManagementMcpSecretResolver } from "../../../src/secret-management/resolution/mcp-secret-resolver.js";
import { SecretManagementService } from "../../../src/secret-management/services/secret-management-service.js";
import type { DraftValue, McpServerDraft, StdioMcpServerDraft, StreamableHttpMcpServerDraft } from "../../../src/mcp-server-management/domain/mcp-server-draft.js";
import { McpConfigService } from "../../../src/mcp-server-management/services/mcp-config-service.js";
import { McpServerSecretFields } from "../../../src/mcp-server-management/services/mcp-server-secret-fields.js";

const VAULT_TABLES = `
  CREATE TABLE secret_entries (
    secret_id TEXT NOT NULL PRIMARY KEY,
    nonce BLOB NOT NULL CHECK (length(nonce) = 12),
    ciphertext BLOB NOT NULL,
    authentication_tag BLOB NOT NULL CHECK (length(authentication_tag) = 16)
  );
  CREATE TABLE secret_encryption_metadata (
    singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
    encryption_domain_id BLOB NOT NULL UNIQUE CHECK (length(encryption_domain_id) = 16),
    encryption_format_version INTEGER NOT NULL,
    verifier_nonce BLOB NOT NULL CHECK (length(verifier_nonce) = 12),
    verifier_ciphertext BLOB NOT NULL,
    verifier_authentication_tag BLOB NOT NULL CHECK (length(verifier_authentication_tag) = 16)
  );
`;

const NODE_FIXTURE = fileURLToPath(new URL("../../../../autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs", import.meta.url));
const ENV_SECRET = "test-dummy-env-secret-1";
const ENV_SECRET_2 = "test-dummy-env-secret-2";
const DUMMY_PATTERN = /test-dummy-(env|header|token)-secret/;

const plain = (value: string): DraftValue => ({ kind: "plain", value });
const newSecret = (value: string): DraftValue => ({ kind: "newSecret", value: SecretValue.fromString(value) });
const keep: DraftValue = { kind: "keep" };

const stdioDraft = (serverId: string, env: Array<[string, DraftValue]>): StdioMcpServerDraft => ({
  serverId, enabled: true, toolNamePrefix: null, transportType: McpTransportType.STDIO,
  command: process.execPath, args: [NODE_FIXTURE], cwd: null,
  env: env.map(([name, value]) => ({ name, value })),
});

const httpDraft = (serverId: string, url: string, headers: Array<[string, DraftValue]>, token: DraftValue | null = null): StreamableHttpMcpServerDraft => ({
  serverId, enabled: true, toolNamePrefix: null, transportType: McpTransportType.STREAMABLE_HTTP,
  url, headers: headers.map(([name, value]) => ({ name, value })), token,
});

const resetSingletons = () => {
  McpConfigService.resetInstance();
  (CoreMcpConfigService as unknown as { instance?: unknown }).instance = undefined;
  (McpToolRegistrar as unknown as { instance?: unknown }).instance = undefined;
  (McpServerInstanceManager as unknown as { instance?: unknown }).instance = undefined;
};

describe("MCP server secrets in the vault", () => {
  let directory = "";
  let repository: SecretVaultRepository;
  let vault: SecretManagementService;
  let service: McpConfigService;
  let consoleLines: string[] = [];
  let httpServer: HttpTestServer | null = null;

  const mcpsFile = () => path.join(appData.dir, "mcps.json");
  const storedFile = async () => fs.readFile(mcpsFile(), "utf8");
  const storedEntry = async (serverId: string) => (JSON.parse(await storedFile()) as { mcpServers: Record<string, any> }).mcpServers[serverId];
  const vaultHas = async (id: SecretId) => repository.hasEntry(id);
  const resolveStored = async (id: string) =>
    (await vault.resolveForUse({ kind: "mcpServer", vaultSecretId: secretId(id) })).revealToTrustedConsumer();
  const viewOf = async (serverId: string) => (await service.listMcpServerViews()).find((view) => view.config.server_id === serverId);

  /** Calls `report_env_and_cwd` on a temporary connection of the saved server (resolution at connect). */
  const reportedEnv = async (config: BaseMcpConfig, name: string): Promise<string | null> =>
    McpServerInstanceManager.getInstance().managedDiscoverySession(config, async (server) => {
      const result = (await server.callTool("report_env_and_cwd", { name })) as { content: Array<{ text: string }> };
      return JSON.parse(result.content[0]?.text ?? "{}").value as string | null;
    });

  beforeEach(async () => {
    await shutdownPrisma();
    resetSingletons();
    defaultToolRegistry.clear();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-secrets-in-vault-"));
    await fs.chmod(directory, 0o700);
    appData.dir = path.join(directory, "data");
    await fs.mkdir(appData.dir, { recursive: true });

    const location = ApplicationDatabaseLocation.fromConfiguredFileUrl("file:application.db", directory);
    const database = new DatabaseSync(location.databasePath);
    database.exec(VAULT_TABLES);
    database.close();
    await initializePrisma({ datasourceUrl: location.databaseUrl });
    repository = new SecretVaultRepository();
    const bootstrap = await new SecretVaultBootstrap(location, repository).initializeOrVerify();
    expect(bootstrap.health).toEqual({ state: "READY" });
    vault = new SecretManagementService(repository, bootstrap.rootKey, bootstrap.metadata, bootstrap.health);

    McpServerInstanceManager.getInstance().useSecretResolver(new SecretManagementMcpSecretResolver(() => vault));
    service = new McpConfigService(new McpServerSecretFields(() => vault));

    consoleLines = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => { consoleLines.push(args.map(String).join(" ")); });
    }
  });

  afterEach(async () => {
    // Every case: no value in any console line.
    expect(consoleLines.filter((line) => DUMMY_PATTERN.test(line))).toEqual([]);
    vi.restoreAllMocks();
    await httpServer?.close();
    httpServer = null;
    defaultToolRegistry.clear();
    vault.close();
    await shutdownPrisma();
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("stores a locked env value in the vault, holds only its reference in mcps.json, and delivers it at connect", async () => {
    const view = await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret(ENV_SECRET)], ["LOG_LEVEL", plain("debug")]]));

    const entry = await storedEntry("local");
    expect(entry.env.LOG_LEVEL).toBe("debug");
    expect(entry.env.API_KEY).toEqual({ vaultSecretId: expect.stringMatching(/^mcp\.[0-9a-f-]{36}$/) });
    expect(await storedFile()).not.toContain(ENV_SECRET);
    expect(await resolveStored(entry.env.API_KEY.vaultSecretId)).toBe(ENV_SECRET);
    expect([...view.states]).toEqual([["env:API_KEY", "CONFIGURED"], ["env:LOG_LEVEL", "PLAIN"]]);
    expect(JSON.stringify(view)).not.toContain(ENV_SECRET);

    expect(await reportedEnv(view.config, "API_KEY")).toBe(ENV_SECRET);
  });

  it("keeps, replaces and unlocks a stored secret, removing an entry once nothing references it", async () => {
    await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret(ENV_SECRET)]]));
    const first = (await storedEntry("local")).env.API_KEY.vaultSecretId as SecretId;

    await service.configureMcpServer(stdioDraft("local", [["API_KEY", keep], ["LOG_LEVEL", plain("info")]]));
    expect((await storedEntry("local")).env.API_KEY.vaultSecretId).toBe(first);
    expect(await vaultHas(first)).toBe(true);

    await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret(ENV_SECRET_2)]]));
    const second = (await storedEntry("local")).env.API_KEY.vaultSecretId as SecretId;
    expect(second).not.toBe(first);
    expect(await vaultHas(first)).toBe(false);
    expect(await resolveStored(second)).toBe(ENV_SECRET_2);

    await service.configureMcpServer(stdioDraft("local", [["API_KEY", plain("test-dummy-unlocked")]]));
    expect((await storedEntry("local")).env.API_KEY).toBe("test-dummy-unlocked");
    expect(await vaultHas(second)).toBe(false);
  });

  it("refuses to keep a value that is not stored, and leaves nothing behind", async () => {
    await expect(service.configureMcpServer(stdioDraft("local", [["A_TOKEN", newSecret(ENV_SECRET)], ["API_KEY", keep]])))
      .rejects.toThrow("MCP server 'local' has no stored value for env:API_KEY to keep.");
    expect(await repository.countEntries()).toBe(0);
    await expect(fs.access(mcpsFile())).rejects.toThrow();
  });

  it("deletes a server and removes its vault entries", async () => {
    await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret(ENV_SECRET)]]));
    const id = (await storedEntry("local")).env.API_KEY.vaultSecretId as SecretId;

    await expect(service.deleteMcpServer("local")).resolves.toBe(true);

    expect(await vaultHas(id)).toBe(false);
    expect(await storedEntry("local")).toBeUndefined();
  });

  it("previews with a new value and a kept secret, and stores nothing", async () => {
    httpServer = await startHttpTestServer("node", "test-dummy-header-secret");
    const tools = await service.previewMcpServerTools(httpDraft("remote", httpServer.url, [["Authorization", newSecret("Bearer test-dummy-header-secret")]]));
    expect(tools.map((tool) => tool.name)).toContain("echo");
    expect(await repository.countEntries()).toBe(0);
    await expect(fs.access(mcpsFile())).rejects.toThrow();

    await service.configureMcpServer(httpDraft("remote", httpServer.url, [["Authorization", newSecret("Bearer test-dummy-header-secret")]]));
    const kept = await service.previewMcpServerTools(httpDraft("remote", httpServer.url, [["Authorization", keep]]));
    expect(kept.map((tool) => tool.name)).toContain("echo");
    expect(await repository.countEntries()).toBe(1);
    expect(httpServer.requests().every((auth) => auth === "ok")).toBe(true);
  });

  it("reports MISSING for an absent entry, and fails to connect naming the field only", async () => {
    const view = await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret(ENV_SECRET)]]));
    await vault.removeForConsumer({ kind: "mcpServer", vaultSecretId: (await storedEntry("local")).env.API_KEY.vaultSecretId });

    expect([...(await viewOf("local"))!.states]).toEqual([["env:API_KEY", "MISSING"]]);
    await expect(service.discoverAndRegisterToolsForServer("local")).rejects.toThrow(
      "MCP server 'local' needs secret: env:API_KEY (no value is stored).",
    );
    expect(view.config.server_id).toBe("local");
  });

  it("reports VAULT_UNAVAILABLE while the vault is locked or not open, and the list still succeeds", async () => {
    await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret(ENV_SECRET)], ["LOG_LEVEL", plain("debug")]]));
    const locked = new SecretManagementService(repository, null, null, { state: "LOCKED", instructionCode: "SECRET_VAULT_LOCKED" } as never);
    const notOpen = () => { throw new SecretVaultError("VAULT_UNAVAILABLE", true, "SECRET_VAULT_UNAVAILABLE"); };

    for (const management of [() => locked, notOpen]) {
      McpConfigService.resetInstance();
      const views = await new McpConfigService(new McpServerSecretFields(management)).listMcpServerViews();
      expect([...views[0]!.states]).toEqual([["env:API_KEY", "VAULT_UNAVAILABLE"], ["env:LOG_LEVEL", "PLAIN"]]);
    }
  });

  it("moves plain secrets to the vault: backup first, references in the file and the cache, servers re-registered", async () => {
    httpServer = await startHttpTestServer("node", "test-dummy-header-secret");
    await service.configureMcpServer(stdioDraft("local", [["GITHUB_TOKEN", plain("test-dummy-env-secret-9")], ["LOG_LEVEL", plain("debug")]]));
    // An always-secret field stored plain (written by hand, as files from before this change are).
    await fs.writeFile(mcpsFile(), JSON.stringify({
      mcpServers: {
        ...JSON.parse(await storedFile()).mcpServers,
        remote: { url: httpServer.url, token: "test-dummy-header-secret", headers: { "X-Toolsets": "repos" } },
      },
    }));
    McpConfigService.resetInstance();
    service = new McpConfigService(new McpServerSecretFields(() => vault));
    const plainFile = await storedFile();

    const candidates = await service.listSecretMoveCandidates();
    expect(candidates).toEqual([
      { serverId: "local", field: "env:GITHUB_TOKEN", matchedBy: "NAME" },
      { serverId: "remote", field: "token", matchedBy: "ALWAYS_SECRET" },
    ]);
    expect(JSON.stringify(candidates)).not.toMatch(DUMMY_PATTERN);

    const result = await service.moveSecretsToVault([...candidates, { serverId: "gone", field: "env:API_KEY" }]);

    expect(result.moved).toEqual([{ serverId: "local", field: "env:GITHUB_TOKEN" }, { serverId: "remote", field: "token" }]);
    expect(result.skipped).toEqual([{ serverId: "gone", field: "env:API_KEY" }]);
    expect(result.serversFailingAfterMove).toEqual([]);
    expect(await fs.readFile(result.backupPath as string, "utf8")).toBe(plainFile);
    expect((await fs.stat(result.backupPath as string)).mode & 0o777).toBe(0o600);
    expect(await storedFile()).not.toMatch(DUMMY_PATTERN);
    const remote = await storedEntry("remote");
    expect(await resolveStored(remote.token.vaultSecretId)).toBe("test-dummy-header-secret");
    // The cache took the references at once.
    expect([...(await viewOf("local"))!.states]).toEqual([["env:GITHUB_TOKEN", "CONFIGURED"], ["env:LOG_LEVEL", "PLAIN"]]);
    expect([...(await viewOf("remote"))!.states]).toEqual([["header:X-Toolsets", "PLAIN"], ["token", "CONFIGURED"]]);
    // Re-registered with the resolved token.
    expect(defaultToolRegistry.getToolsByMcpServer("remote").length).toBeGreaterThan(0);
    expect(httpServer.requests().every((auth) => auth === "ok")).toBe(true);
    expect(await service.listSecretMoveCandidates()).toEqual([]);
  });

  it("removes the new entries and leaves the file unchanged when the move's file write fails", async () => {
    await service.configureMcpServer(stdioDraft("local", [["GITHUB_TOKEN", plain("test-dummy-env-secret-9")], ["OTHER_KEY", plain("test-dummy-env-secret-8")]]));
    await service.listMcpServerViews();
    // A hand edit after the cache was filled: one selected value is no longer plain in the file.
    const edited = JSON.parse(await storedFile());
    edited.mcpServers.local.env.OTHER_KEY = { vaultSecretId: "mcp.00000000-0000-4000-8000-000000000001" };
    await fs.writeFile(mcpsFile(), JSON.stringify(edited));
    const before = await storedFile();

    await expect(service.moveSecretsToVault([
      { serverId: "local", field: "env:GITHUB_TOKEN" },
      { serverId: "local", field: "env:OTHER_KEY" },
    ])).rejects.toThrow("MCP server 'local' env:OTHER_KEY is no longer stored as plain text in mcps.json.");

    expect(await storedFile()).toBe(before);
    expect(await repository.countEntries()).toBe(0);
    expect((await fs.readdir(appData.dir)).filter((name) => name.includes("backup"))).toEqual([]);
  });

  it("writes the backup when a form save locks a stored plain value", async () => {
    await service.configureMcpServer(stdioDraft("local", [["API_KEY", plain("test-dummy-env-secret-7")]]));
    const plainFile = await storedFile();

    await service.configureMcpServer(stdioDraft("local", [["API_KEY", newSecret("test-dummy-env-secret-7")]]));

    const backups = (await fs.readdir(appData.dir)).filter((name) => name.startsWith("mcps.json.backup-before-vault-move-"));
    expect(backups).toHaveLength(1);
    expect(await fs.readFile(path.join(appData.dir, backups[0] as string), "utf8")).toBe(plainFile);
    expect(await storedFile()).not.toMatch(DUMMY_PATTERN);
  });

  it("imports always-secret values and rule matches straight into the vault", async () => {
    const result = await service.importMcpServerConfigs(JSON.stringify({
      mcpServers: {
        local: { command: process.execPath, args: [NODE_FIXTURE], env: { API_KEY: ENV_SECRET, LOG_LEVEL: "debug" } },
      },
    }));

    expect(result).toMatchObject({ imported_count: 1, failed_count: 0, stored_secrets: [{ serverId: "local", field: "env:API_KEY" }] });
    expect(await storedFile()).not.toContain(ENV_SECRET);
    const config = (await viewOf("local"))!.config as StdioMcpServerConfig;
    expect(await reportedEnv(config, "API_KEY")).toBe(ENV_SECRET);
  });
});
