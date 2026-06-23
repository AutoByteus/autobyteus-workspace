import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { toMemorySyncFileKey } from "../shared/memory-sync-path-policy.js";
import type {
  MemoryFileDescriptor,
  MemoryFileOperation,
  MemorySyncSourceFileState,
} from "../shared/memory-sync-types.js";

const sha256Buffer = (buffer: Buffer): string => createHash("sha256").update(buffer).digest("hex");

export type MemoryFileChangePlan = {
  operations: MemoryFileOperation[];
  unchangedCount: number;
  deferred: Array<{ key: string; reason: string }>;
};

const hasSameFingerprint = (
  descriptor: MemoryFileDescriptor,
  state: MemorySyncSourceFileState | undefined,
): boolean => Boolean(state)
  && state?.size === descriptor.size
  && state?.sha256 === descriptor.sha256
  && Math.trunc(state?.mtimeMs ?? -1) === Math.trunc(descriptor.mtimeMs ?? -2);

export class MemoryFileChangePlanner {
  async planChangedFiles(
    files: MemoryFileDescriptor[],
    priorState: Record<string, MemorySyncSourceFileState>,
    options: { maxOperations?: number } = {},
  ): Promise<MemoryFileChangePlan> {
    const maxOperations = options.maxOperations ?? files.length;
    const operations: MemoryFileOperation[] = [];
    const deferred: MemoryFileChangePlan["deferred"] = [];
    let unchangedCount = 0;

    for (const descriptor of files) {
      const key = toMemorySyncFileKey(descriptor.kind, descriptor.relativePath);
      if (hasSameFingerprint(descriptor, priorState[key])) {
        unchangedCount += 1;
        continue;
      }
      if (operations.length >= maxOperations) {
        deferred.push({ key, reason: "batch limit reached" });
        continue;
      }
      const operation = await this.buildReplaceOperation(descriptor);
      if (!operation) {
        deferred.push({ key, reason: "file changed while preparing upload" });
        continue;
      }
      operations.push(operation);
    }

    return { operations, unchangedCount, deferred };
  }

  private async buildReplaceOperation(descriptor: MemoryFileDescriptor): Promise<MemoryFileOperation | null> {
    const before = await fs.stat(descriptor.absolutePath);
    const content = await fs.readFile(descriptor.absolutePath);
    const after = await fs.stat(descriptor.absolutePath);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      return null;
    }
    const sha256 = sha256Buffer(content);
    if (sha256 !== descriptor.sha256 || content.byteLength !== descriptor.size) {
      return null;
    }
    return {
      opId: `${descriptor.kind}:${descriptor.relativePath}`,
      operation: "replace",
      kind: descriptor.kind,
      relativePath: descriptor.relativePath,
      size: descriptor.size,
      sha256: descriptor.sha256,
      mtimeMs: descriptor.mtimeMs,
      contentEncoding: "base64",
      contentBase64: content.toString("base64"),
    };
  }
}
