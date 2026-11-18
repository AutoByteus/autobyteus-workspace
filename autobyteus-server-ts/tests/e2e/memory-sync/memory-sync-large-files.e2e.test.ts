import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";
import { execFileSync, spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";

/**
 * Large files through Memory Sync between two real built server processes (autobyteus-workspace-7): a source node
 * syncs files above the batch limit to a hub of the same build, through a counting proxy that can also cut the
 * connection or corrupt a piece, as a bad network or disk would.
 */

const require = createRequire(import.meta.url);
const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");
const memorySyncSourceId = "large-file-source";

type ServerProcess = {
  name: string;
  port: number;
  baseUrl: string;
  dataDir: string;
  child: ChildProcessByStdio<null, Readable, Readable>;
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
  execFileSync(process.execPath, [path.join(serverRoot, "scripts", "copy-build-assets.mjs")], {
    cwd: serverRoot,
    stdio: "inherit",
  });
};

const startServerProcess = async (name: string, rootDir: string, logLevel = "ERROR"): Promise<ServerProcess> => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dataDir = path.join(rootDir, name);
  fs.mkdirSync(dataDir, { recursive: true });
  writeText(path.join(dataDir, ".env"), [
    `AUTOBYTEUS_SERVER_HOST=${baseUrl}`,
    "APP_ENV=test",
    `LOG_LEVEL=${logLevel}`,
    "HTTP_ACCESS_LOG_MODE=off",
    "",
  ].join("\n"));

  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DATABASE_URL_TEST;
  delete env.AUTOBYTEUS_MEMORY_DIR;
  env.AUTOBYTEUS_SERVER_HOST = baseUrl;
  env.APP_ENV = "test";
  env.LOG_LEVEL = logLevel;
  env.HTTP_ACCESS_LOG_MODE = "off";

  const child = spawn(process.execPath, [
    appEntry,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--data-dir", dataDir,
  ], {
    cwd: serverRoot,
    env: { ...env, ...builtServerLaunchEnvironment() },
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

const MiB = 1024 * 1024;

const sha256File = (filePath: string): string => createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

type ProxiedRequest = { method: string; url: string; bytes: number };

/**
 * Stands between the source and the hub: relays every request, records it, and on command cuts the connection after
 * some pieces or corrupts the pieces of one file, as a bad network or disk would.
 */
const startProxy = async (hubBaseUrl: string) => {
  const requests: ProxiedRequest[] = [];
  const control = { cutAfterPieces: null as number | null, piecesSeen: 0, corruptSha: null as string | null };
  const server = http.createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    let body = Buffer.concat(chunks);
    const method = request.method ?? "GET";
    const url = request.url ?? "/";
    requests.push({ method, url, bytes: body.byteLength });
    if (method === "PUT") {
      control.piecesSeen += 1;
      if (control.cutAfterPieces !== null && control.piecesSeen > control.cutAfterPieces) {
        request.socket.destroy();
        return;
      }
      if (control.corruptSha && url.includes(control.corruptSha)) {
        body = Buffer.from(body);
        body[0] = (body[0] ?? 0) ^ 0xff;
      }
    }
    const upstream = await fetch(`${hubBaseUrl}${url}`, {
      method,
      headers: {
        authorization: String(request.headers.authorization ?? ""),
        ...(request.headers["content-type"] ? { "content-type": String(request.headers["content-type"]) } : {}),
      },
      body: method === "GET" || method === "HEAD" ? undefined : body,
    });
    response.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  });
  const port = await getFreePort();
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    control,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
};

type RunResult = { scannedFiles: number; changedFiles: number; committedBatches: number; deferredFiles: number; failedFiles: number };
type SourceState = {
  jobState: string;
  lastError: string | null;
  fileFailureCount: number;
  fileFailures: Array<{ kind: string; relativePath: string; size: number; reason: string; attempts: number; nextAttemptAt: string }>;
};

describe("Memory Sync large files between two real servers", () => {
  let tempRoot: string;
  let hub: ServerProcess;
  let source: ServerProcess;
  let proxy: Awaited<ReturnType<typeof startProxy>>;
  let sourceMemoryDir: string;
  let hubImportRoot: string;
  let hubStagingRoot: string;

  const sourceFile = (...segments: string[]) => path.join(sourceMemoryDir, "agents", ...segments);
  const importedFile = (...segments: string[]) => path.join(hubImportRoot, "agents", ...segments);
  const writeRandom = (filePath: string, size: number): Buffer => {
    const content = randomBytes(size);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    return content;
  };
  const sync = async (): Promise<RunResult> => (await graphql<{ startMemorySync: RunResult }>(source, `
    mutation { startMemorySync { scannedFiles changedFiles committedBatches deferredFiles failedFiles } }`)).startMemorySync;
  const sourceState = async (): Promise<SourceState> => (await graphql<{ getMemorySyncStatus: { sourceState: SourceState } }>(source, `
    { getMemorySyncStatus { sourceState { jobState lastError fileFailureCount fileFailures { kind relativePath size reason attempts nextAttemptAt } } } }`))
    .getMemorySyncStatus.sourceState;
  const hubManifestKeys = (): string[] => Object.keys(
    JSON.parse(fs.readFileSync(path.join(hubImportRoot, "sync-manifest.json"), "utf-8")).files as Record<string, unknown>,
  );
  const piecePuts = () => proxy.requests.filter((request) => request.method === "PUT");

  beforeAll(async () => {
    prepareServerDist();
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-sync-large-"));
    hub = await startServerProcess("hub", tempRoot);
    // The source runs at WARN: the owner log line for a file problem is a warning.
    source = await startServerProcess("source", tempRoot, "WARN");
    proxy = await startProxy(hub.baseUrl);
    sourceMemoryDir = path.join(source.dataDir, "memory");
    hubImportRoot = path.join(hub.dataDir, "memory", "imports", memorySyncSourceId);
    hubStagingRoot = path.join(hub.dataDir, "memory", "memory-sync-staging", memorySyncSourceId);

    const enabled = await graphql<{ updateMemoryHubConfig: { oneTimePlaintextToken: string | null } }>(hub, `
      mutation EnableHub($input: UpdateMemoryHubConfigInput!) {
        updateMemoryHubConfig(input: $input) { oneTimePlaintextToken }
      }`, { input: { enabled: true, advertisedHubBaseUrl: hub.baseUrl } });
    await graphql(source, `
      mutation ConfigureSource($input: UpdateMemorySyncSourceConfigInput!) {
        updateMemorySyncSourceConfig(input: $input) { source { enabled } }
      }`, { input: {
      enabled: true, memorySyncSourceId, displayName: "large files", hubBaseUrl: proxy.baseUrl,
      hubToken: enabled.updateMemoryHubConfig.oneTimePlaintextToken ?? "", backgroundEnabled: false, batchSize: 25,
    } });
  }, 240_000);

  afterAll(async () => {
    await Promise.all([stopServer(source), stopServer(hub)]);
    await proxy?.close();
    if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  }, 60_000);

  it("syncs a 40 MiB attachment, two 20 MiB files and many small files in one run, every request within the limits (AC-001, AC-002)", async () => {
    const video = writeRandom(sourceFile("run-b", "context_files", "video.mp4"), 40 * MiB);
    writeRandom(sourceFile("run-d", "context_files", "a.mp4"), 20 * MiB);
    writeRandom(sourceFile("run-d", "context_files", "b.mp4"), 20 * MiB);
    writeText(sourceFile("run-c", "raw_traces_active.jsonl"), "{\"later\":true}\n");
    for (let index = 0; index < 6; index += 1) writeRandom(sourceFile("run-e", `chunk-${index}.bin`), 5 * MiB);
    const requestsBefore = proxy.requests.length;

    const result = await sync();

    expect(result).toMatchObject({ changedFiles: 10, failedFiles: 0, deferredFiles: 0 });
    expect(result.committedBatches).toBeGreaterThanOrEqual(2);
    expect(sha256File(importedFile("run-b", "context_files", "video.mp4"))).toBe(createHash("sha256").update(video).digest("hex"));
    for (const relative of [["run-d", "context_files", "a.mp4"], ["run-d", "context_files", "b.mp4"]]) {
      expect(sha256File(importedFile(...relative))).toBe(sha256File(sourceFile(...relative)));
    }
    for (let index = 0; index < 6; index += 1) {
      expect(sha256File(importedFile("run-e", `chunk-${index}.bin`))).toBe(sha256File(sourceFile("run-e", `chunk-${index}.bin`)));
    }
    expect(fs.readFileSync(importedFile("run-c", "raw_traces_active.jsonl"), "utf-8")).toBe("{\"later\":true}\n");
    const sent = proxy.requests.slice(requestsBefore);
    expect(Math.max(...sent.map((request) => request.bytes))).toBeLessThan(50 * MiB);
    expect(Math.max(...sent.filter((request) => request.method === "PUT").map((request) => request.bytes))).toBeLessThanOrEqual(8 * MiB);
    expect(sent.filter((request) => request.method === "POST").length).toBe(result.committedBatches);
    expect(await sourceState()).toMatchObject({ jobState: "success", fileFailureCount: 0, fileFailures: [] });
    expect(fs.readdirSync(hubStagingRoot)).toEqual([]);

    // Nothing changed: the next run reads and sends nothing.
    const requestsAfterFirst = proxy.requests.length;
    expect(await sync()).toMatchObject({ changedFiles: 0, committedBatches: 0, failedFiles: 0 });
    expect(proxy.requests.length).toBe(requestsAfterFirst);
  }, 240_000);

  it("imports the same attachment under two runs and uploads its content once (AR-001)", async () => {
    const video = writeRandom(sourceFile("run-f1", "context_files", "same.mp4"), 20 * MiB);
    fs.mkdirSync(sourceFile("run-f2", "context_files"), { recursive: true });
    fs.writeFileSync(sourceFile("run-f2", "context_files", "same.mp4"), video);
    const requestsBefore = proxy.requests.length;

    const result = await sync();

    expect(result).toMatchObject({ changedFiles: 2, failedFiles: 0 });
    expect(sha256File(importedFile("run-f1", "context_files", "same.mp4"))).toBe(sha256File(sourceFile("run-f1", "context_files", "same.mp4")));
    expect(sha256File(importedFile("run-f2", "context_files", "same.mp4"))).toBe(sha256File(sourceFile("run-f1", "context_files", "same.mp4")));
    expect(hubManifestKeys()).toEqual(expect.arrayContaining(["agents/run-f1/context_files/same.mp4", "agents/run-f2/context_files/same.mp4"]));
    const puts = proxy.requests.slice(requestsBefore).filter((request) => request.method === "PUT");
    expect(puts.map((request) => request.bytes)).toEqual([8 * MiB, 8 * MiB, 4 * MiB]);
  }, 240_000);

  it("resumes an interrupted upload from what the hub holds, and shows nothing partial in the imports (AC-005, AC-009)", async () => {
    const content = writeRandom(sourceFile("run-g", "context_files", "long.mp4"), 20 * MiB);
    const sha = createHash("sha256").update(content).digest("hex");
    proxy.control.piecesSeen = 0;
    proxy.control.cutAfterPieces = 1;

    await expect(sync()).rejects.toThrow();

    expect(await sourceState()).toMatchObject({ jobState: "error", fileFailureCount: 0 });
    expect(fs.statSync(path.join(hubStagingRoot, `${sha}.partial`)).size).toBe(8 * MiB);
    expect(fs.existsSync(importedFile("run-g", "context_files", "long.mp4"))).toBe(false);
    expect(hubManifestKeys()).not.toContain("agents/run-g/context_files/long.mp4");

    proxy.control.cutAfterPieces = null;
    const requestsBefore = proxy.requests.length;
    const result = await sync();

    expect(result).toMatchObject({ changedFiles: 1, failedFiles: 0 });
    const resumedPuts = proxy.requests.slice(requestsBefore).filter((request) => request.method === "PUT");
    expect(resumedPuts.map((request) => request.url.match(/offset=(\d+)/)?.[1])).toEqual([String(8 * MiB), String(16 * MiB)]);
    expect(sha256File(importedFile("run-g", "context_files", "long.mp4"))).toBe(sha);
    expect(fs.existsSync(path.join(hubStagingRoot, `${sha}.partial`))).toBe(false);
  }, 240_000);

  it("keeps syncing the other files when the hub refuses one, lists it with its reason, and retries it on Sync now (AC-004, AC-010)", async () => {
    const bad = writeRandom(sourceFile("run-h", "context_files", "bad.mp4"), 20 * MiB);
    writeRandom(sourceFile("run-h", "context_files", "good.mp4"), 20 * MiB);
    writeText(sourceFile("run-h", "raw_traces_active.jsonl"), "{\"trace\":1}\n");
    proxy.control.corruptSha = createHash("sha256").update(bad).digest("hex");

    const first = await sync();

    expect(first).toMatchObject({ changedFiles: 3, failedFiles: 1 });
    expect(sha256File(importedFile("run-h", "context_files", "good.mp4"))).toBe(sha256File(sourceFile("run-h", "context_files", "good.mp4")));
    expect(fs.existsSync(importedFile("run-h", "raw_traces_active.jsonl"))).toBe(true);
    expect(fs.existsSync(importedFile("run-h", "context_files", "bad.mp4"))).toBe(false);
    const state = await sourceState();
    expect(state).toMatchObject({ jobState: "success", fileFailureCount: 1 });
    expect(state.fileFailures[0]).toMatchObject({ kind: "agents", relativePath: "run-h/context_files/bad.mp4", size: 20 * MiB, attempts: 1 });
    expect(state.fileFailures[0]?.reason).toContain("Uploaded file hash mismatch for agents/run-h/context_files/bad.mp4");
    await sleep(500);
    expect(
      source.logs.filter((line) => line.includes("Memory Sync could not sync agents/run-h/context_files/bad.mp4")),
      source.logs.slice(-15).join("\n"),
    ).toHaveLength(1);

    proxy.control.corruptSha = null;
    const second = await sync();

    expect(second).toMatchObject({ changedFiles: 1, failedFiles: 0 });
    expect(sha256File(importedFile("run-h", "context_files", "bad.mp4"))).toBe(sha256File(sourceFile("run-h", "context_files", "bad.mp4")));
    expect(await sourceState()).toMatchObject({ fileFailureCount: 0, fileFailures: [] });
  }, 240_000);
});
