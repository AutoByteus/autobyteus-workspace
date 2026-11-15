import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryFileStager, type MemoryHubTarget } from "../../../src/memory-sync/source/memory-file-stager.js";
import { MemoryHubRequestError } from "../../../src/memory-sync/source/memory-hub-response-parser.js";
import type { ChangedMemoryFile } from "../../../src/memory-sync/shared/memory-sync-types.js";

const MiB = 1024 * 1024;
const hub: MemoryHubTarget = { hubBaseUrl: "http://hub.local", token: "t", memorySyncSourceId: "src" };

/** A hub's staged file as the real hub keeps it: pieces are appended only at the current length. */
class FakeHub {
  held = Buffer.alloc(0);
  puts: Array<{ offset: number; length: number }> = [];
  conflictOnce: number | null = null;
  alwaysConflict = false;

  async getStagedFileStatus() {
    return { receivedBytes: this.held.byteLength };
  }

  async putStagedFilePiece(input: { offset: number; bytes: Buffer }) {
    this.puts.push({ offset: input.offset, length: input.bytes.byteLength });
    if (this.alwaysConflict || this.conflictOnce !== null || input.offset !== this.held.byteLength) {
      const receivedBytes = this.conflictOnce ?? this.held.byteLength;
      this.conflictOnce = null;
      throw new MemoryHubRequestError("offset mismatch", 409, "", receivedBytes);
    }
    this.held = Buffer.concat([this.held, Buffer.from(input.bytes)]);
    return { receivedBytes: this.held.byteLength };
  }
}

describe("MemoryFileStager", () => {
  let dir: string;
  let content: Buffer;
  let file: ChangedMemoryFile;
  let fakeHub: FakeHub;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-stager-"));
    content = Buffer.alloc(20 * MiB);
    for (let index = 0; index < content.byteLength; index += 4096) content.writeUInt32LE(index / 4096, index);
    const absolutePath = path.join(dir, "video.bin");
    await fs.writeFile(absolutePath, content);
    file = {
      kind: "agents", relativePath: "r/video.bin", absolutePath, size: content.byteLength, mtimeMs: 1,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
    fakeHub = new FakeHub();
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const stager = () => new MemoryFileStager(fakeHub);

  it("uploads the file in pieces of at most 8 MiB", async () => {
    await expect(stager().stage(file, hub)).resolves.toEqual({ status: "staged" });

    expect(fakeHub.puts).toEqual([{ offset: 0, length: 8 * MiB }, { offset: 8 * MiB, length: 8 * MiB }, { offset: 16 * MiB, length: 4 * MiB }]);
    expect(fakeHub.held.equals(content)).toBe(true);
  });

  it("resumes from what the hub holds: sends only the rest and still checks the whole file's hash", async () => {
    fakeHub.held = Buffer.from(content.subarray(0, 12 * MiB));

    await expect(stager().stage(file, hub)).resolves.toEqual({ status: "staged" });

    expect(fakeHub.puts).toEqual([{ offset: 12 * MiB, length: 8 * MiB }]);
    expect(fakeHub.held.equals(content)).toBe(true);
  });

  it("sends nothing when the hub holds all of it", async () => {
    fakeHub.held = Buffer.from(content);

    await expect(stager().stage(file, hub)).resolves.toEqual({ status: "staged" });
    expect(fakeHub.puts).toEqual([]);
  });

  it("reads exactly the planned size from a file that grew after it was hashed (AR-004)", async () => {
    await fs.appendFile(file.absolutePath, Buffer.alloc(3 * MiB, 7));
    const grownButSameStart = { ...file };

    const result = await stager().stage(grownButSameStart, hub);

    // The first `size` bytes are unchanged, so they match the planned SHA-256 and exactly `size` bytes were sent.
    expect(result).toEqual({ status: "staged" });
    expect(fakeHub.held.byteLength).toBe(file.size);
  });

  it("defers a file whose content changed or shrank since it was hashed", async () => {
    await fs.writeFile(file.absolutePath, Buffer.alloc(file.size, 9));
    expect(await stager().stage(file, hub)).toEqual({ status: "deferred", reason: "file changed while being read" });

    await fs.writeFile(file.absolutePath, Buffer.alloc(5 * MiB, 9));
    fakeHub = new FakeHub();
    expect(await stager().stage(file, hub)).toEqual({ status: "deferred", reason: "file changed while being read" });
  });

  it("continues from the hub's length after one offset conflict and gives up on a repeating one", async () => {
    fakeHub.conflictOnce = 0;
    await expect(stager().stage(file, hub)).resolves.toEqual({ status: "staged" });
    expect(fakeHub.held.equals(content)).toBe(true);

    fakeHub = new FakeHub();
    fakeHub.alwaysConflict = true;
    await expect(stager().stage(file, hub)).rejects.toMatchObject({ status: 409 });
  });

  it("reports a file it cannot read as a read error", async () => {
    await expect(stager().stage({ ...file, absolutePath: path.join(dir, "gone.bin") }, hub)).rejects.toMatchObject({ name: "MemoryFileReadError", code: "ENOENT" });
  });
});
