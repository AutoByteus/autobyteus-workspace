import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  type MemorySyncFileKind,
  normalizeMemorySyncRelativePath,
  shouldExcludeMemorySyncLeaf,
} from "../shared/memory-sync-path-policy.js";
import type { MemoryFileDescriptor } from "../shared/memory-sync-types.js";

type AppConfigLike = { getMemoryDir(): string };

type ScanRoot = { kind: MemorySyncFileKind; rootDir: string };

const sha256Buffer = (buffer: Buffer): string => createHash("sha256").update(buffer).digest("hex");

export type LocalMemoryExportScanResult = {
  files: MemoryFileDescriptor[];
  deferred: Array<{ kind: MemorySyncFileKind; relativePath: string; reason: string }>;
};

export class LocalMemoryExportScanner {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  async scan(): Promise<LocalMemoryExportScanResult> {
    const memoryDir = this.config.getMemoryDir();
    const roots: ScanRoot[] = [
      { kind: "agents", rootDir: path.join(memoryDir, "agents") },
      { kind: "agent_teams", rootDir: path.join(memoryDir, "agent_teams") },
    ];
    const files: MemoryFileDescriptor[] = [];
    const deferred: LocalMemoryExportScanResult["deferred"] = [];

    for (const root of roots) {
      await this.walkRoot(root, root.rootDir, files, deferred);
    }
    files.sort((a, b) => `${a.kind}/${a.relativePath}`.localeCompare(`${b.kind}/${b.relativePath}`));
    return { files, deferred };
  }

  private async walkRoot(
    root: ScanRoot,
    currentDir: string,
    files: MemoryFileDescriptor[],
    deferred: LocalMemoryExportScanResult["deferred"],
  ): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      if (shouldExcludeMemorySyncLeaf(entry.name)) {
        continue;
      }
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        await this.walkRoot(root, absolutePath, files, deferred);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const relativePath = normalizeMemorySyncRelativePath(path.relative(root.rootDir, absolutePath));
      const descriptor = await this.describeStableFile(root.kind, relativePath, absolutePath);
      if (descriptor) {
        files.push(descriptor);
      } else {
        deferred.push({ kind: root.kind, relativePath, reason: "file changed while being read" });
      }
    }
  }

  private async describeStableFile(
    kind: MemorySyncFileKind,
    relativePath: string,
    absolutePath: string,
  ): Promise<MemoryFileDescriptor | null> {
    const before = await fs.stat(absolutePath);
    if (!before.isFile()) {
      return null;
    }
    const content = await fs.readFile(absolutePath);
    const after = await fs.stat(absolutePath);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      return null;
    }
    return {
      kind,
      relativePath,
      absolutePath,
      size: after.size,
      mtimeMs: after.mtimeMs,
      sha256: sha256Buffer(content),
    };
  }
}
