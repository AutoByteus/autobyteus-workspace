import fs from "node:fs/promises";
import path from "node:path";

const SNAPSHOT_ROOT_DIR = "published_artifacts/revisions";

const toSnapshotRootPath = (memoryDir: string): string =>
  path.join(path.resolve(memoryDir), SNAPSHOT_ROOT_DIR);

export class PublishedArtifactSnapshotStore {
  async snapshotArtifact(input: {
    memoryDir: string;
    revisionId: string;
    sourceAbsolutePath: string;
  }): Promise<{ snapshotRelativePath: string; sourceFileName: string }> {
    const sourceFileName = path.basename(input.sourceAbsolutePath);
    const snapshotRelativePath = path.posix.join(
      "published_artifacts",
      "revisions",
      input.revisionId,
      sourceFileName,
    );
    const snapshotAbsolutePath = this.resolveSnapshotAbsolutePath(
      input.memoryDir,
      snapshotRelativePath,
    );

    const revisionDirPath = path.dirname(snapshotAbsolutePath);
    await fs.mkdir(revisionDirPath, { recursive: true });
    try {
      await fs.copyFile(input.sourceAbsolutePath, snapshotAbsolutePath);
    } catch (error) {
      await fs.rm(revisionDirPath, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }

    return {
      snapshotRelativePath,
      sourceFileName,
    };
  }

  resolveSnapshotAbsolutePath(memoryDir: string, snapshotRelativePath: string): string {
    const resolvedMemoryDir = path.resolve(memoryDir);
    return path.resolve(resolvedMemoryDir, snapshotRelativePath);
  }

  async readRevisionText(memoryDir: string, snapshotRelativePath: string): Promise<string> {
    return fs.readFile(this.resolveSnapshotAbsolutePath(memoryDir, snapshotRelativePath), "utf-8");
  }

  async deleteRevisionSnapshot(memoryDir: string, snapshotRelativePath: string): Promise<void> {
    const snapshotAbsolutePath = this.resolveSnapshotAbsolutePath(memoryDir, snapshotRelativePath);
    await fs.rm(path.dirname(snapshotAbsolutePath), { recursive: true, force: true });
  }

  getSnapshotRootPath(memoryDir: string): string {
    return toSnapshotRootPath(memoryDir);
  }
}

let cachedPublishedArtifactSnapshotStore: PublishedArtifactSnapshotStore | null = null;

export const getPublishedArtifactSnapshotStore = (): PublishedArtifactSnapshotStore => {
  if (!cachedPublishedArtifactSnapshotStore) {
    cachedPublishedArtifactSnapshotStore = new PublishedArtifactSnapshotStore();
  }
  return cachedPublishedArtifactSnapshotStore;
};
