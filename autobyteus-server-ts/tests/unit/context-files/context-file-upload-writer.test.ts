import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MultipartFile } from "@fastify/multipart";
import { writeContextFileUpload } from "../../../src/context-files/services/context-file-upload-writer.js";
import { CONTEXT_FILE_MAX_BYTES } from "../../../src/context-files/domain/context-file-upload-policy.js";
describe("Neutral context byte policy", () => {
  let dir: string;
  beforeEach(async () => {dir = await fs.mkdtemp(path.join(os.tmpdir(), "context-writer-unit-"));});
  afterEach(async () => {await fs.rm(dir, {recursive: true, force: true});});
  const input = (bytes: number, truncated = false) => ({
    filename: "note.txt", mimetype: "text/plain", file: Object.assign(Readable.from([Buffer.alloc(bytes)]), {truncated}),
  }) as unknown as MultipartFile;
  it("writes exclusive bytes at the existing cap and removes incomplete oversized/truncated uploads", async () => {
    const target = path.join(dir, "file");
    expect(await writeContextFileUpload(input(CONTEXT_FILE_MAX_BYTES), target)).toBe(CONTEXT_FILE_MAX_BYTES);
    expect((await fs.stat(target)).size).toBe(CONTEXT_FILE_MAX_BYTES);
    await expect(writeContextFileUpload(input(1), target)).rejects.toMatchObject({code: "EEXIST"});
    expect((await fs.stat(target)).size).toBe(CONTEXT_FILE_MAX_BYTES);
    const over = path.join(dir, "oversized"), truncated = path.join(dir, "truncated");
    await expect(writeContextFileUpload(input(CONTEXT_FILE_MAX_BYTES + 1), over)).rejects.toThrow("too large");
    await expect(fs.stat(over)).rejects.toMatchObject({code: "ENOENT"});
    await expect(writeContextFileUpload(input(1, true), truncated)).rejects.toThrow("too large");
    await expect(fs.stat(truncated)).rejects.toMatchObject({code: "ENOENT"});
  });
});
