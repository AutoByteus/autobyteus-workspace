// Context-file size limits on the built production server (autobyteus-workspace-6): the real `dist/app.js`, its real
// multipart registration, node-access gate and settings storage, over real HTTP. The in-process integration test
// (`tests/integration/api/rest/context-file-size-limits.integration.test.ts`) covers the policy with a hand-built Fastify
// app; this file covers what only the production composition shows.
//
// Cases (small limits through the settings, so the default run is cheap):
//   BS-01 limits from the environment at process start; at-limit accepted and one byte over refused (413, `maxBytes`),
//         for a video and for a document; nothing left on disk after a refusal (AC-001..003, REQ-001, REQ-004)
//   BS-02 `GET /rest/context-files/size-limits` for the owner credential and a paired phone credential; a forged
//         credential is refused; the phone credential uploads a video (QR-004)
//   BS-03 a setting changed through GraphQL applies to the next upload with no restart, in the answer of
//         `size-limits` and in the upload; an upload the earlier limit allowed is now refused (the limit lowered after
//         the client read it, AC-004, AC-006)
//   BS-04 invalid values are refused on save and change nothing (AC-004)
//   BS-05 an unsupported type is refused 415; a connection dropped mid-body leaves no file and the node still serves
//         (AC-008, QR-002)
//   BS-06 a large draft is read back whole, with the sent SHA-256, at its locator (finalize and the agent's path are
//         proven by the phone journey MSP-53, which sends the message)
//   BS-07 `/upload-file` still refuses above 25 MiB (AC-013)
// Gated: RUN_LARGE_CONTEXT_FILE_E2E=1 adds
//   BS-10 a video of LARGE_CONTEXT_FILE_E2E_MIB (default 1536) MiB under the default limits streams; the server's RSS
//         stays bounded (sampled every 50 ms), the stored file has the sent size and SHA-256; a video 1 MiB over
//         2 GiB is refused 413 with `maxBytes` 2147483648 and leaves nothing (AC-001, AC-015, QR-001). Needs ~4 GiB of
//         free disk under `tests/.tmp`; takes about a minute.
// Run (clean environment, built server current):
//   pnpm -C autobyteus-server-ts build
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts --no-watch
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from "../../../../test-support/live-e2e/test-runtime-bootstrap.mjs";

const MiB = 1024 * 1024;
const VIDEO_KEY = "AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB";
const OTHER_KEY = "AUTOBYTEUS_CONTEXT_FILE_OTHER_MAX_MB";
const boundary = "----built-limits-boundary";
const run = promisify(execFile);

type RunningServer = Awaited<ReturnType<typeof startBuiltTestServer>>;
type Outcome = { status: number | null; body: string; json: Record<string, any> | null };
type Target = { runtimeRoot: string; database: ReturnType<typeof resolveTestDatabaseLocation> };

const owned = new Set<Target>();
const makeTarget = (label: string): Target & { isolatedHome: string } => {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const runtimeRoot = path.join(testRuntimeRoot, `${label}-${suffix}`);
  const database = resolveTestDatabaseLocation(`file:./db/${label}-${suffix}.db`);
  const isolatedHome = path.join(runtimeRoot, "isolated-home");
  fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });
  const target = { runtimeRoot, database };
  owned.add(target);
  return { ...target, isolatedHome };
};

const start = async (label: string, environment: Record<string, string>) => {
  const target = makeTarget(label);
  const server = await startBuiltTestServer({
    runtimeRoot: target.runtimeRoot,
    databaseUrlOverride: target.database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: target.isolatedHome, ...environment }),
  });
  return { server, target };
};

const draftFiles = (runtimeRoot: string): string[] => {
  const root = path.join(runtimeRoot, "draft_context_files");
  const found: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    // A folder may disappear while it is read (the server removes an emptied draft folder).
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full); else found.push(full);
    }
  };
  walk(root);
  return found;
};

const head = (owner: string, filename: string, type: string) => Buffer.from(
  `--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${owner}\r\n` +
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`);
const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

/** Streams a multipart body of `bytes` file bytes over real HTTP; `abortAfter` destroys the socket mid-body. */
const streamUpload = (port: number, opts: {
  urlPath?: string; bytes: number; filename?: string; type?: string; owner?: object; headers?: Record<string, string>;
  abortAfter?: number; hash?: boolean; fieldName?: string;
}) => new Promise<Outcome & { sha256: string | null }>((resolve) => {
  const h = head(JSON.stringify(opts.owner ?? { kind: "agent_draft", draftRunId: "bs-run" }), opts.filename ?? "clip.mp4", opts.type ?? "video/mp4");
  const hasher = opts.hash ? createHash("sha256") : null;
  const req = http.request({
    port, host: "127.0.0.1", path: opts.urlPath ?? "/rest/context-files/upload", method: "POST",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": h.length + opts.bytes + tail.length, ...opts.headers },
  }, (res) => {
    let body = ""; res.on("data", (c) => { body += c; });
    res.on("end", () => resolve({ status: res.statusCode ?? null, body, json: body.startsWith("{") ? JSON.parse(body) : null, sha256: hasher ? hasher.digest("hex") : null }));
  });
  req.on("error", () => resolve({ status: null, body: "", json: null, sha256: null }));
  // The file bytes follow a fixed pattern, so a hash of what was sent needs no file on disk.
  const chunk = Buffer.alloc(MiB); for (let i = 0; i < MiB; i += 1) chunk[i] = (i * 31 + 7) & 0xff;
  let sent = 0;
  const pump = () => {
    if (sent === 0) req.write(h);
    while (sent < opts.bytes) {
      if (opts.abortAfter !== undefined && sent >= opts.abortAfter) { req.destroy(); return; }
      const n = Math.min(MiB, opts.bytes - sent); sent += n;
      const part = n === MiB ? chunk : chunk.subarray(0, n);
      hasher?.update(part);
      if (!req.write(part)) { req.once("drain", pump); return; }
    }
    req.end(tail);
  };
  pump();
});

const getJson = async (url: string, headers: Record<string, string> = {}) => {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: response.status, json };
};

const setSetting = async (url: string, key: string, value: string) =>
  (await executeGraphql<{ updateServerSetting: string }>(url,
    `mutation($key:String!,$value:String!){ updateServerSetting(key:$key,value:$value) }`, { key, value })).updateServerSetting;

const pairPhone = async (server: RunningServer): Promise<string> => {
  const base = `http://127.0.0.1:${server.port}`;
  const json = { "content-type": "application/json" };
  const enabled = await fetch(`${base}/rest/remote-access/settings`, { method: "PUT", headers: json, body: JSON.stringify({ phoneAccessEnabled: true }) });
  expect(enabled.status).toBe(200);
  const serverBaseUrl = `http://192.168.77.10:${server.port}`;
  const session = await (await fetch(`${base}/rest/remote-access/pairing-sessions`, { method: "POST", headers: json,
    body: JSON.stringify({ connectionWay: "local_network", serverBaseUrl, trustedPrivateHttpAcknowledged: true }) })).json() as any;
  const exchange = await (await fetch(`${base}/rest/remote-access/pairing-exchanges`, { method: "POST", headers: json,
    body: JSON.stringify({ pairingCode: session.payload?.pairingCode, deviceName: "size-limit phone", serverBaseUrl }) })).json() as any;
  const credential = exchange.credential ?? exchange.accessToken ?? exchange.token;
  expect(typeof credential).toBe("string");
  return credential as string;
};

describe("context-file size limits on the built server (small limits)", () => {
  let server: RunningServer;
  let target: Target;
  let url: string;

  beforeAll(async () => {
    ({ server, target } = await start("ctx-limits", { [VIDEO_KEY]: "8", [OTHER_KEY]: "2" }));
    url = `http://127.0.0.1:${server.port}`;
  }, 180_000);

  afterAll(async () => {
    await server?.stop();
    for (const t of owned) await removeOwnedTestRuntime(t.runtimeRoot, t.database);
    owned.clear();
  }, 60_000);

  it("BS-01: the limits come from the environment; at the limit is accepted and one byte over is refused with the limit in bytes", async () => {
    const limits = await getJson(`${url}/rest/context-files/size-limits`);
    expect(limits.status).toBe(200);
    expect(limits.json).toMatchObject({ otherFileMaxBytes: 2 * MiB, audioVideoMaxBytes: 8 * MiB });
    expect(limits.json.audioVideoMimeTypes).toContain("video/mp4");

    const atLimit = await streamUpload(server.port, { bytes: 8 * MiB });
    expect(atLimit.status).toBe(200);
    expect(atLimit.json).toMatchObject({ phase: "draft", displayName: "clip.mp4" });
    const stored = draftFiles(target.runtimeRoot);
    expect(stored).toHaveLength(1);
    expect(fs.statSync(stored[0]!).size).toBe(8 * MiB);
    for (const file of stored) fs.rmSync(file);

    const videoOver = await streamUpload(server.port, { bytes: 8 * MiB + 1 });
    expect(videoOver.status).toBe(413);
    expect(videoOver.json).toMatchObject({ code: "CONTEXT_FILE_TOO_LARGE", maxBytes: 8 * MiB });
    const pdf = await streamUpload(server.port, { bytes: 2 * MiB, filename: "spec.pdf", type: "application/pdf" });
    expect(pdf.status).toBe(200);
    for (const file of draftFiles(target.runtimeRoot)) fs.rmSync(file);
    const pdfOver = await streamUpload(server.port, { bytes: 2 * MiB + 1, filename: "spec.pdf", type: "application/pdf" });
    expect(pdfOver.status).toBe(413);
    expect(pdfOver.json).toMatchObject({ code: "CONTEXT_FILE_TOO_LARGE", maxBytes: 2 * MiB });
    expect(draftFiles(target.runtimeRoot)).toEqual([]);
  }, 60_000);

  it("BS-02: the owner and a paired phone read the limits and upload; a forged credential is refused", async () => {
    const phone = await pairPhone(server);
    const phoneHeaders = { authorization: `Bearer ${phone}` };
    const asPhone = await getJson(`${url}/rest/context-files/size-limits`, phoneHeaders);
    expect(asPhone.status).toBe(200);
    expect(asPhone.json).toMatchObject({ otherFileMaxBytes: 2 * MiB, audioVideoMaxBytes: 8 * MiB });
    const forged = await getJson(`${url}/rest/context-files/size-limits`, { authorization: `Bearer ${phone.slice(0, -4)}xxxx` });
    expect([401, 403]).toContain(forged.status);
    const upload = await streamUpload(server.port, { bytes: 3 * MiB, headers: phoneHeaders });
    expect(upload.status).toBe(200);
    const over = await streamUpload(server.port, { bytes: 8 * MiB + 1, headers: phoneHeaders });
    expect(over.status).toBe(413);
    for (const file of draftFiles(target.runtimeRoot)) fs.rmSync(file);
  }, 60_000);

  it("BS-04: invalid values are refused on save and change nothing", async () => {
    for (const bad of ["0", "abc", "10241", "-5", "1.5"]) {
      const message = await setSetting(url, VIDEO_KEY, bad);
      expect(message.toLowerCase(), `value ${bad}`).toMatch(/must be|invalid|whole number/);
    }
    expect((await getJson(`${url}/rest/context-files/size-limits`)).json.audioVideoMaxBytes).toBe(8 * MiB);
    expect(await setSetting(url, OTHER_KEY, "1025")).toMatch(/must be|invalid|whole number/i);
    expect((await getJson(`${url}/rest/context-files/size-limits`)).json.otherFileMaxBytes).toBe(2 * MiB);
  }, 60_000);

  it("BS-05: an unsupported type is refused 415; a dropped connection leaves no file and the node keeps serving", async () => {
    const unsupported = await streamUpload(server.port, { bytes: 1024, filename: "tool.exe", type: "application/x-msdownload" });
    expect(unsupported.status).toBe(415);
    expect(unsupported.json).toMatchObject({ code: "CONTEXT_FILE_TYPE_UNSUPPORTED" });
    const dropped = await streamUpload(server.port, { bytes: 8 * MiB, abortAfter: 3 * MiB });
    expect(dropped.status).toBeNull();
    // The server notices the closed socket asynchronously.
    const deadline = Date.now() + 10_000;
    while (draftFiles(target.runtimeRoot).length > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    expect(draftFiles(target.runtimeRoot)).toEqual([]);
    expect((await getJson(`${url}/rest/health`)).status).toBe(200);
  }, 60_000);

  it("BS-06: a large draft is read back whole at its locator", async () => {
    const upload = await streamUpload(server.port, { bytes: 6 * MiB, filename: "final.mp4", hash: true });
    expect(upload.status).toBe(200);
    const read = await fetch(`${url}${upload.json!.locator}`);
    expect(read.status).toBe(200);
    const bytes = Buffer.from(await read.arrayBuffer());
    expect(bytes.length).toBe(6 * MiB);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(upload.sha256);
    for (const file of draftFiles(target.runtimeRoot)) fs.rmSync(file);
  }, 60_000);

  it("BS-03: a setting changed through GraphQL applies to the next upload with no restart", async () => {
    const before = await streamUpload(server.port, { bytes: 8 * MiB });
    expect(before.status).toBe(200);
    for (const file of draftFiles(target.runtimeRoot)) fs.rmSync(file);
    expect(await setSetting(url, VIDEO_KEY, "4")).toMatch(/updated|saved|success/i);
    const limits = await getJson(`${url}/rest/context-files/size-limits`);
    expect(limits.json.audioVideoMaxBytes).toBe(4 * MiB);
    const after = await streamUpload(server.port, { bytes: 8 * MiB });
    expect(after.status).toBe(413);
    expect(after.json).toMatchObject({ code: "CONTEXT_FILE_TOO_LARGE", maxBytes: 4 * MiB });
    expect(draftFiles(target.runtimeRoot)).toEqual([]);
    const fits = await streamUpload(server.port, { bytes: 4 * MiB });
    expect(fits.status).toBe(200);
    for (const file of draftFiles(target.runtimeRoot)) fs.rmSync(file);
    await setSetting(url, VIDEO_KEY, "30");
    expect((await getJson(`${url}/rest/context-files/size-limits`)).json.audioVideoMaxBytes).toBe(30 * MiB);
  }, 60_000);

  it("BS-07: /upload-file still refuses above 25 MiB", async () => {
    const over = await streamUpload(server.port, { urlPath: "/rest/upload-file", bytes: 26 * MiB, filename: "avatar.png", type: "image/png" });
    expect(over.status).toBe(413);
    const ok = await streamUpload(server.port, { urlPath: "/rest/upload-file", bytes: 1 * MiB, filename: "avatar.png", type: "image/png" });
    expect(ok.status).toBe(200);
  }, 60_000);
});

describe.skipIf(!process.env.RUN_LARGE_CONTEXT_FILE_E2E)("context-file size limits on the built server (default limits, large bodies)", () => {
  let server: RunningServer;
  let target: Target;
  const largeMiB = Number(process.env.LARGE_CONTEXT_FILE_E2E_MIB ?? "1536");

  beforeAll(async () => {
    ({ server, target } = await start("ctx-large", {}));
  }, 180_000);

  afterAll(async () => {
    await server?.stop();
    for (const t of owned) await removeOwnedTestRuntime(t.runtimeRoot, t.database);
    owned.clear();
  }, 120_000);

  const sampleRss = (pid: number) => {
    const samples: number[] = [];
    const timer = setInterval(() => {
      run("ps", ["-o", "rss=", "-p", String(pid)]).then(({ stdout }) => { const kb = Number(stdout.trim()); if (kb > 0) samples.push(kb * 1024); }, () => undefined);
    }, 50);
    return { samples, stop: () => clearInterval(timer) };
  };

  it("BS-10: a large video streams within bounded memory and is stored whole; a video over 2 GiB is refused and leaves nothing", async () => {
    const limits = await getJson(`http://127.0.0.1:${server.port}/rest/context-files/size-limits`);
    expect(limits.json.audioVideoMaxBytes).toBe(2048 * MiB);
    const pid = server.child.pid!;
    const baseline = Number((await run("ps", ["-o", "rss=", "-p", String(pid)])).stdout.trim()) * 1024;
    const rss = sampleRss(pid);
    const accepted = await streamUpload(server.port, { bytes: largeMiB * MiB, filename: "large.mp4", hash: true });
    rss.stop();
    expect(accepted.status).toBe(200);
    const stored = draftFiles(target.runtimeRoot);
    expect(stored).toHaveLength(1);
    expect(fs.statSync(stored[0]!).size).toBe(largeMiB * MiB);
    const storedHash = createHash("sha256");
    await new Promise<void>((resolve, reject) => fs.createReadStream(stored[0]!).on("data", (d) => storedHash.update(d)).on("end", () => resolve()).on("error", reject));
    expect(storedHash.digest("hex")).toBe(accepted.sha256);
    const peak = Math.max(...rss.samples, baseline);
    console.info(`BS-10 accepted ${largeMiB} MiB: server RSS baseline ${(baseline / MiB).toFixed(0)} MiB, peak ${(peak / MiB).toFixed(0)} MiB over ${rss.samples.length} samples`);
    expect(rss.samples.length).toBeGreaterThan(3);
    expect(peak - baseline).toBeLessThan(400 * MiB);
    fs.rmSync(stored[0]!);

    const rssOver = sampleRss(pid);
    const over = await streamUpload(server.port, { bytes: 2048 * MiB + MiB, filename: "toolarge.mp4" });
    rssOver.stop();
    expect(over.status).toBe(413);
    expect(over.json).toMatchObject({ code: "CONTEXT_FILE_TOO_LARGE", maxBytes: 2048 * MiB });
    expect(draftFiles(target.runtimeRoot)).toEqual([]);
    const peakOver = Math.max(...rssOver.samples, baseline);
    console.info(`BS-10 refused 2 GiB + 1 MiB: server RSS peak ${(peakOver / MiB).toFixed(0)} MiB`);
    expect(peakOver - baseline).toBeLessThan(400 * MiB);
    expect((await getJson(`http://127.0.0.1:${server.port}/rest/health`)).status).toBe(200);
  }, 900_000);
});
