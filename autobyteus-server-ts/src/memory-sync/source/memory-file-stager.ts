import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { MEMORY_SYNC_STAGED_PIECE_MAX_BYTES } from "../shared/memory-sync-transfer-limits.js";
import type { ChangedMemoryFile } from "../shared/memory-sync-types.js";
import { MemoryHubClient } from "./memory-hub-client.js";
import { MemoryHubRequestError } from "./memory-hub-response-parser.js";
import { MemoryFileReadError } from "./memory-sync-file-failure-policy.js";

export type MemoryHubTarget = {
  hubBaseUrl: string;
  token: string;
  memorySyncSourceId: string;
};

export type MemoryFileStageResult =
  | { status: "staged" }
  | { status: "deferred"; reason: string };

/** How often one upload restarts from the hub's length after an offset conflict before the conflict is the file's problem. */
const MAX_OFFSET_CONFLICT_RESTARTS = 3;

const CHANGED_WHILE_READ = "file changed while being read";

/**
 * Uploads the content of one large file to the hub's staging area in pieces of raw bytes, resuming from what the hub
 * already holds. It reads exactly the planned `size` bytes and checks them against the planned SHA-256, so a file
 * that grew or changed since it was hashed is deferred, never committed.
 */
export class MemoryFileStager {
  constructor(private readonly hubClient: Pick<MemoryHubClient, "getStagedFileStatus" | "putStagedFilePiece"> = new MemoryHubClient()) {}

  async stage(file: ChangedMemoryFile, hub: MemoryHubTarget): Promise<MemoryFileStageResult> {
    const target = { ...hub, sha256: file.sha256 };
    let { receivedBytes } = await this.hubClient.getStagedFileStatus(target);
    for (let restarts = 0; ; restarts += 1) {
      // The hub holds all of it: its verification at commit decides whether the content is right.
      if (receivedBytes >= file.size) {
        return { status: "staged" };
      }
      try {
        return await this.uploadFrom(file, hub, receivedBytes);
      } catch (error) {
        if (!(error instanceof MemoryHubRequestError) || error.status !== 409 || error.receivedBytes === null
          || restarts >= MAX_OFFSET_CONFLICT_RESTARTS) {
          throw error;
        }
        receivedBytes = error.receivedBytes;
      }
    }
  }

  private async uploadFrom(file: ChangedMemoryFile, hub: MemoryHubTarget, receivedBytes: number): Promise<MemoryFileStageResult> {
    const handle = await fs.open(file.absolutePath, "r").catch((error: unknown) => {
      throw new MemoryFileReadError(file.absolutePath, error);
    });
    try {
      const hash = createHash("sha256");
      const buffer = Buffer.allocUnsafe(MEMORY_SYNC_STAGED_PIECE_MAX_BYTES);
      let position = 0;
      // Resume: hash what the hub already holds from the local file, without sending it.
      while (position < receivedBytes) {
        const length = Math.min(buffer.byteLength, receivedBytes - position);
        if (await this.readExactly(handle, file, buffer, length, position) < length) {
          return { status: "deferred", reason: CHANGED_WHILE_READ };
        }
        hash.update(buffer.subarray(0, length));
        position += length;
      }
      while (position < file.size) {
        const length = Math.min(buffer.byteLength, file.size - position);
        if (await this.readExactly(handle, file, buffer, length, position) < length) {
          return { status: "deferred", reason: CHANGED_WHILE_READ };
        }
        const piece = buffer.subarray(0, length);
        hash.update(piece);
        await this.hubClient.putStagedFilePiece({ ...hub, sha256: file.sha256, offset: position, bytes: piece });
        position += length;
      }
      return hash.digest("hex") === file.sha256
        ? { status: "staged" }
        : { status: "deferred", reason: CHANGED_WHILE_READ };
    } finally {
      await handle.close();
    }
  }

  private async readExactly(
    handle: fs.FileHandle,
    file: ChangedMemoryFile,
    buffer: Buffer,
    length: number,
    position: number,
  ): Promise<number> {
    let filled = 0;
    try {
      while (filled < length) {
        const { bytesRead } = await handle.read(buffer, filled, length - filled, position + filled);
        if (bytesRead === 0) {
          break;
        }
        filled += bytesRead;
      }
    } catch (error) {
      throw new MemoryFileReadError(file.absolutePath, error);
    }
    return filled;
  }
}
