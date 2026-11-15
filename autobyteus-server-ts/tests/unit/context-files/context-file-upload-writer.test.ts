import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MultipartFile } from "@fastify/multipart";
import { writeContextFileUpload, discardUploadedFile } from "../../../src/context-files/services/context-file-upload-writer.js";
import { ContextFileTooLargeError, UnsupportedContextFileTypeError } from "../../../src/context-files/domain/context-file-upload-errors.js";
import type { ContextFileSizeLimits } from "../../../src/context-files/domain/context-file-upload-policy.js";

// Small limits keep the boundary cases fast; the classification and the typed errors are what is under test.
const limits: ContextFileSizeLimits = { audioVideoMaxBytes: 1000, otherFileMaxBytes: 100 };

describe("Neutral context byte writer (per-type limits)", () => {
  let dir: string;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), "context-writer-unit-")); });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });
  const input = (bytes: number, mimetype: string, truncated = false) => {
    const stream = Object.assign(Readable.from([Buffer.alloc(bytes)]), { truncated });
    return { file: { filename: "f", mimetype, file: stream } as unknown as MultipartFile, stream };
  };
  const gone = (p: string) => expect(fs.stat(p)).rejects.toMatchObject({ code: "ENOENT" });

  it.each([["other file", "text/plain", 100], ["video", "video/mp4", 1000], ["audio", "audio/mpeg", 1000]])(
    "accepts a %s exactly at its limit and refuses one byte more, naming the limit and leaving no file (AC-002, AC-003)",
    async (_kind, mimetype, max) => {
      const exact = path.join(dir, "exact");
      expect(await writeContextFileUpload(input(max, mimetype).file, exact, limits)).toBe(max);
      expect((await fs.stat(exact)).size).toBe(max);
      const over = path.join(dir, "over");
      const refused = await writeContextFileUpload(input(max + 1, mimetype).file, over, limits).catch((e) => e);
      expect(refused).toBeInstanceOf(ContextFileTooLargeError);
      expect(refused.maxBytes).toBe(max);
      await gone(over);
    });

  it("applies each file's own limit: a video between the two limits is accepted, a document of that size is refused", async () => {
    expect(await writeContextFileUpload(input(500, "video/mp4").file, path.join(dir, "video"), limits)).toBe(500);
    await expect(writeContextFileUpload(input(500, "application/pdf").file, path.join(dir, "pdf"), limits))
      .rejects.toMatchObject({ maxBytes: 100 });
  });

  it("drains an over-limit file to its end instead of destroying the stream (P5), then removes it", async () => {
    const target = path.join(dir, "over");
    const { file, stream } = input(500, "application/pdf");
    await expect(writeContextFileUpload(file, target, limits)).rejects.toBeInstanceOf(ContextFileTooLargeError);
    expect(stream.readableEnded).toBe(true);
    expect(stream.destroyed).toBe(true); // ended and auto-destroyed, not errored
    expect(stream.errored).toBeNull();
    await gone(target);
  });

  it("maps a multipart-truncated stream to the same too-large error and removes the partial file", async () => {
    const target = path.join(dir, "truncated");
    await expect(writeContextFileUpload(input(1, "video/mp4", true).file, target, limits)).rejects.toMatchObject({ maxBytes: 1000 });
    await gone(target);
  });

  it("refuses an unaccepted type with a typed error before creating a file", async () => {
    const target = path.join(dir, "unsupported");
    const refused = await writeContextFileUpload(input(1, "application/octet-stream").file, target, limits).catch((e) => e);
    expect(refused).toBeInstanceOf(UnsupportedContextFileTypeError);
    expect(refused.mimeType).toBe("application/octet-stream");
    await gone(target);
  });

  it("never replaces an existing file (exclusive create)", async () => {
    const target = path.join(dir, "file");
    await writeContextFileUpload(input(5, "text/plain").file, target, limits);
    await expect(writeContextFileUpload(input(1, "text/plain").file, target, limits)).rejects.toMatchObject({ code: "EEXIST" });
    expect((await fs.stat(target)).size).toBe(5);
  });

  it("discardUploadedFile reads a part to its end and tolerates a part that is already gone", async () => {
    const { file, stream } = input(500, "text/plain");
    await discardUploadedFile(file);
    expect(stream.readableEnded).toBe(true);
    await discardUploadedFile(file);
    const broken = { file: Object.assign(Readable.from([]), {}) } as unknown as MultipartFile;
    broken.file.destroy(new Error("client went away"));
    await expect(discardUploadedFile(broken)).resolves.toBeUndefined();
  });
});
