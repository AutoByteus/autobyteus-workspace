import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { createRequire } from "node:module";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");
const sourceNodeId = "multiprocess-source-node";
const sourceRunId = "mp-source-run";
const sourceTeamRunId = "mp-source-team-run";

type ServerProcess = {
  name: string;
  port: number;
  baseUrl: string;
  dataDir: string;
  child: ChildProcessWithoutNullStreams;
  logs: string[];
};

const writeText = (filePath: string, content: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
};

const appendLog = (logs: string[], chunk: Buffer) => {
  const text = chunk.toString("utf-8");
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) {
      logs.push(line);
    }
  }
  while (logs.length > 240) {
    logs.shift();
  }
};

const getFreePort = async (): Promise<number> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close(() => reject(new Error("Unable to allocate a TCP port.")));
      return;
    }
    const { port } = address;
    server.close(() => resolve(port));
  });
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async (server: ServerProcess, timeoutMs = 90_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`${server.name} server exited before health check passed. Logs:\n${server.logs.join("\n")}`);
    }
    try {
      const response = await fetch(`${server.baseUrl}/rest/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(`${server.name} server did not become healthy: ${String(lastError)}\nLogs:\n${server.logs.join("\n")}`);
};

const stopServer = async (server: ServerProcess | null): Promise<void> => {
  if (!server || server.child.exitCode !== null) {
    return;
  }
  const exited = new Promise<void>((resolve) => {
    server.child.once("exit", () => resolve());
  });
  server.child.kill("SIGTERM");
  await Promise.race([
    exited,
    sleep(10_000).then(() => {
      if (server.child.exitCode === null) {
        server.child.kill("SIGKILL");
      }
    }),
  ]);
};

const prepareServerDist = (): void => {
  const tscPath = require.resolve("typescript/bin/tsc");
  execFileSync(process.execPath, [tscPath, "-p", "tsconfig.build.json"], {
    cwd: serverRoot,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [path.join(serverRoot, "scripts", "copy-managed-messaging-assets.mjs")], {
    cwd: serverRoot,
    stdio: "inherit",
  });
};

const startServerProcess = async (name: string, rootDir: string): Promise<ServerProcess> => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(rootDir, name);
  fs.mkdirSync(dataDir, { recursive: true });
  writeText(path.join(dataDir, ".env"), [
    `AUTOBYTEUS_SERVER_HOST=${baseUrl}`,
    "APP_ENV=test",
    "LOG_LEVEL=ERROR",
    "HTTP_ACCESS_LOG_MODE=off",
    "",
  ].join("\n"));

  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DATABASE_URL_TEST;
  delete env.AUTOBYTEUS_MEMORY_DIR;
  env.AUTOBYTEUS_SERVER_HOST = baseUrl;
  env.APP_ENV = "test";
  env.LOG_LEVEL = "ERROR";
  env.HTTP_ACCESS_LOG_MODE = "off";

  const child = spawn(process.execPath, [
    appEntry,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--data-dir", dataDir,
  ], {
    cwd: serverRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs: string[] = [];
  child.stdout.on("data", (chunk: Buffer) => appendLog(logs, chunk));
  child.stderr.on("data", (chunk: Buffer) => appendLog(logs, chunk));
  child.once("error", (error) => logs.push(`process error: ${String(error)}`));

  const server = { name, port, baseUrl, dataDir, child, logs };
  await waitForHealth(server);
  return server;
};

const graphql = async <T>(server: ServerProcess, query: string, variables?: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${server.baseUrl}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length) {
    throw new Error(`${server.name} GraphQL failed: ${response.status} ${JSON.stringify(payload.errors ?? payload)}`);
  }
  return payload.data as T;
};

const seedSourceMemory = (sourceDataDir: string): void => {
  const memoryDir = path.join(sourceDataDir, "memory");
  const runDir = path.join(memoryDir, "agents", sourceRunId);
  writeText(path.join(runDir, "run_metadata.json"), JSON.stringify({
    runId: sourceRunId,
    agentDefinitionId: "mp-agent",
    workspaceRootPath: "/workspace/multiprocess-source",
    memoryDir: runDir,
    llmModelIdentifier: "model-a",
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: null,
    runtimeKind: "autobyteus",
    platformAgentRunId: null,
    startedAt: "2026-06-23T02:00:00.000Z",
  }, null, 2));
  writeText(path.join(runDir, "raw_traces.jsonl"), `${JSON.stringify({
    id: "mp-trace-1",
    traceType: "user",
    sourceEvent: "AgentRun.postUserMessage",
    content: "hello from real source server",
    turnId: "mp-turn-1",
    seq: 1,
    ts: 1,
  })}\n`);
  writeText(path.join(runDir, "upload.partial"), "must not sync");

  writeText(path.join(memoryDir, "agent_teams", sourceTeamRunId, "team_run_metadata.json"), JSON.stringify({
    schemaVersion: 1,
    teamRunId: sourceTeamRunId,
    teamDefinitionId: "mp-team",
    teamDefinitionName: "Multiprocess Team",
    coordinatorMemberRouteKey: "lead",
    createdAt: "2026-06-23T02:00:00.000Z",
    memberTree: [],
  }, null, 2));

  writeText(path.join(memoryDir, "imports", "already-imported", "agents", "echo.txt"), "must not echo");
};

describe("Memory Sync multi-process backend e2e", () => {
  let tempRoot: string;
  let hub: ServerProcess | null = null;
  let source: ServerProcess | null = null;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-sync-multiprocess-"));
    prepareServerDist();
    hub = await startServerProcess("hub", tempRoot);
    source = await startServerProcess("source", tempRoot);
  }, 180_000);

  afterAll(async () => {
    await Promise.all([stopServer(source), stopServer(hub)]);
    if (tempRoot) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 30_000);

  it("syncs fake source memory from one real backend server process into another", async () => {
    expect(hub).not.toBeNull();
    expect(source).not.toBeNull();
    const hubServer = hub as ServerProcess;
    const sourceServer = source as ServerProcess;

    seedSourceMemory(sourceServer.dataDir);

    const hubStatus = await graphql<{
      updateMemoryHubConfig: {
        hub: { enabled: boolean; advertisedHubBaseUrl: string | null };
        connectionInfo: { ingestEndpointUrl: string | null };
        oneTimePlaintextToken: string | null;
      };
    }>(hubServer, `
      mutation EnableHub($input: UpdateMemoryHubConfigInput!) {
        updateMemoryHubConfig(input: $input) {
          hub { enabled advertisedHubBaseUrl }
          connectionInfo { ingestEndpointUrl }
          oneTimePlaintextToken
        }
      }
    `, { input: { enabled: true, advertisedHubBaseUrl: hubServer.baseUrl } });

    expect(hubStatus.updateMemoryHubConfig.hub).toEqual({ enabled: true, advertisedHubBaseUrl: hubServer.baseUrl });
    expect(hubStatus.updateMemoryHubConfig.connectionInfo.ingestEndpointUrl).toBe(`${hubServer.baseUrl}/rest/memory-sync/v1/batches`);
    const token = hubStatus.updateMemoryHubConfig.oneTimePlaintextToken ?? "";
    expect(token).toMatch(/^mhub_/);

    const sourceConfig = await graphql<{
      updateMemorySyncSourceConfig: {
        source: {
          enabled: boolean;
          sourceNodeId: string | null;
          hubBaseUrl: string | null;
          hubTokenConfigured: boolean;
          hubTokenPreview: string | null;
        };
      };
    }>(sourceServer, `
      mutation ConfigureSource($input: UpdateMemorySyncSourceConfigInput!) {
        updateMemorySyncSourceConfig(input: $input) {
          source { enabled sourceNodeId hubBaseUrl hubTokenConfigured hubTokenPreview }
        }
      }
    `, {
      input: {
        enabled: true,
        sourceNodeId,
        displayName: "Real source server",
        hubBaseUrl: hubServer.baseUrl,
        hubToken: token,
        backgroundEnabled: false,
        batchSize: 25,
      },
    });

    expect(sourceConfig.updateMemorySyncSourceConfig.source).toMatchObject({
      enabled: true,
      sourceNodeId,
      hubBaseUrl: hubServer.baseUrl,
      hubTokenConfigured: true,
      hubTokenPreview: "••••••••",
    });
    expect(JSON.stringify(sourceConfig)).not.toContain(token);

    const connection = await graphql<{
      testMemoryHubConnection: { ok: boolean; hubEnabled: boolean; authenticated: boolean; sourceNodeId: string };
    }>(sourceServer, `
      mutation TestConnection($input: TestMemoryHubConnectionInput!) {
        testMemoryHubConnection(input: $input) { ok hubEnabled authenticated sourceNodeId }
      }
    `, { input: { mode: "SAVED" } });
    expect(connection.testMemoryHubConnection).toEqual({
      ok: true,
      hubEnabled: true,
      authenticated: true,
      sourceNodeId,
    });

    const syncResult = await graphql<{
      startMemorySync: { scannedFiles: number; changedFiles: number; committedBatches: number; duplicateBatches: number; deferredFiles: number };
    }>(sourceServer, `
      mutation StartSync {
        startMemorySync { scannedFiles changedFiles committedBatches duplicateBatches deferredFiles }
      }
    `);
    expect(syncResult.startMemorySync).toMatchObject({
      committedBatches: 1,
      duplicateBatches: 0,
      deferredFiles: 0,
    });
    expect(syncResult.startMemorySync.scannedFiles).toBeGreaterThanOrEqual(3);
    expect(syncResult.startMemorySync.changedFiles).toBeGreaterThanOrEqual(3);

    const importRoot = path.join(hubServer.dataDir, "memory", "imports", sourceNodeId);
    expect(fs.readFileSync(path.join(importRoot, "agents", sourceRunId, "raw_traces.jsonl"), "utf-8")).toContain("hello from real source server");
    expect(fs.existsSync(path.join(importRoot, "agents", sourceRunId, "run_metadata.json"))).toBe(true);
    expect(fs.existsSync(path.join(importRoot, "agents", sourceRunId, "upload.partial"))).toBe(false);
    expect(fs.existsSync(path.join(importRoot, "agent_teams", sourceTeamRunId, "team_run_metadata.json"))).toBe(true);
    expect(fs.existsSync(path.join(importRoot, "imports", "already-imported", "agents", "echo.txt"))).toBe(false);

    const sourceMetadata = JSON.parse(fs.readFileSync(path.join(importRoot, "source-node.json"), "utf-8")) as { sourceNodeId: string; displayName: string | null; lastSyncStatus: string };
    const manifest = JSON.parse(fs.readFileSync(path.join(importRoot, "sync-manifest.json"), "utf-8")) as { sourceNodeId: string; totals: { fileCount: number }; files: Record<string, unknown> };
    expect(sourceMetadata).toMatchObject({ sourceNodeId, displayName: "Real source server", lastSyncStatus: "success" });
    expect(manifest.sourceNodeId).toBe(sourceNodeId);
    expect(manifest.totals.fileCount).toBeGreaterThanOrEqual(3);
    expect(Object.keys(manifest.files)).toEqual(expect.arrayContaining([
      `agents/${sourceRunId}/run_metadata.json`,
      `agents/${sourceRunId}/raw_traces.jsonl`,
      `agent_teams/${sourceTeamRunId}/team_run_metadata.json`,
    ]));

    const importedSources = await graphql<{
      listMemoryExplorerSources: Array<{ key: string; type: string; sourceNodeId: string | null; readOnly: boolean }>;
    }>(hubServer, `
      query Sources { listMemoryExplorerSources { key type sourceNodeId readOnly } }
    `);
    expect(importedSources.listMemoryExplorerSources).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "local", type: "LOCAL", readOnly: false }),
      expect.objectContaining({ key: `imported:${sourceNodeId}`, type: "IMPORTED", sourceNodeId, readOnly: true }),
    ]));

    const importedAgents = await graphql<{
      listAgentsWithMemory: { total: number; entries: Array<{ agentDefinitionId: string | null; runCount: number; memory: { hasRawTraces: boolean } }> };
    }>(hubServer, `
      query ImportedAgents($source: MemoryExplorerSourceInput!, $search: String!) {
        listAgentsWithMemory(source: $source, search: $search, page: 1, pageSize: 10) {
          total
          entries { agentDefinitionId runCount memory { hasRawTraces } }
        }
      }
    `, { source: { type: "IMPORTED", sourceNodeId }, search: "mp-agent" });
    expect(importedAgents.listAgentsWithMemory).toMatchObject({
      total: 1,
      entries: [expect.objectContaining({ agentDefinitionId: "mp-agent", runCount: 1, memory: { hasRawTraces: true } })],
    });
  }, 120_000);
});
