import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublishedArtifactProjectionService } from "../../../../src/run-history/services/published-artifact-projection-service.js";
import { PublishedArtifactProjectionStore } from "../../../../src/services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactSnapshotStore } from "../../../../src/services/published-artifacts/published-artifact-snapshot-store.js";
import type { PublishedArtifactSummary } from "../../../../src/services/published-artifacts/published-artifact-types.js";

describe("PublishedArtifactProjectionService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "published-artifact-projection-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("reads historical published-artifact summaries and revision text from durable projection storage", async () => {
    const memoryDir = await createTempDir();
    const fixtureRoot = await createTempDir();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();

    const sourcePath = path.join(fixtureRoot, "docs", "brief.md");
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, "historical brief body", "utf-8");

    const snapshot = await snapshotStore.snapshotArtifact({
      memoryDir,
      revisionId: "revision-1",
      sourceAbsolutePath: sourcePath,
    });

    const summary: PublishedArtifactSummary = {
      id: "run-1:docs/brief.md",
      runId: "run-1",
      path: "docs/brief.md",
      type: "file",
      status: "available",
      description: "Ready for review",
      revisionId: "revision-1",
      createdAt: "2026-04-22T08:00:00.000Z",
      updatedAt: "2026-04-22T08:00:00.000Z",
    };

    await projectionStore.writeProjection(memoryDir, {
      version: 1,
      summaries: [summary],
      revisions: [
        {
          revisionId: "revision-1",
          artifactId: summary.id,
          runId: "run-1",
          path: summary.path,
          type: summary.type,
          description: summary.description,
          createdAt: summary.updatedAt,
          snapshotRelativePath: snapshot.snapshotRelativePath,
          sourceFileName: snapshot.sourceFileName,
        },
      ],
    });

    const service = new PublishedArtifactProjectionService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      metadataService: {
        readMetadata: vi.fn().mockResolvedValue({
          memoryDir,
        }),
      } as any,
      projectionStore,
      snapshotStore,
    });

    await expect(service.getRunPublishedArtifacts("run-1")).resolves.toEqual([summary]);
    await expect(service.getRevision("run-1", "revision-1")).resolves.toMatchObject({
      revisionId: "revision-1",
      artifactId: summary.id,
      path: "docs/brief.md",
    });
    await expect(
      service.getPublishedArtifactRevisionText({
        runId: "run-1",
        revisionId: "revision-1",
      }),
    ).resolves.toBe("historical brief body");
    await expect(service.resolveRevision("run-1", "revision-1")).resolves.toMatchObject({
      memoryDir,
      isActiveRun: false,
      revision: expect.objectContaining({
        revisionId: "revision-1",
        snapshotRelativePath: snapshot.snapshotRelativePath,
      }),
      absolutePath: snapshotStore.resolveSnapshotAbsolutePath(memoryDir, snapshot.snapshotRelativePath),
    });
    await expect(service.getPublishedArtifactsFromMemoryDir(memoryDir)).resolves.toEqual([summary]);
    await expect(
      service.getPublishedArtifactRevisionTextFromMemoryDir({
        memoryDir,
        revisionId: "revision-1",
      }),
    ).resolves.toBe("historical brief body");
  });
});
