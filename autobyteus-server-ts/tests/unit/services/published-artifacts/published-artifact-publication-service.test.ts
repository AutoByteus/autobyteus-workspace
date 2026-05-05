import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import { PublishedArtifactProjectionStore } from "../../../../src/services/published-artifacts/published-artifact-projection-store.js";
import { PublishedArtifactPublicationService } from "../../../../src/services/published-artifacts/published-artifact-publication-service.js";
import { PublishedArtifactSnapshotStore } from "../../../../src/services/published-artifacts/published-artifact-snapshot-store.js";
import { PublishedArtifactProjectionService } from "../../../../src/run-history/services/published-artifact-projection-service.js";
import { EMPTY_PUBLISHED_ARTIFACT_PROJECTION } from "../../../../src/services/published-artifacts/published-artifact-types.js";

describe("PublishedArtifactPublicationService", () => {
  const tempDirs: string[] = [];

  const normalizePublishedPath = async (filePath: string): Promise<string> =>
    (await fs.realpath(filePath).catch(() => filePath)).replace(/\\/g, "/");

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "published-artifact-publication-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  const createRunHarness = async (options: { workspaceId?: string | null } = {}) => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const localEvents: AgentRunEvent[] = [];
    const workspaceId = options.workspaceId === undefined ? "workspace-1" : options.workspaceId;
    const run = {
      runId: "run-1",
      config: {
        memoryDir,
        ...(workspaceId ? { workspaceId } : {}),
      },
      emitLocalEvent(event: AgentRunEvent) {
        localEvents.push(event);
      },
    } as any;

    return {
      run,
      workspaceRoot,
      memoryDir,
      localEvents,
    };
  };

  const createService = (input: {
    run: any;
    workspaceRoot?: string;
    projectionStore?: PublishedArtifactProjectionStore;
    snapshotStore?: PublishedArtifactSnapshotStore;
  }): PublishedArtifactPublicationService =>
    new PublishedArtifactPublicationService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(input.run),
      } as any,
      workspaceManager: {
        getOrCreateWorkspace: vi.fn().mockResolvedValue({
          getBasePath: () => input.workspaceRoot ?? "",
        }),
      } as any,
      projectionStore: input.projectionStore,
      snapshotStore: input.snapshotStore,
    });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("publishes an in-workspace file, persists the projection, and emits ARTIFACT_PERSISTED", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });

    const filePath = path.join(workspaceRoot, "docs", "brief.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Review-ready brief", "utf-8");
    const expectedPath = await normalizePublishedPath(filePath);

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: "docs/brief.md",
      description: "Ready for review",
    });

    const projection = await projectionStore.readProjection(memoryDir);
    expect(artifact).toMatchObject({
      runId: "run-1",
      path: expectedPath,
      type: "file",
      status: "available",
      description: "Ready for review",
      revisionId: expect.any(String),
    });
    expect(projection.summaries).toEqual([artifact]);
    expect(projection.revisions).toHaveLength(1);
    await expect(
      snapshotStore.readRevisionText(memoryDir, projection.revisions[0]!.snapshotRelativePath),
    ).resolves.toBe("# Review-ready brief");

    expect(localEvents).toHaveLength(1);
    expect(localEvents[0]).toMatchObject({
      eventType: AgentRunEventType.ARTIFACT_PERSISTED,
      runId: "run-1",
      payload: artifact,
    });
  });


  it("publishes multiple artifacts in input order using the shared batch path", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
    });

    const firstPath = path.join(workspaceRoot, "docs", "a.md");
    const secondPath = path.join(workspaceRoot, "docs", "b.md");
    await fs.mkdir(path.dirname(firstPath), { recursive: true });
    await fs.writeFile(firstPath, "A", "utf-8");
    await fs.writeFile(secondPath, "B", "utf-8");
    const expectedPaths = [
      await normalizePublishedPath(firstPath),
      await normalizePublishedPath(secondPath),
    ];

    const artifacts = await service.publishManyForRun({
      runId: run.runId,
      artifacts: [
        { path: "docs/a.md", description: "First" },
        { path: "docs/b.md", description: null },
      ],
    });

    const projection = await projectionStore.readProjection(memoryDir);
    expect(artifacts.map((artifact) => artifact.path)).toEqual(expectedPaths);
    expect(artifacts.map((artifact) => artifact.description)).toEqual(["First", null]);
    expect(projection.summaries.map((artifact) => artifact.path)).toEqual(expectedPaths);
    expect(projection.revisions.map((revision) => revision.path)).toEqual(expectedPaths);
    expect(localEvents).toHaveLength(2);
    expect(localEvents.map((event) => (event.payload as any).path)).toEqual(expectedPaths);
  });

  it("accepts the absolute file path returned by write_file and stores its absolute source identity", async () => {
    const { run, workspaceRoot, localEvents } = await createRunHarness();
    const service = createService({
      run,
      workspaceRoot,
    });

    const filePath = path.join(workspaceRoot, "docs", "brief.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Review-ready brief", "utf-8");

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: filePath,
      description: "Ready for review",
    });

    const expectedPath = await normalizePublishedPath(filePath);
    expect(artifact.path).toBe(expectedPath);
    expect(localEvents[0]).toMatchObject({
      eventType: AgentRunEventType.ARTIFACT_PERSISTED,
      payload: expect.objectContaining({
        path: expectedPath,
      }),
    });
  });

  it("stores realpath-equivalent in-workspace absolute files as absolute source artifact paths", async () => {
    const { run, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const tempRoot = await createTempDir();
    const realWorkspaceRoot = path.join(tempRoot, "real-workspace");
    const workspaceAliasRoot = path.join(tempRoot, "workspace-alias");
    await fs.mkdir(path.join(realWorkspaceRoot, "brief-studio"), { recursive: true });
    await fs.symlink(realWorkspaceRoot, workspaceAliasRoot, "dir");
    const service = createService({
      run,
      workspaceRoot: workspaceAliasRoot,
      projectionStore,
      snapshotStore,
    });

    const filePath = path.join(realWorkspaceRoot, "brief-studio", "research.md");
    await fs.writeFile(filePath, "realpath-equivalent workspace file", "utf-8");

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: filePath,
      description: "Research checkpoint",
    });

    const projection = await projectionStore.readProjection(memoryDir);
    const expectedPath = await normalizePublishedPath(filePath);
    expect(artifact.path).toBe(expectedPath);
    expect(projection.summaries[0]?.path).toBe(expectedPath);
    expect(projection.revisions[0]?.path).toBe(expectedPath);
    await expect(
      snapshotStore.readRevisionText(memoryDir, projection.revisions[0]!.snapshotRelativePath),
    ).resolves.toBe("realpath-equivalent workspace file");
    expect(localEvents[0]?.payload).toEqual(artifact);
  });

  it("publishes an outside-workspace absolute file and stores the normalized absolute artifact path", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });

    const outsideRoot = await createTempDir();
    const outsideFilePath = path.join(outsideRoot, "external-report.md");
    await fs.writeFile(outsideFilePath, "outside workspace", "utf-8");

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: outsideFilePath,
      description: "External report",
    });

    const expectedPath = await normalizePublishedPath(outsideFilePath);
    const projection = await projectionStore.readProjection(memoryDir);
    expect(artifact.path).toBe(expectedPath);
    expect(projection.summaries[0]?.path).toBe(expectedPath);
    expect(projection.revisions[0]?.path).toBe(expectedPath);
    await expect(
      snapshotStore.readRevisionText(memoryDir, projection.revisions[0]!.snapshotRelativePath),
    ).resolves.toBe("outside workspace");
    expect(localEvents[0]?.payload).toEqual(artifact);
  });

  it("publishes an absolute file without a workspace binding", async () => {
    const { run, memoryDir, localEvents } = await createRunHarness({ workspaceId: null });
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      projectionStore,
      snapshotStore,
    });

    const outsideRoot = await createTempDir();
    const outsideFilePath = path.join(outsideRoot, "no-workspace.md");
    await fs.writeFile(outsideFilePath, "absolute without workspace", "utf-8");

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: outsideFilePath,
    });

    expect(artifact.path).toBe(await normalizePublishedPath(outsideFilePath));
    expect((await projectionStore.readProjection(memoryDir)).summaries).toEqual([artifact]);
    expect(localEvents).toHaveLength(1);
  });

  it("rejects relative paths without a workspace binding before persisting", async () => {
    const { run, memoryDir, localEvents } = await createRunHarness({ workspaceId: null });
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      projectionStore,
      snapshotStore,
    });

    await expect(
      service.publishForRun({
        runId: run.runId,
        path: "docs/brief.md",
      }),
    ).rejects.toThrow("Published artifact relative paths require a workspace root.");

    expect(await projectionStore.readProjection(memoryDir)).toEqual(EMPTY_PUBLISHED_ARTIFACT_PROJECTION);
    expect(await fs.readdir(snapshotStore.getSnapshotRootPath(memoryDir)).catch(() => [])).toEqual([]);
    expect(localEvents).toEqual([]);
  });

  it("publishes workspace-relative symlink escapes and snapshots the resolved target content", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });

    const outsideRoot = await createTempDir();
    const outsideFilePath = path.join(outsideRoot, "secret.txt");
    await fs.writeFile(outsideFilePath, "outside workspace", "utf-8");
    await fs.symlink(outsideRoot, path.join(workspaceRoot, "escape"), "dir");

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: "escape/secret.txt",
    });

    const projection = await projectionStore.readProjection(memoryDir);
    expect(artifact.path).toBe(await normalizePublishedPath(outsideFilePath));
    expect(projection.summaries).toEqual([artifact]);
    await expect(
      snapshotStore.readRevisionText(memoryDir, projection.revisions[0]!.snapshotRelativePath),
    ).resolves.toBe("outside workspace");
    expect(localEvents[0]?.payload).toEqual(artifact);
  });

  it("serves revision text from the snapshot after the outside source file is deleted", async () => {
    const { run, workspaceRoot, memoryDir } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });
    const projectionService = new PublishedArtifactProjectionService({
      projectionStore,
      snapshotStore,
    });

    const outsideRoot = await createTempDir();
    const outsideFilePath = path.join(outsideRoot, "durable.md");
    await fs.writeFile(outsideFilePath, "durable snapshot content", "utf-8");

    const artifact = await service.publishForRun({
      runId: run.runId,
      path: outsideFilePath,
    });
    await fs.rm(outsideFilePath);

    await expect(
      projectionService.getPublishedArtifactRevisionTextFromMemoryDir({
        memoryDir,
        revisionId: artifact.revisionId,
      }),
    ).resolves.toBe("durable snapshot content");
  });

  it("keeps one artifact identity while appending new revisions for repeated publication of the same path", async () => {
    vi.useFakeTimers();
    const { run, workspaceRoot, memoryDir } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
    });

    const filePath = path.join(workspaceRoot, "docs", "brief.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    vi.setSystemTime(new Date("2026-04-22T08:00:00.000Z"));
    await fs.writeFile(filePath, "first revision", "utf-8");
    const firstArtifact = await service.publishForRun({
      runId: run.runId,
      path: "docs/brief.md",
      description: "First pass",
    });

    vi.setSystemTime(new Date("2026-04-22T08:05:00.000Z"));
    await fs.writeFile(filePath, "second revision", "utf-8");
    const secondArtifact = await service.publishForRun({
      runId: run.runId,
      path: "docs/brief.md",
      description: "Second pass",
    });

    const projection = await projectionStore.readProjection(memoryDir);
    expect(firstArtifact.id).toBe(secondArtifact.id);
    expect(firstArtifact.revisionId).not.toBe(secondArtifact.revisionId);
    expect(firstArtifact.createdAt).toBe("2026-04-22T08:00:00.000Z");
    expect(secondArtifact.createdAt).toBe("2026-04-22T08:00:00.000Z");
    expect(secondArtifact.updatedAt).toBe("2026-04-22T08:05:00.000Z");
    expect(projection.summaries).toHaveLength(1);
    expect(projection.revisions).toHaveLength(2);
    expect(projection.revisions.map((revision) => revision.revisionId)).toEqual([
      firstArtifact.revisionId,
      secondArtifact.revisionId,
    ]);
  });

  it("rejects invalid source files before persisting", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });

    await fs.mkdir(path.join(workspaceRoot, "docs"), { recursive: true });

    await expect(
      service.publishForRun({
        runId: run.runId,
        path: "docs",
      }),
    ).rejects.toThrow("does not resolve to a readable regular file");

    expect(await projectionStore.readProjection(memoryDir)).toEqual(EMPTY_PUBLISHED_ARTIFACT_PROJECTION);
    expect(await fs.readdir(snapshotStore.getSnapshotRootPath(memoryDir)).catch(() => [])).toEqual([]);
    expect(localEvents).toEqual([]);
  });

  it("cleans up a revision directory when the source disappears during snapshot copy", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const projectionStore = new PublishedArtifactProjectionStore();
    class SourceDeletingSnapshotStore extends PublishedArtifactSnapshotStore {
      override async snapshotArtifact(input: {
        memoryDir: string;
        revisionId: string;
        sourceAbsolutePath: string;
      }): Promise<{ snapshotRelativePath: string; sourceFileName: string }> {
        await fs.rm(input.sourceAbsolutePath);
        return super.snapshotArtifact(input);
      }
    }
    const snapshotStore = new SourceDeletingSnapshotStore();
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });

    const filePath = path.join(workspaceRoot, "docs", "brief.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "will disappear", "utf-8");

    await expect(
      service.publishForRun({
        runId: run.runId,
        path: "docs/brief.md",
      }),
    ).rejects.toThrow("could not be snapshotted");

    expect(await projectionStore.readProjection(memoryDir)).toEqual(EMPTY_PUBLISHED_ARTIFACT_PROJECTION);
    expect(await fs.readdir(snapshotStore.getSnapshotRootPath(memoryDir)).catch(() => [])).toEqual([]);
    expect(localEvents).toEqual([]);
  });

  it("cleans up the snapshot when projection persistence fails", async () => {
    const { run, workspaceRoot, memoryDir, localEvents } = await createRunHarness();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const projectionStore = {
      readProjection: vi.fn().mockResolvedValue(EMPTY_PUBLISHED_ARTIFACT_PROJECTION),
      writeProjection: vi.fn().mockRejectedValue(new Error("projection write failed")),
    } as any;
    const service = createService({
      run,
      workspaceRoot,
      projectionStore,
      snapshotStore,
    });

    const filePath = path.join(workspaceRoot, "docs", "brief.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "cleanup me", "utf-8");

    await expect(
      service.publishForRun({
        runId: run.runId,
        path: "docs/brief.md",
      }),
    ).rejects.toThrow("projection write failed");

    expect(await fs.readdir(snapshotStore.getSnapshotRootPath(memoryDir)).catch(() => [])).toEqual([]);
    expect(localEvents).toEqual([]);
  });

  it("publishes for a team-member runtime fallback without requiring AgentRunManager authority for the member run", async () => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const emitArtifactPersisted = vi.fn();
    const relayArtifactForExecutionContext = vi.fn().mockResolvedValue(undefined);
    const service = new PublishedArtifactPublicationService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      publishedArtifactRelayService: {
        relayArtifactForExecutionContext,
      } as any,
      projectionStore,
      snapshotStore,
    });

    const filePath = path.join(workspaceRoot, "brief-studio", "research.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Research findings", "utf-8");

    const applicationExecutionContext = {
      applicationId: "app-1",
      bindingId: "binding-1",
      producer: {
        runId: "team-run-1",
        memberRouteKey: "researcher",
        memberName: "Researcher",
        displayName: "Researcher",
        runtimeKind: "AGENT_TEAM_MEMBER",
        teamPath: [],
      },
    } as const;

    const artifact = await service.publishForRun({
      runId: "researcher_member_run",
      path: "brief-studio/research.md",
      description: "Research checkpoint",
      fallbackRuntimeContext: {
        memoryDir,
        workspaceRootPath: workspaceRoot,
        applicationExecutionContext,
        emitArtifactPersisted,
      },
    });

    const projection = await projectionStore.readProjection(memoryDir);
    const expectedPath = await normalizePublishedPath(filePath);
    expect(artifact).toMatchObject({
      runId: "researcher_member_run",
      path: expectedPath,
      type: "file",
      status: "available",
      description: "Research checkpoint",
      revisionId: expect.any(String),
    });
    expect(projection.summaries).toEqual([artifact]);
    expect(projection.revisions).toHaveLength(1);
    expect(emitArtifactPersisted).toHaveBeenCalledWith(artifact);
    expect(relayArtifactForExecutionContext).toHaveBeenCalledWith({
      runId: "researcher_member_run",
      applicationExecutionContext,
      artifact,
    });
  });

  it("rejects inactive runs before persisting when no team-member fallback authority is available", async () => {
    const workspaceRoot = await createTempDir();
    const memoryDir = await createTempDir();
    const projectionStore = new PublishedArtifactProjectionStore();
    const snapshotStore = new PublishedArtifactSnapshotStore();
    const service = new PublishedArtifactPublicationService({
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(null),
      } as any,
      projectionStore,
      snapshotStore,
    });

    const filePath = path.join(workspaceRoot, "brief-studio", "research.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Research findings", "utf-8");

    await expect(
      service.publishForRun({
        runId: "researcher_member_run",
        path: "brief-studio/research.md",
        fallbackRuntimeContext: {
          memoryDir,
          workspaceRootPath: workspaceRoot,
        },
      }),
    ).rejects.toThrow("Run 'researcher_member_run' is not active.");

    expect(await projectionStore.readProjection(memoryDir)).toEqual(EMPTY_PUBLISHED_ARTIFACT_PROJECTION);
    expect(await fs.readdir(snapshotStore.getSnapshotRootPath(memoryDir)).catch(() => [])).toEqual([]);
  });
});
