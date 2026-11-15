import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryHubRequestError } from "../../../src/memory-sync/source/memory-hub-response-parser.js";
import { MemorySyncBatchTransfer, type MemorySyncBatchContext } from "../../../src/memory-sync/source/memory-sync-batch-transfer.js";
import type { MemoryFileStager } from "../../../src/memory-sync/source/memory-file-stager.js";
import type { MemoryHubClient } from "../../../src/memory-sync/source/memory-hub-client.js";
import type { PlannedMemoryBatch } from "../../../src/memory-sync/source/memory-sync-batch-planner.js";
import type { ChangedMemoryFile, MemorySyncBatch } from "../../../src/memory-sync/shared/memory-sync-types.js";

const context: MemorySyncBatchContext = {
  hubBaseUrl: "http://hub.local", token: "t", memorySyncSourceId: "src", sourceDisplayName: "Src", sourceEndpoint: null,
};

describe("MemorySyncBatchTransfer", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-batch-transfer-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const makeFile = async (name: string, content: string): Promise<ChangedMemoryFile> => {
    const absolutePath = path.join(dir, name);
    await fs.writeFile(absolutePath, content);
    const stat = await fs.stat(absolutePath);
    return {
      kind: "agents", relativePath: name, absolutePath, size: stat.size, mtimeMs: stat.mtimeMs,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  };

  /** A hub answering each batch with `answer(batch)`; it throws to refuse. */
  const makeHub = (answer: (batch: MemorySyncBatch) => void = () => undefined) => {
    const batches: MemorySyncBatch[] = [];
    const pushBatch = vi.fn(async ({ batch }: { batch: MemorySyncBatch }) => {
      batches.push(batch);
      answer(batch);
      return { accepted: true, duplicate: false, batchId: batch.batchId, committedAt: "2026-11-15T12:00:00.000Z", operationCount: batch.operations.length };
    });
    return { client: { pushBatch } as unknown as MemoryHubClient, batches, pushBatch };
  };
  const makeStager = (stage: ReturnType<typeof vi.fn> = vi.fn(async () => ({ status: "staged" }))) => ({ stage } as unknown as MemoryFileStager & { stage: typeof stage });
  const refuse = (message: string, status = 400) => { throw new MemoryHubRequestError(message, status, "", null); };
  const plan = (...files: Array<[ChangedMemoryFile, "inline" | "staged"]>): PlannedMemoryBatch => ({
    files: files.map(([file, lane]) => ({ file, lane })),
  });

  it("sends inline files with their content and staged files by reference, in one batch", async () => {
    const small = await makeFile("small.txt", "small");
    const large = await makeFile("large.bin", "large");
    const hub = makeHub();
    const stager = makeStager();

    const result = await new MemorySyncBatchTransfer(hub.client, stager).send(plan([small, "inline"], [large, "staged"]), context);

    expect(stager.stage).toHaveBeenCalledWith(large, context);
    expect(hub.batches).toHaveLength(1);
    expect(hub.batches[0]?.operations).toMatchObject([
      { relativePath: "small.txt", contentEncoding: "base64", contentBase64: Buffer.from("small").toString("base64") },
      { relativePath: "large.bin", contentEncoding: "staged" },
    ]);
    expect(hub.batches[0]?.operations[1]).not.toHaveProperty("contentBase64");
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["synced", "synced"]);
    expect(result).toMatchObject({ committedBatches: 1, duplicateBatches: 0 });
  });

  it("sends each file alone when the hub refuses a batch of several, and fails only the refused file (REQ-005)", async () => {
    const [a, b, c] = [await makeFile("a.txt", "a"), await makeFile("b.txt", "b"), await makeFile("c.bin", "c")];
    const hub = makeHub((batch) => {
      if (batch.operations.some((operation) => operation.relativePath === "b.txt")) refuse("Uploaded file hash mismatch for agents/b.txt.");
    });
    const stager = makeStager();

    const result = await new MemorySyncBatchTransfer(hub.client, stager).send(plan([a, "inline"], [b, "inline"], [c, "staged"]), context);

    expect(hub.batches.map((batch) => batch.operations.map((operation) => operation.relativePath))).toEqual([
      ["a.txt", "b.txt", "c.bin"], ["a.txt"], ["b.txt"], ["c.bin"],
    ]);
    expect(stager.stage).toHaveBeenCalledTimes(2);
    expect(result.outcomes).toMatchObject([
      { status: "synced", file: { relativePath: "a.txt" } },
      { status: "failed", file: { relativePath: "b.txt" }, reason: "Uploaded file hash mismatch for agents/b.txt." },
      { status: "synced", file: { relativePath: "c.bin" } },
    ]);
  });

  it("fails a single refused file without a second send", async () => {
    const only = await makeFile("only.txt", "only");
    const hub = makeHub(() => refuse("Request body is too large", 413));

    const result = await new MemorySyncBatchTransfer(hub.client, makeStager()).send(plan([only, "inline"]), context);

    expect(hub.pushBatch).toHaveBeenCalledTimes(1);
    expect(result.outcomes).toMatchObject([{ status: "failed", reason: "Request body is too large" }]);
  });

  it("rethrows run-level errors: token or gate refusal, hub down, network error", async () => {
    const file = await makeFile("a.txt", "a");
    for (const failure of [
      () => refuse("Memory Hub source token is invalid.", 401),
      () => refuse("Memory Hub source token was revoked.", 403),
      () => refuse("Memory Hub is not enabled.", 503),
      () => { throw new TypeError("fetch failed"); },
    ]) {
      const hub = makeHub(failure);
      await expect(new MemorySyncBatchTransfer(hub.client, makeStager()).send(plan([file, "inline"], [file, "inline"]), context)).rejects.toThrow();
      expect(hub.pushBatch).toHaveBeenCalledTimes(1);
    }
    const stagerLosingConnection = makeStager(vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(new MemorySyncBatchTransfer(makeHub().client, stagerLosingConnection).send(plan([file, "staged"]), context)).rejects.toThrow("fetch failed");
  });

  it("leaves a staged file whose upload is refused as failed and still sends the others", async () => {
    const [good, bad] = [await makeFile("good.txt", "good"), await makeFile("bad.bin", "bad")];
    const hub = makeHub();
    const stager = makeStager(vi.fn(async () => refuse("staging refused", 422)));

    const result = await new MemorySyncBatchTransfer(hub.client, stager).send(plan([good, "inline"], [bad, "staged"]), context);

    expect(result.outcomes).toMatchObject([
      { status: "failed", file: { relativePath: "bad.bin" }, reason: "staging refused" },
      { status: "synced", file: { relativePath: "good.txt" } },
    ]);
  });

  it("defers a file that changed while being staged or read, and one that vanished, without a request for it", async () => {
    const changed = await makeFile("changed.txt", "before");
    await fs.writeFile(changed.absolutePath, "after!");
    const vanished = { ...(await makeFile("vanished.txt", "x")), absolutePath: path.join(dir, "nope.txt") };
    const large = await makeFile("large.bin", "large");
    const hub = makeHub();
    const stager = makeStager(vi.fn(async () => ({ status: "deferred", reason: "file changed while being read" })));

    const result = await new MemorySyncBatchTransfer(hub.client, stager).send(plan([changed, "inline"], [vanished, "inline"], [large, "staged"]), context);

    expect(hub.pushBatch).not.toHaveBeenCalled();
    expect(result.outcomes.map((outcome) => outcome.status)).toEqual(["deferred", "deferred", "deferred"]);
  });
});
