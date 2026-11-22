import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  type MemorySyncFileKind,
  normalizeMemorySyncRelativePath,
  shouldExcludeMemorySyncLeaf,
} from "../shared/memory-sync-path-policy.js";
import type { MemoryFileEntry } from "../shared/memory-sync-types.js";

type AppConfigLike = { getMemoryDir(): string };

type ScanRoot = { kind: MemorySyncFileKind; rootDir: string };

export type LocalMemoryExportScanResult = {
  files: MemoryFileEntry[];
};

/** Lists the regular files under the memory roots with their size and modification time. It reads no content. */
export class LocalMemoryExportScanner {
  constructor(private readonly config: AppConfigLike = appConfigProvider.config) {}

  async scan(): Promise<LocalMemoryExportScanResult> {
    const memoryDir = this.config.getMemoryDir();
    const roots: ScanRoot[] = [
      { kind: "agents", rootDir: path.join(memoryDir, "agents") },
      { kind: "agent_teams", rootDir: path.join(memoryDir, "agent_teams") },
    ];
    const files: MemoryFileEntry[] = [];

    for (const root of roots) {
      await this.walkRoot(root, root.rootDir, files, true);
    }
    files.sort((a, b) => `${a.kind}/${a.relativePath}`.localeCompare(`${b.kind}/${b.relativePath}`));
    return { files };
  }

  /**
   * A unit run of an Org container (its own file names its Org): not synced, as an Org's memory was not before
   * (org-teams-follow-definition, design R-5; syncing it is FU-001). An unreadable file is synced as before.
   */
  private async isContainedRun(root: ScanRoot, runDir: string): Promise<boolean> {
    const file = path.join(runDir, root.kind === "agents" ? "run_metadata.json" : "team_run_execution_tree.json");
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8")) as { containedIn?: unknown };
      return Boolean(parsed && typeof parsed === "object" && parsed.containedIn);
    } catch {
      return false;
    }
  }

  private async walkRoot(root: ScanRoot, currentDir: string, files: MemoryFileEntry[], runLevel = false): Promise<void> {
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
        if (runLevel && await this.isContainedRun(root, absolutePath)) continue;
        await this.walkRoot(root, absolutePath, files);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stat = await fs.stat(absolutePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
          return null;
        }
        throw error;
      });
      if (!stat?.isFile()) {
        continue;
      }
      files.push({
        kind: root.kind,
        relativePath: normalizeMemorySyncRelativePath(path.relative(root.rootDir, absolutePath)),
        absolutePath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    }
  }
}
