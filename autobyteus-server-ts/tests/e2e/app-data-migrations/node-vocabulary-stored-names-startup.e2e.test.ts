import { createHash } from "node:crypto";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * autobyteus-290 (node vocabulary): a node upgraded over its released data, between two real built server processes.
 *
 * Purpose: the stored names follow the code (SM-1 … SM-5, REQ-911), the node keeps its node ID, its peers still recognize
 * it, Memory Sync continues with the same source (AC-905, AC-903), and a damaged file holds the feature back with its
 * stated reason while the rest works (REQ-913).
 *
 * How the released data is made: alpha and beta start fresh, pair (mutual peers) and sync memory (alpha a Memory Sync
 * source, beta its hub) through their public APIs. Both stop; their stored files are turned back to the released names
 * (`server-instance.json {serverInstanceId}`, `sourceNodeId`, `boundSourceNodeId`, `source-node.json`), and the records
 * of the two migrations are removed from each database, which is what a released build leaves (it never ran them).
 * The released names are the frozen shapes in `src/app-data-migrations/frozen/released-{node-identity-file,memory-sync-files}.ts`.
 *
 * Prerequisites: `pnpm -C autobyteus-server-ts build`; `sqlite3` on PATH.
 * Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/node-vocabulary-stored-names-startup.e2e.test.ts --no-watch
 *
 * Cases (in order; they share the two nodes):
 * - NV-01 upgrade: the same node IDs; files renamed with their values and a backup each; peers recognize each other both
 *   ways; Memory Sync continues into the same import (only the new file is sent); a third start changes no file.
 * - NV-02 a damaged identity file on beta: 503 NODE_IDENTITY_NOT_MIGRATED, no new node ID, the file kept and named in
 *   a warning, alpha and beta refuse each other with that reason, the rest of beta works (its Memory Sync hub too);
 *   the file restored, the next start migrates it and the peers work again.
 * - NV-03 damaged hub credentials on beta: ingestion 503 MEMORY_SYNC_NOT_MIGRATED, Memory Sync reads refuse with the
 *   text, only local memory is listed, the files kept; restored, the next start migrates them and alpha syncs again.
 */

const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");
const SOURCE_ID = "nv-upgrade-source";
const SOURCE_RUN = "nv-source-run";
const IDENTITY_MIGRATION = "20261024_node_identity_file_name";
const MEMORY_SYNC_MIGRATION = "20261024_memory_sync_source_id_names";
const IDENTITY_TEXT = "This node's identity is waiting for its data migration.";
const MEMORY_SYNC_TEXT = "Memory Sync is waiting for its data migration.";

type Json = Record<string, any>;
type Node = { name: string; port: number; baseUrl: string; dataDir: string; child: ChildProcessWithoutNullStreams | null; logs: string[] };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const readJson = (file: string): Json => JSON.parse(fs.readFileSync(file, "utf-8"));
const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
};
const writeText = (file: string, text: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf-8");
};
const rename = (value: Json, from: string, to: string): Json =>
  Object.fromEntries(Object.entries(value).map(([key, entry]) => [key === from ? to : key, entry]));
const listFiles = (dir: string): string[] => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const backupsOf = (file: string) => fs.readdirSync(path.dirname(file)).filter((name) => name.startsWith(`${path.basename(file)}.backup-`));

const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    server.close(() => resolve(port));
  });
});

const createNode = async (name: string, root: string): Promise<Node> => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(root, name);
  writeText(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  return { name, port, baseUrl, dataDir, child: null, logs: [] };
};

const start = async (node: Node) => {
  node.logs = [];
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    AUTOBYTEUS_SERVER_HOST: node.baseUrl, APP_ENV: "test", LOG_LEVEL: "WARN", HTTP_ACCESS_LOG_MODE: "off" };
  const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(node.port), "--data-dir", node.dataDir],
    { cwd: serverRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  const collect = (chunk: Buffer) => node.logs.push(...chunk.toString("utf-8").split(/\r?\n/).filter(Boolean));
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  node.child = child;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${node.name} exited ${child.exitCode}:\n${node.logs.slice(-40).join("\n")}`);
    if (await fetch(`${node.baseUrl}/rest/health`).then((response) => response.ok).catch(() => false)) return;
    await sleep(300);
  }
  throw new Error(`${node.name} did not become healthy:\n${node.logs.slice(-40).join("\n")}`);
};

const stop = async (node: Node) => {
  const child = node.child;
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([exited, sleep(15_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
  node.child = null;
};

const gqlRaw = async (node: Node, query: string, variables?: Json): Promise<{ data?: Json; errors?: Array<{ message: string }> }> =>
  (await fetch(`${node.baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json();
const gql = async (node: Node, query: string, variables?: Json): Promise<Json> => {
  const body = await gqlRaw(node, query, variables);
  if (body.errors?.length) throw new Error(`${node.name}: ${JSON.stringify(body.errors)}`);
  return body.data as Json;
};
const status = async (node: Node) => {
  const response = await fetch(`${node.baseUrl}/rest/remote-access/status`);
  return { status: response.status, body: await response.json() as Json };
};
const offer = (from: Node, nodeId: string) =>
  gql(from, `query($n:String!){ peerNodeOffer(nodeId:$n){ entries{ name kind } refusalCode unreachableReason } }`, { n: nodeId }).then((data) => data.peerNodeOffer);
const availability = (from: Node, nodeId: string) =>
  gql(from, `query($n:String!){ peerNodeAvailability(nodeId:$n){ available refusalCode unreachableReason } }`, { n: nodeId }).then((data) => data.peerNodeAvailability);
const sync = (node: Node) => gql(node, `mutation{ startMemorySync{ scannedFiles changedFiles committedBatches duplicateBatches deferredFiles } }`).then((data) => data.startMemorySync);

const databaseOf = (node: Node) => {
  const found = listFiles(node.dataDir).filter((file) => file.endsWith(".db"));
  if (found.length !== 1) throw new Error(`${node.name}: expected one database, found ${JSON.stringify(found)}`);
  return found[0];
};
const sqlite = (node: Node, sql: string) => execFileSync("sqlite3", [databaseOf(node), sql], { encoding: "utf-8" }).trim();
const forgetMigrations = (node: Node, ids: string[]) =>
  sqlite(node, `DELETE FROM app_data_migration_records WHERE migration_id IN (${ids.map((id) => `'${id}'`).join(",")});`);
const migrationStatus = (node: Node, id: string) => sqlite(node, `SELECT status FROM app_data_migration_records WHERE migration_id='${id}';`);

const paths = (node: Node) => ({
  identity: path.join(node.dataDir, "remote-access", "node-identity.json"),
  releasedIdentity: path.join(node.dataDir, "remote-access", "server-instance.json"),
  config: path.join(node.dataDir, "memory-sync", "memory-sync-config.json"),
  stateDir: path.join(node.dataDir, "memory-sync", "source-state"),
  credentials: path.join(node.dataDir, "memory-sync", "hub-credentials.json"),
  importDir: path.join(node.dataDir, "memory", "imports", SOURCE_ID),
});

/** The node identity file as the released build stored it (SM-1's source). */
const toReleasedIdentity = (node: Node) => {
  const p = paths(node);
  const current = readJson(p.identity);
  writeJson(p.releasedIdentity, rename(current, "nodeId", "serverInstanceId"));
  fs.rmSync(p.identity);
};
/** Memory Sync's files as the released build stored them (SM-2 … SM-5's sources), where they exist on this node. */
const toReleasedMemorySync = (node: Node) => {
  const p = paths(node);
  if (fs.existsSync(p.config)) {
    const config = readJson(p.config);
    if (config.source) writeJson(p.config, { ...config, source: rename(config.source, "memorySyncSourceId", "sourceNodeId") });
  }
  for (const file of listFiles(p.stateDir)) writeJson(file, rename(readJson(file), "memorySyncSourceId", "sourceNodeId"));
  if (fs.existsSync(p.credentials)) {
    writeJson(p.credentials, (readJson(p.credentials) as unknown as Json[]).map((record) => rename(record, "boundMemorySyncSourceId", "boundSourceNodeId")));
  }
  if (fs.existsSync(p.importDir)) {
    const metadata = path.join(p.importDir, "memory-sync-source.json");
    writeJson(path.join(p.importDir, "source-node.json"), rename(readJson(metadata), "memorySyncSourceId", "sourceNodeId"));
    fs.rmSync(metadata);
    const manifest = path.join(p.importDir, "sync-manifest.json");
    writeJson(manifest, rename(readJson(manifest), "memorySyncSourceId", "sourceNodeId"));
  }
};
/** Every stored file under the renamed areas, with its content hash (a later start must change none). */
const storedState = (node: Node) => Object.fromEntries(
  [path.join(node.dataDir, "remote-access"), path.join(node.dataDir, "memory-sync"), path.join(node.dataDir, "memory", "imports"),
    path.join(node.dataDir, "remote-collaboration")]
    .flatMap(listFiles).sort()
    .map((file) => [path.relative(node.dataDir, file), createHash("sha256").update(fs.readFileSync(file)).digest("hex")]));

const seedSourceRun = (node: Node, line: string, file = "raw_traces_active.jsonl") =>
  fs.appendFileSync(path.join(node.dataDir, "memory", "agents", SOURCE_RUN, file), `${JSON.stringify({ id: line, traceType: "user", content: line, seq: 1, ts: 1 })}\n`);

describe("autobyteus-290 stored names: a node upgraded over its released data", () => {
  let root = "";
  let alpha: Node;
  let beta: Node;
  const ids: Json = {};
  const released: Json = {};

  beforeAll(async () => {
    expect(fs.existsSync(appEntry), "build first: pnpm -C autobyteus-server-ts build").toBe(true);
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "nv-stored-names-")));
    alpha = await createNode("alpha", root);
    beta = await createNode("beta", root);
    await Promise.all([start(alpha), start(beta)]);

    // Pair them (mutual peers), as the Nodes tab does.
    ids.alpha = (await status(alpha)).body.nodeId;
    ids.beta = (await status(beta)).body.nodeId;
    for (const node of [alpha, beta]) await gql(node, `mutation{ setRemoteCollaborationEnabled(enabled:true){ enabled } }`);
    const add = `mutation($i:AddPeerNodeInput!){ addPeerNode(input:$i){ nodeId } }`;
    await gql(alpha, add, { i: { nodeId: ids.beta, name: "beta-node", baseUrl: beta.baseUrl } });
    await gql(beta, add, { i: { nodeId: ids.alpha, name: "alpha-node", baseUrl: alpha.baseUrl } });
    expect((await offer(alpha, ids.beta)).entries, "paired before the upgrade").not.toBeNull();

    // Alpha syncs its memory to beta (Memory Sync source → hub), as the Memory Sync card does.
    const hub = await gql(beta, `mutation($i:UpdateMemoryHubConfigInput!){ updateMemoryHubConfig(input:$i){ oneTimePlaintextToken } }`,
      { i: { enabled: true, advertisedHubBaseUrl: beta.baseUrl } });
    writeJson(path.join(alpha.dataDir, "memory", "agents", SOURCE_RUN, "run_metadata.json"), { runId: SOURCE_RUN, agentDefinitionId: "nv-agent",
      workspaceRootPath: "/workspace/nv", memoryDir: "", llmModelIdentifier: "model-a", llmConfig: null, autoExecuteTools: false,
      runtimeKind: "autobyteus", platformAgentRunId: null, startedAt: "2026-10-24T00:00:00.000Z" });
    seedSourceRun(alpha, "BEFORE-UPGRADE");
    await gql(alpha, `mutation($i:UpdateMemorySyncSourceConfigInput!){ updateMemorySyncSourceConfig(input:$i){ source{ memorySyncSourceId } } }`,
      { i: { enabled: true, memorySyncSourceId: SOURCE_ID, displayName: "Alpha", hubBaseUrl: beta.baseUrl,
        hubToken: hub.updateMemoryHubConfig.oneTimePlaintextToken, backgroundEnabled: false, batchSize: 25 } });
    expect(await sync(alpha), "synced before the upgrade").toMatchObject({ committedBatches: 1 });

    // A released build's data: the released names on disk, and no record of the two migrations.
    await Promise.all([stop(alpha), stop(beta)]);
    for (const node of [alpha, beta]) {
      toReleasedIdentity(node);
      toReleasedMemorySync(node);
      forgetMigrations(node, [IDENTITY_MIGRATION, MEMORY_SYNC_MIGRATION]);
      released[node.name] = storedState(node);
    }
  }, 300_000);

  afterAll(async () => {
    await Promise.all([alpha && stop(alpha), beta && stop(beta)]);
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }, 60_000);

  it("NV-01 upgrade: same node IDs, renamed files with their values and backups, peers recognize each other, Memory Sync continues into the same import, a third start changes nothing", async () => {
    const pa = paths(alpha);
    const pb = paths(beta);
    const releasedIdentity = { alpha: readJson(pa.releasedIdentity), beta: readJson(pb.releasedIdentity) };
    expect(Object.keys(releasedIdentity.alpha).sort(), "the released identity shape").toEqual(["createdAt", "serverInstanceId"]);
    expect(Object.keys(readJson(path.join(pb.importDir, "source-node.json")))).toContain("sourceNodeId");

    await Promise.all([start(alpha), start(beta)]);

    // SM-1: the same node ID under the current name, the released file backed up and removed.
    for (const [node, p, before] of [[alpha, pa, releasedIdentity.alpha], [beta, pb, releasedIdentity.beta]] as const) {
      const answer = await status(node);
      expect(answer.status).toBe(200);
      expect(answer.body.nodeId, `${node.name} keeps its node ID`).toBe(ids[node.name]);
      expect(answer.body).not.toHaveProperty("serverInstanceId");
      expect(answer.body).not.toHaveProperty("compatibilityVersion");
      expect(readJson(p.identity)).toEqual({ nodeId: before.serverInstanceId, createdAt: before.createdAt });
      expect(fs.existsSync(p.releasedIdentity)).toBe(false);
      const backups = backupsOf(p.releasedIdentity);
      expect(backups).toHaveLength(1);
      expect(readJson(path.join(path.dirname(p.releasedIdentity), backups[0]))).toEqual(before);
      expect(migrationStatus(node, IDENTITY_MIGRATION)).toBe("SUCCEEDED");
      expect(migrationStatus(node, MEMORY_SYNC_MIGRATION)).toBe("SUCCEEDED");
    }

    // SM-2 … SM-5: the current names with the same values, each file backed up.
    const config = readJson(pa.config);
    expect(config.source.memorySyncSourceId).toBe(SOURCE_ID);
    expect(config.source).not.toHaveProperty("sourceNodeId");
    expect(backupsOf(pa.config)).toHaveLength(1);
    const states = listFiles(pa.stateDir).filter((file) => file.endsWith(".json"));
    expect(states.length).toBeGreaterThan(0);
    for (const file of states) {
      expect(readJson(file).memorySyncSourceId).toBe(SOURCE_ID);
      expect(backupsOf(file)).toHaveLength(1);
    }
    const credentials = readJson(pb.credentials) as unknown as Json[];
    expect(credentials.map((record) => record.boundMemorySyncSourceId)).toEqual([SOURCE_ID]);
    expect(JSON.stringify(credentials)).not.toContain("boundSourceNodeId");
    expect(backupsOf(pb.credentials)).toHaveLength(1);
    expect(readJson(path.join(pb.importDir, "memory-sync-source.json")).memorySyncSourceId).toBe(SOURCE_ID);
    expect(fs.existsSync(path.join(pb.importDir, "source-node.json"))).toBe(false);
    expect(backupsOf(path.join(pb.importDir, "source-node.json"))).toHaveLength(1);
    expect(readJson(path.join(pb.importDir, "sync-manifest.json")).memorySyncSourceId).toBe(SOURCE_ID);

    // The peers recognize each other, both ways (each checks the other's pinned node ID).
    expect((await offer(alpha, ids.beta)).entries, "alpha → beta").not.toBeNull();
    expect((await offer(beta, ids.alpha)).entries, "beta → alpha").not.toBeNull();
    expect(await availability(alpha, ids.beta)).toMatchObject({ available: true });
    expect(await availability(beta, ids.alpha)).toMatchObject({ available: true });

    // Memory Sync continues with the same source: the hub knows it, and only the new file is sent, into the same import.
    expect((await gql(alpha, `mutation{ testMemoryHubConnection(input:{mode:SAVED}){ ok authenticated memorySyncSourceId } }`)).testMemoryHubConnection)
      .toEqual({ ok: true, authenticated: true, memorySyncSourceId: SOURCE_ID });
    seedSourceRun(alpha, "AFTER-UPGRADE", "raw_traces_after_upgrade.jsonl");
    const after = await sync(alpha);
    expect(after, "only the new file is changed: the source state carried over").toMatchObject({ committedBatches: 1, changedFiles: 1, deferredFiles: 0 });
    expect(fs.readdirSync(path.join(beta.dataDir, "memory", "imports")), "one import, the same folder").toEqual([SOURCE_ID]);
    expect(fs.readFileSync(path.join(pb.importDir, "agents", SOURCE_RUN, "raw_traces_after_upgrade.jsonl"), "utf-8")).toContain("AFTER-UPGRADE");
    expect(fs.readFileSync(path.join(pb.importDir, "agents", SOURCE_RUN, "raw_traces_active.jsonl"), "utf-8")).toContain("BEFORE-UPGRADE");
    expect(readJson(path.join(pb.importDir, "memory-sync-source.json"))).toMatchObject({ memorySyncSourceId: SOURCE_ID, lastSyncStatus: "success" });

    // A third start changes no stored file and makes no new backup.
    await Promise.all([stop(alpha), stop(beta)]);
    const settled = { alpha: storedState(alpha), beta: storedState(beta) };
    await Promise.all([start(alpha), start(beta)]);
    await sleep(1_000);
    expect(storedState(alpha)).toEqual(settled.alpha);
    expect(storedState(beta)).toEqual(settled.beta);
    expect((await status(alpha)).body.nodeId).toBe(ids.alpha);
    expect((await status(beta)).body.nodeId).toBe(ids.beta);
  }, 240_000);

  it("NV-02 a damaged identity file: 503 NODE_IDENTITY_NOT_MIGRATED, no new node ID, the file kept and named, peers refuse with that reason, the rest works; restored, the next start migrates it", async () => {
    const pb = paths(beta);
    await stop(beta);
    const good = readJson(pb.identity);
    fs.rmSync(pb.identity);
    writeText(pb.releasedIdentity, "{ \"serverInstanceId\": "); // a released file cut short
    const damaged = fs.readFileSync(pb.releasedIdentity);
    forgetMigrations(beta, [IDENTITY_MIGRATION]);
    await start(beta);

    const answer = await status(beta);
    expect(answer.status).toBe(503);
    expect(answer.body).toEqual({ code: "NODE_IDENTITY_NOT_MIGRATED", message: IDENTITY_TEXT });
    expect(fs.existsSync(pb.identity), "no new node ID is made").toBe(false);
    expect(fs.readFileSync(pb.releasedIdentity).equals(damaged), "the released file is untouched").toBe(true);
    expect(beta.logs.some((line) => line.includes(pb.releasedIdentity)), "a warning names the file").toBe(true);
    expect(migrationStatus(beta, IDENTITY_MIGRATION)).toBe("FAILED");

    // Each side refuses with the stated reason (alpha reads beta's status; beta has no node ID of its own to send).
    expect(await availability(alpha, ids.beta)).toMatchObject({ available: false, refusalCode: "NODE_IDENTITY_NOT_MIGRATED" });
    expect(await availability(beta, ids.alpha)).toMatchObject({ available: false, refusalCode: "NODE_IDENTITY_NOT_MIGRATED" });
    // The rest of beta works: its catalog, and its Memory Sync hub takes alpha's next sync.
    expect((await gqlRaw(beta, `{ agentDefinitions { id } }`)).errors).toBeUndefined();
    seedSourceRun(alpha, "WHILE-IDENTITY-HELD", "raw_traces_identity_held.jsonl");
    expect(await sync(alpha)).toMatchObject({ committedBatches: 1 });

    // Restored, the next start migrates it: the same node ID, and the peers work again.
    await stop(beta);
    writeJson(pb.releasedIdentity, { serverInstanceId: good.nodeId, createdAt: good.createdAt });
    await start(beta);
    expect((await status(beta)).body.nodeId).toBe(ids.beta);
    expect(migrationStatus(beta, IDENTITY_MIGRATION)).toBe("SUCCEEDED");
    expect(await availability(alpha, ids.beta)).toMatchObject({ available: true });
    expect(await availability(beta, ids.alpha)).toMatchObject({ available: true });
  }, 240_000);

  it("NV-03 damaged hub credentials: ingestion 503 MEMORY_SYNC_NOT_MIGRATED, reads refuse with the text, only local memory is listed, the files kept; restored, the next start migrates them and alpha syncs again", async () => {
    const pb = paths(beta);
    await stop(beta);
    toReleasedMemorySync(beta);
    const goodCredentials = fs.readFileSync(pb.credentials, "utf-8");
    writeText(pb.credentials, "[{ \"boundSourceNodeId\": ");
    const damaged = fs.readFileSync(pb.credentials, "utf-8");
    forgetMigrations(beta, [MEMORY_SYNC_MIGRATION]);
    await start(beta);

    const ingest = await fetch(`${beta.baseUrl}/rest/memory-sync/v1/batches`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(ingest.status).toBe(503);
    expect(await ingest.json()).toMatchObject({ error: "MEMORY_SYNC_NOT_MIGRATED" });
    const read = await gqlRaw(beta, `{ getMemorySyncStatus { hub { enabled } } }`);
    expect(read.errors?.map((error) => error.message)).toEqual([MEMORY_SYNC_TEXT]);
    const sources = (await gql(beta, `{ listMemoryExplorerSources { key type } }`)).listMemoryExplorerSources as Json[];
    expect(sources.map((source) => source.type), "only local memory").toEqual(["LOCAL"]);
    expect(fs.readFileSync(pb.credentials, "utf-8"), "the damaged file is untouched").toBe(damaged);
    expect(beta.logs.some((line) => line.includes(pb.credentials)), "a warning names the file").toBe(true);
    expect(migrationStatus(beta, MEMORY_SYNC_MIGRATION)).toBe("FAILED");
    // Alpha's sync is refused with the reason, and the peers still work.
    // (The source reports a refused batch in its result and its state, not as a GraphQL error.)
    seedSourceRun(alpha, "WHILE-HUB-HELD", "raw_traces_hub_held.jsonl");
    const refused = await gqlRaw(alpha, `mutation{ startMemorySync{ committedBatches } }`);
    const sourceState = (await gql(alpha, `{ getMemorySyncStatus { sourceState { jobState lastError } } }`)).getMemorySyncStatus.sourceState;
    expect(refused.data?.startMemorySync?.committedBatches ?? 0, `nothing is committed: ${JSON.stringify(refused)}`).toBe(0);
    expect(JSON.stringify({ refused, sourceState }), "the source states the hub's reason").toMatch(/MEMORY_SYNC_NOT_MIGRATED|waiting for its data migration|503/);
    expect(await availability(alpha, ids.beta)).toMatchObject({ available: true });

    // Restored, the next start migrates them, and alpha syncs again into the same import.
    await stop(beta);
    writeText(pb.credentials, goodCredentials);
    await start(beta);
    expect(migrationStatus(beta, MEMORY_SYNC_MIGRATION)).toBe("SUCCEEDED");
    expect((readJson(pb.credentials) as unknown as Json[]).map((record) => record.boundMemorySyncSourceId)).toEqual([SOURCE_ID]);
    seedSourceRun(alpha, "AFTER-RESTORE", "raw_traces_after_restore.jsonl");
    expect(await sync(alpha)).toMatchObject({ committedBatches: 1, deferredFiles: 0 });
    expect(fs.readdirSync(path.join(beta.dataDir, "memory", "imports"))).toEqual([SOURCE_ID]);
    const sourcesAfter = (await gql(beta, `{ listMemoryExplorerSources { key type } }`)).listMemoryExplorerSources as Json[];
    expect(sourcesAfter.map((source) => source.key)).toEqual(expect.arrayContaining(["local", `imported:${SOURCE_ID}`]));
  }, 240_000);
});
