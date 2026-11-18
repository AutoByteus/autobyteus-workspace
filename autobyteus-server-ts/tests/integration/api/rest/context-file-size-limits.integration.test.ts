// Context-file upload limits over real HTTP (autobyteus-workspace-6): per-type limits, typed refusals, the size-limits
// read, the writer's drain of an over-limit file, and cleanup after refusal and abort.
// The multipart plugin is registered without limits, as `build-studio-server.ts` does; each route passes its own.
// Cases: P1 (26 MiB video accepted by default), AC-002/003 at-limit and one-over for both file kinds on both read paths
// (multipart truncation and the writer's drain), setting override without restart (AC-004), the 415 refusal, owner-field
// errors, abort (P3), memory (AC-015), the Project Task route mapping (AC-012), `/upload-file` unchanged (AC-013).
// Every refusal case also closes the app within a few seconds: an undrained refusal keeps the connection busy (P4, AR-007/AR-008).
// Run: pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/rest/context-file-size-limits.integration.test.ts --no-watch
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ root: "", settings: new Map<string, string>() }));
vi.mock("../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: { config: {
    getAppDataDir: (): string => state.root,
    getMemoryDir: (): string => `${state.root}/memory`,
    getBaseUrl: (): string => "http://localhost:8000",
    get: (key: string): string | undefined => state.settings.get(key),
  } },
}));

const projectTaskUploads = vi.hoisted(() => ({ dir: "" }));
vi.mock("../../../../src/projects/services/project-task-context-drafts.js", async () => {
  const { writeContextFileUpload } = await import("../../../../src/context-files/services/context-file-upload-writer.js");
  const { buildStoredFilename } = await import("../../../../src/context-files/domain/context-file-upload-policy.js");
  const nodePath = await import("node:path");
  // The route's collaborator, replaced by the same writer the real store calls; the store is covered by its unit tests.
  return { getProjectTaskContextDrafts: () => ({
    uploadContextFile: async (_p: string, _d: string, file: { filename: string; mimetype: string }, limits: unknown) =>
      writeContextFileUpload(file as never, nodePath.join(projectTaskUploads.dir, buildStoredFilename(file.filename, file.mimetype)), limits as never)
        .then((sizeBytes) => ({ sizeBytes })),
  }) };
});

import { registerContextFileRoutes } from "../../../../src/api/rest/context-files.js";
import { noDelegations } from "../../../helpers/no-delegations.js";
import { registerProjectTaskContextRoutes } from "../../../../src/api/rest/project-task-context-files.js";
import {
  CONTEXT_FILE_AUDIO_VIDEO_MAX_MB_SETTING_KEY, CONTEXT_FILE_OTHER_MAX_MB_SETTING_KEY,
} from "../../../../src/config/context-file-size-limit-settings.js";
import { MiB } from "../../../helpers/context-file-size-limits.js";

const boundary = "----limits-boundary";
const draftOwner = { kind: "agent_draft", draftRunId: "draft-limits" };
const head = (owner: string | null, filename: string, type: string) => Buffer.from(
  (owner === null ? "" : `--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${owner}\r\n`) +
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`);
const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

type Outcome = { status: number | null; body: string; json: Record<string, unknown> | null };
/** Streams a multipart body of `bytes` file bytes over real HTTP; `abortAfter` destroys the socket mid-body. */
const streamUpload = (port: number, urlPath: string, opts: {
  bytes: number; filename?: string; type?: string; owner?: string | null; abortAfter?: number;
}) => new Promise<Outcome>((resolve) => {
  const h = head(opts.owner === undefined ? JSON.stringify(draftOwner) : opts.owner, opts.filename ?? "clip.mp4", opts.type ?? "video/mp4");
  const req = http.request({ port, path: urlPath, method: "POST", headers: {
    "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": h.length + opts.bytes + tail.length,
  } }, (res) => {
    let body = ""; res.on("data", (c) => { body += c; });
    res.on("end", () => resolve({ status: res.statusCode ?? null, body, json: body.startsWith("{") ? JSON.parse(body) : null }));
  });
  req.on("error", () => resolve({ status: null, body: "", json: null }));
  const chunk = Buffer.alloc(MiB, 7);
  let sent = 0;
  const pump = () => {
    if (sent === 0) req.write(h);
    while (sent < opts.bytes) {
      if (opts.abortAfter !== undefined && sent >= opts.abortAfter) { req.destroy(); return; }
      const n = Math.min(MiB, opts.bytes - sent); sent += n;
      if (!req.write(n === MiB ? chunk : chunk.subarray(0, n))) { req.once("drain", pump); return; }
    }
    req.end(tail);
  };
  pump();
});

const filesUnder = (dir: string): string[] => fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name)) : [];

describe("context-file upload limits over real HTTP", () => {
  let tempDir: string; let app: FastifyInstance; let port: number;
  const draftFiles = () => filesUnder(tempDir);
  const upload = (opts: Parameters<typeof streamUpload>[2]) => streamUpload(port, "/rest/context-files/upload", opts);
  /** The server must be able to close right after a refusal: no request is left unread (P4). */
  const expectPromptClose = async () => {
    const closed = await Promise.race([app.close().then(() => "closed"), new Promise((r) => setTimeout(() => r("close-timeout"), 4000))]);
    expect(closed).toBe("closed");
  };
  const set = (audioVideoMb?: number, otherMb?: number) => {
    state.settings.clear();
    if (audioVideoMb !== undefined) state.settings.set(CONTEXT_FILE_AUDIO_VIDEO_MAX_MB_SETTING_KEY, String(audioVideoMb));
    if (otherMb !== undefined) state.settings.set(CONTEXT_FILE_OTHER_MAX_MB_SETTING_KEY, String(otherMb));
  };

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "context-file-limits-"));
    state.root = tempDir; state.settings.clear(); projectTaskUploads.dir = path.join(tempDir, "task-uploads");
    fs.mkdirSync(projectTaskUploads.dir);
    app = fastify();
    await app.register(multipart);
    // The route takes the node's DelegationIndex (autobyteus-461).
    await app.register((scope) => registerContextFileRoutes(scope), { prefix: "/rest" });
    await app.register(registerProjectTaskContextRoutes, { prefix: "/rest" });
    await app.listen({ port: 0 }); port = (app.server.address() as { port: number }).port;
  });
  afterEach(async () => { await app.close().catch(() => undefined); fs.rmSync(tempDir, { recursive: true, force: true }); });

  it("P1: a 26 MiB video is accepted with the default limits and stored whole (AC-001, AC-002)", async () => {
    const result = await upload({ bytes: 26 * MiB });
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ phase: "draft", displayName: "clip.mp4" });
    expect(draftFiles().map((f) => fs.statSync(f).size)).toEqual([26 * MiB]);
  }, 60_000);

  it("a 26 MiB document is refused with 413 CONTEXT_FILE_TOO_LARGE and the 25 MiB limit, nothing left, closes promptly (AC-003, P4/P5)", async () => {
    const result = await upload({ bytes: 26 * MiB, filename: "report.pdf", type: "application/pdf" });
    expect(result.status).toBe(413);
    expect(result.json).toEqual({ code: "CONTEXT_FILE_TOO_LARGE", detail: "Uploaded file is too large.", maxBytes: 25 * MiB });
    expect(draftFiles()).toEqual([]);
    await expectPromptClose();
  }, 60_000);

  it.each([
    ["video, multipart-truncation path (audio/video limit is the cap)", { type: "video/mp4", filename: "a.mp4" }, 2, 1],
    ["audio, multipart-truncation path", { type: "audio/mpeg", filename: "a.mp3" }, 2, 1],
    ["image over the other-file limit, writer-drain path (audio/video limit is the cap)", { type: "image/png", filename: "a.png" }, 4, 2],
    ["document over the other-file limit, writer-drain path", { type: "application/pdf", filename: "a.pdf" }, 4, 2],
  ])("%s: accepts exactly its limit and refuses one byte more, naming the limit (AC-002, AC-003)", async (_name, file, audioVideoMb, otherMb) => {
    set(audioVideoMb, otherMb);
    const limitMb = file.type.startsWith("video/") || file.type.startsWith("audio/") ? audioVideoMb : otherMb;
    expect((await upload({ bytes: limitMb * MiB, ...file })).status).toBe(200);
    fs.rmSync(tempDir, { recursive: true, force: true }); fs.mkdirSync(projectTaskUploads.dir, { recursive: true });
    const over = await upload({ bytes: limitMb * MiB + 1, ...file });
    expect(over.status).toBe(413);
    expect(over.json).toMatchObject({ code: "CONTEXT_FILE_TOO_LARGE", maxBytes: limitMb * MiB });
    expect(draftFiles()).toEqual([]);
    await expectPromptClose();
  }, 60_000);

  it("a limit changed in settings applies to the next upload without a restart (AC-004)", async () => {
    expect((await upload({ bytes: 3 * MiB })).status).toBe(200);
    set(2, undefined);
    const refused = await upload({ bytes: 3 * MiB });
    expect(refused).toMatchObject({ status: 413, json: { code: "CONTEXT_FILE_TOO_LARGE", maxBytes: 2 * MiB } });
    set(5, undefined);
    expect((await upload({ bytes: 3 * MiB })).status).toBe(200);
    expect(draftFiles()).toHaveLength(2);
  }, 60_000);

  it("an unaccepted type is refused with 415 CONTEXT_FILE_TYPE_UNSUPPORTED, the rest of the file is read, nothing is left, closes promptly (AR-008)", async () => {
    const result = await upload({ bytes: 30 * MiB, filename: "tool.exe", type: "application/octet-stream" });
    expect(result.status).toBe(415);
    expect(result.json).toEqual({ code: "CONTEXT_FILE_TYPE_UNSUPPORTED", detail: "Unsupported file type: application/octet-stream" });
    expect(draftFiles()).toEqual([]);
    await expectPromptClose();
  }, 60_000);

  it.each([
    ["a missing owner field", null],
    ["an owner that is not JSON", "not json"],
    ["an owner that is not a draft owner", JSON.stringify({ kind: "agent_final", runId: "x" })],
  ])("%s answers 400 with detail only, reads the rest of the file, and closes promptly (AR-008)", async (_name, owner) => {
    const result = await upload({ bytes: 30 * MiB, owner });
    expect(result.status).toBe(400);
    expect(result.json).toEqual({ detail: expect.any(String) });
    expect(draftFiles()).toEqual([]);
    await expectPromptClose();
  }, 60_000);

  it("a client that disconnects mid-upload leaves no file (AC-007, AC-008; P3)", async () => {
    const result = await upload({ bytes: 40 * MiB, abortAfter: 8 * MiB });
    expect(result.status).toBeNull();
    await new Promise((r) => setTimeout(r, 1000));
    expect(draftFiles()).toEqual([]);
  }, 60_000);

  it("streams a 300 MiB video without holding it in memory (AC-015, P2)", async () => {
    global.gc?.();
    const base = process.memoryUsage().rss; let peak = base;
    const timer = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 50);
    const result = await upload({ bytes: 300 * MiB });
    clearInterval(timer);
    expect(result.status).toBe(200);
    expect(draftFiles().map((f) => fs.statSync(f).size)).toEqual([300 * MiB]);
    expect((peak - base) / MiB).toBeLessThan(150);
  }, 120_000);

  it("GET /context-files/size-limits publishes the current limits and the audio/video types (AC-004, AC-005)", async () => {
    const read = async () => (await app.inject({ method: "GET", url: "/rest/context-files/size-limits" })).json();
    const first = await read();
    expect(first).toEqual({ otherFileMaxBytes: 25 * MiB, audioVideoMaxBytes: 2048 * MiB, audioVideoMimeTypes: expect.any(Array) });
    expect(first.audioVideoMimeTypes).toEqual(expect.arrayContaining(["video/mp4", "video/quicktime", "audio/mpeg"]));
    expect(first.audioVideoMimeTypes).not.toContain("image/png");
    set(100, 30);
    expect(await read()).toMatchObject({ otherFileMaxBytes: 30 * MiB, audioVideoMaxBytes: 100 * MiB });
  });

  describe("Project Task upload route (AC-012)", () => {
    const taskUpload = (opts: Parameters<typeof streamUpload>[2]) =>
      streamUpload(port, "/rest/projects/p1/task-context-drafts/d1/context-files", opts);

    it("accepts a 26 MiB video and answers 413 / 415 in its own error envelope, closing promptly", async () => {
      expect((await taskUpload({ bytes: 26 * MiB })).status).toBe(200);
      const tooLarge = await taskUpload({ bytes: 26 * MiB, filename: "a.pdf", type: "application/pdf" });
      expect(tooLarge).toMatchObject({ status: 413, json: { error: { code: "CONTEXT_FILE_TOO_LARGE", message: expect.any(String), maxBytes: 25 * MiB } } });
      const unsupported = await taskUpload({ bytes: 5 * MiB, filename: "a.exe", type: "application/octet-stream" });
      expect(unsupported).toMatchObject({ status: 415, json: { error: { code: "CONTEXT_FILE_TYPE_UNSUPPORTED" } } });
      expect(filesUnder(projectTaskUploads.dir)).toHaveLength(1);
      await expectPromptClose();
    }, 60_000);
  });
});
