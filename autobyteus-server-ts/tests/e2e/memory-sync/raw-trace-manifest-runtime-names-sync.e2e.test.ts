import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { createHash } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Memory Sync of a converted raw-trace manifest between two real built server processes (autobyteus-343: design
 * F-09, DEC-2). A hub and a source node run as separate processes on test-owned data dirs and loopback ports.
 *   - The source node's data dir holds a run whose manifest uses the old label spelling when it starts: its own
 *     startup migration converts it before any sync. Its first sync uploads the converted manifest; the hub's
 *     imported copy holds the `RuntimeKind` value and the hub's `sync-manifest.json` records the converted file's
 *     hash; a second sync uploads nothing.
 *   - The hub's data dir holds an older import with the old spelling when it starts: the hub's own migration does not
 *     touch an import (DEC-2), so that copy stays byte-identical.
 * Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts --no-watch
 */

const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");
const MANIFEST = "raw_traces_manifest.json";
const SOURCE_ID = "runtime-names-source";
const RUN_ID = "rn-source-run";
const OLD_ENTRY = {
  index: 1, file_name: "raw_traces_000001.jsonl", boundary_type: "provider_compaction_boundary", boundary_key: "boundary-1",
  boundary_trace_id: "trace-1", runtime_kind: "CODEX", source_event: "synthetic.compaction", archived_at: 1_790_000_001,
  first_trace_id: "a-1", last_trace_id: "b-1", first_ts: 1, last_ts: 2, record_count: 1, status: "complete",
};
const OLD_MANIFEST = JSON.stringify({ schema_version: 1, next_segment_index: 2, segments: [OLD_ENTRY] });
const CONVERTED_MANIFEST = JSON.stringify({ schema_version: 1, next_segment_index: 2, segments: [{ ...OLD_ENTRY, runtime_kind: "codex_app_server" }] });

type ServerProcess = { name: string; baseUrl: string; dataDir: string; child: ChildProcessWithoutNullStreams; logs: string[] };

const writeText = (filePath: string, content: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
};
const sha256 = (filePath: string) => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const trace = (id: string, text: string) => `${JSON.stringify({ id, trace_type: "user", content: text, turn_id: "t1", seq: 1, ts: 1 })}\n`;

const getFreePort = async (): Promise<number> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") { server.close(() => reject(new Error("no port"))); return; }
    const { port } = address;
    server.close(() => resolve(port));
  });
});

const startServerProcess = async (name: string, dataDir: string): Promise<ServerProcess> => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  fs.mkdirSync(dataDir, { recursive: true });
  writeText(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=ERROR\nHTTP_ACCESS_LOG_MODE=off\n`);
  const env: NodeJS.ProcessEnv = { ...process.env, AUTOBYTEUS_SERVER_HOST: baseUrl, APP_ENV: "test", LOG_LEVEL: "ERROR", HTTP_ACCESS_LOG_MODE: "off", HOME: path.join(dataDir, "home") };
  delete env.DATABASE_URL; delete env.DATABASE_URL_TEST; delete env.AUTOBYTEUS_MEMORY_DIR;
  fs.mkdirSync(path.join(dataDir, "home"), { recursive: true });
  const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(port), "--data-dir", dataDir], { cwd: serverRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  const logs: string[] = [];
  const capture = (chunk: Buffer) => { for (const line of chunk.toString("utf-8").split(/\r?\n/)) if (line.trim()) logs.push(line); while (logs.length > 240) logs.shift(); };
  child.stdout.on("data", capture); child.stderr.on("data", capture);
  const server = { name, baseUrl, dataDir, child, logs };
  const deadline = Date.now() + 90_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`${name} exited before health. Logs:\n${logs.join("\n")}`);
    try { if ((await fetch(`${baseUrl}/rest/health`)).ok) return server; } catch { /* not yet */ }
    if (Date.now() > deadline) throw new Error(`${name} not healthy. Logs:\n${logs.join("\n")}`);
    await sleep(300);
  }
};

const stopServer = async (server: ServerProcess | null) => {
  if (!server || server.child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => server.child.once("exit", () => resolve()));
  server.child.kill("SIGTERM");
  await Promise.race([exited, sleep(10_000).then(() => { if (server.child.exitCode === null) server.child.kill("SIGKILL"); })]);
};

const graphql = async <T>(server: ServerProcess, query: string, variables?: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${server.baseUrl}/graphql`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length) throw new Error(`${server.name} GraphQL failed: ${JSON.stringify(payload.errors ?? payload)}`);
  return payload.data as T;
};

describe("Memory Sync of a converted raw-trace manifest (two real server processes)", () => {
  let tempRoot = "";
  let hub: ServerProcess | null = null;
  let source: ServerProcess | null = null;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-names-sync-e2e-"));
    // The hub's own older import, in the old spelling: another node's mirror; the hub's migration must not touch it.
    const hubImport = path.join(tempRoot, "hub", "memory", "imports", "older-node", "agents", "older-run");
    writeText(path.join(hubImport, MANIFEST), OLD_MANIFEST);
    writeText(path.join(hubImport, "raw_traces_active.jsonl"), trace("older-1", "imported"));
    // The source's run, in the old spelling, before the source starts.
    const run = path.join(tempRoot, "source", "memory", "agents", RUN_ID);
    writeText(path.join(run, "run_metadata.json"), JSON.stringify({
      runId: RUN_ID, agentDefinitionId: "rn-agent", workspaceRootPath: "/workspace/rn", memoryDir: run, llmModelIdentifier: "model-a", llmConfig: null,
      autoExecuteTools: false, runtimeKind: "codex_app_server", platformAgentRunId: null, startedAt: "2026-06-23T02:00:00.000Z",
    }, null, 2));
    writeText(path.join(run, "raw_traces_active.jsonl"), trace("rn-active", "active"));
    writeText(path.join(run, "raw_traces_000001.jsonl"), trace("rn-seg-1", "segment"));
    writeText(path.join(run, MANIFEST), OLD_MANIFEST);
    hub = await startServerProcess("hub", path.join(tempRoot, "hub"));
    source = await startServerProcess("source", path.join(tempRoot, "source"));
  }, 240_000);

  afterAll(async () => {
    await Promise.all([stopServer(source), stopServer(hub)]);
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  }, 30_000);

  it("uploads the converted manifest once; the hub mirrors the converted file; an older import stays as it is", async () => {
    const hubServer = hub as ServerProcess;
    const sourceServer = source as ServerProcess;
    const sourceManifest = path.join(sourceServer.dataDir, "memory", "agents", RUN_ID, MANIFEST);
    const importManifest = path.join(hubServer.dataDir, "memory", "imports", SOURCE_ID, "agents", RUN_ID, MANIFEST);

    // The source's own startup migration converted the manifest before any sync was configured.
    expect(fs.readFileSync(sourceManifest, "utf8")).toBe(CONVERTED_MANIFEST);
    const migrations = await graphql<{ getAppDataMigrations: Array<{ migrationId: string; status: string }> }>(sourceServer,
      "{ getAppDataMigrations { migrationId status } }");
    expect(migrations.getAppDataMigrations.find((item) => item.migrationId === "20261030_raw_trace_manifest_runtime_names")?.status).toBe("SUCCEEDED");
    // The hub's own start left its older import in the old spelling, byte for byte.
    expect(fs.readFileSync(path.join(hubServer.dataDir, "memory", "imports", "older-node", "agents", "older-run", MANIFEST), "utf8")).toBe(OLD_MANIFEST);

    const hubConfig = await graphql<{ updateMemoryHubConfig: { oneTimePlaintextToken: string | null } }>(hubServer, `
      mutation($input: UpdateMemoryHubConfigInput!) { updateMemoryHubConfig(input: $input) { oneTimePlaintextToken } }`,
      { input: { enabled: true, advertisedHubBaseUrl: hubServer.baseUrl } });
    const token = hubConfig.updateMemoryHubConfig.oneTimePlaintextToken ?? "";
    expect(token).toMatch(/^mhub_/);
    await graphql(sourceServer, `
      mutation($input: UpdateMemorySyncSourceConfigInput!) { updateMemorySyncSourceConfig(input: $input) { source { enabled } } }`,
      { input: { enabled: true, memorySyncSourceId: SOURCE_ID, displayName: "Runtime names source", hubBaseUrl: hubServer.baseUrl, hubToken: token, backgroundEnabled: false, batchSize: 25 } });

    const sync = async () => (await graphql<{ startMemorySync: { scannedFiles: number; changedFiles: number; committedBatches: number; duplicateBatches: number; deferredFiles: number } }>(sourceServer, `
      mutation { startMemorySync { scannedFiles changedFiles committedBatches duplicateBatches deferredFiles } }`)).startMemorySync;

    const first = await sync();
    expect(first).toMatchObject({ committedBatches: 1, duplicateBatches: 0, deferredFiles: 0 });
    // Four files: run_metadata, active file, segment file and the converted manifest.
    expect(first.changedFiles).toBe(4);
    expect(fs.readFileSync(importManifest, "utf8"), "the hub mirrors the converted manifest").toBe(CONVERTED_MANIFEST);
    const syncManifest = JSON.parse(fs.readFileSync(path.join(hubServer.dataDir, "memory", "imports", SOURCE_ID, "sync-manifest.json"), "utf8")) as { files: Record<string, { sha256?: string; hash?: string }> };
    const recorded = syncManifest.files[`agents/${RUN_ID}/${MANIFEST}`];
    expect(recorded, "the hub's sync manifest lists the converted manifest").toBeTruthy();
    expect(JSON.stringify(recorded)).toContain(sha256(sourceManifest));

    // Nothing changed since: the next sync uploads nothing.
    const second = await sync();
    expect(second).toMatchObject({ changedFiles: 0, committedBatches: 0, duplicateBatches: 0, deferredFiles: 0 });
    expect(fs.readFileSync(importManifest, "utf8")).toBe(CONVERTED_MANIFEST);
    expect(fs.readFileSync(sourceManifest, "utf8")).toBe(CONVERTED_MANIFEST);

    // A later compaction rotates again and writes the next entry in the current spelling: the hub accepts the changed
    // manifest over its existing copy (the same path a node takes when its manifest changed after an earlier sync).
    const rotated = JSON.stringify({ schema_version: 1, next_segment_index: 3, segments: [
      { ...OLD_ENTRY, runtime_kind: "codex_app_server" }, { ...OLD_ENTRY, index: 2, file_name: "raw_traces_000002.jsonl", boundary_key: "boundary-2", runtime_kind: "codex_app_server" }] });
    writeText(path.join(path.dirname(sourceManifest), "raw_traces_000002.jsonl"), trace("rn-seg-2", "segment two"));
    writeText(sourceManifest, rotated);
    const third = await sync();
    expect(third).toMatchObject({ changedFiles: 2, committedBatches: 1, duplicateBatches: 0, deferredFiles: 0 });
    expect(fs.readFileSync(importManifest, "utf8")).toBe(rotated);
  }, 180_000);
});
