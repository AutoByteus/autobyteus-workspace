import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { inferArtifactType } from "../../utils/artifact-utils.js";
import {
  buildPublishedArtifactIdentity,
  canonicalizePublishedArtifactPath,
  isPublishedArtifactPathWithinRoot,
  resolvePublishedArtifactAbsolutePath,
} from "./published-artifact-path-identity.js";
import {
  PublishedArtifactProjectionStore,
  getPublishedArtifactProjectionStore,
} from "./published-artifact-projection-store.js";
import {
  PublishedArtifactSnapshotStore,
  getPublishedArtifactSnapshotStore,
} from "./published-artifact-snapshot-store.js";
import {
  EMPTY_PUBLISHED_ARTIFACT_PROJECTION,
  normalizePublishedArtifactType,
  type PublishedArtifactProjection,
  type PublishedArtifactRevision,
  type PublishedArtifactSummary,
} from "./published-artifact-types.js";

const normalizeOptionalDescription = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const cloneProjection = (
  projection: PublishedArtifactProjection,
): PublishedArtifactProjection => structuredClone(projection);

export class PublishedArtifactPublicationService {
  constructor(
    private readonly dependencies: {
      agentRunManager?: AgentRunManager;
      workspaceManager?: WorkspaceManager;
      projectionStore?: PublishedArtifactProjectionStore;
      snapshotStore?: PublishedArtifactSnapshotStore;
    } = {},
  ) {}

  private get agentRunManager(): AgentRunManager {
    return this.dependencies.agentRunManager ?? AgentRunManager.getInstance();
  }

  private get workspaceManager(): WorkspaceManager {
    return this.dependencies.workspaceManager ?? getWorkspaceManager();
  }

  private get projectionStore(): PublishedArtifactProjectionStore {
    return this.dependencies.projectionStore ?? getPublishedArtifactProjectionStore();
  }

  private get snapshotStore(): PublishedArtifactSnapshotStore {
    return this.dependencies.snapshotStore ?? getPublishedArtifactSnapshotStore();
  }

  async publishForRun(input: {
    runId: string;
    path: string;
    description?: string | null;
  }): Promise<PublishedArtifactSummary> {
    const run = this.agentRunManager.getActiveRun(input.runId);
    if (!run) {
      throw new Error(`Run '${input.runId}' is not active.`);
    }
    if (!run.config.memoryDir?.trim()) {
      throw new Error(`Run '${input.runId}' is missing a durable memory directory.`);
    }
    if (!run.config.workspaceId?.trim()) {
      throw new Error(`Run '${input.runId}' is missing a workspace binding.`);
    }

    const workspace = await this.workspaceManager.getOrCreateWorkspace(run.config.workspaceId);
    const workspaceRootPath = workspace.getBasePath();
    const canonicalPath = canonicalizePublishedArtifactPath(input.path, workspaceRootPath);
    if (!canonicalPath) {
      throw new Error("publish_artifact path must resolve to a file inside the current workspace.");
    }

    const absolutePath = resolvePublishedArtifactAbsolutePath(canonicalPath, workspaceRootPath);
    if (!absolutePath) {
      throw new Error("publish_artifact path could not be resolved inside the current workspace.");
    }

    const sourceStat = await fs.stat(absolutePath).catch(() => null);
    if (!sourceStat?.isFile()) {
      throw new Error(`publish_artifact path '${canonicalPath}' does not resolve to a readable file.`);
    }

    const realWorkspaceRootPath = await fs.realpath(workspaceRootPath).catch(() => null);
    const realAbsolutePath = await fs.realpath(absolutePath).catch(() => null);
    if (
      !realWorkspaceRootPath
      || !realAbsolutePath
      || !isPublishedArtifactPathWithinRoot(realWorkspaceRootPath, realAbsolutePath)
    ) {
      throw new Error("publish_artifact path must resolve to a file inside the current workspace.");
    }

    const projection = run.config.memoryDir
      ? await this.projectionStore.readProjection(run.config.memoryDir)
      : cloneProjection(EMPTY_PUBLISHED_ARTIFACT_PROJECTION);
    const publishedAt = new Date().toISOString();
    const revisionId = randomUUID();
    const { artifactId } = buildPublishedArtifactIdentity(run.runId, canonicalPath);
    const description = normalizeOptionalDescription(input.description);
    const artifactType = normalizePublishedArtifactType(inferArtifactType(canonicalPath));

    const snapshot = await this.snapshotStore.snapshotArtifact({
      memoryDir: run.config.memoryDir,
      revisionId,
      sourceAbsolutePath: realAbsolutePath,
    });

    try {
      const nextProjection = this.buildNextProjection({
        projection,
        artifactId,
        runId: run.runId,
        canonicalPath,
        description,
        artifactType,
        revisionId,
        publishedAt,
        snapshotRelativePath: snapshot.snapshotRelativePath,
        sourceFileName: snapshot.sourceFileName,
      });
      await this.projectionStore.writeProjection(run.config.memoryDir, nextProjection);
      const summary = nextProjection.summaries.find((candidate) => candidate.id === artifactId);
      if (!summary) {
        throw new Error(`Published artifact '${artifactId}' was not persisted.`);
      }

      run.emitLocalEvent({
        eventType: AgentRunEventType.ARTIFACT_PERSISTED,
        runId: run.runId,
        statusHint: null,
        payload: structuredClone(summary) as Record<string, unknown>,
      });
      return structuredClone(summary);
    } catch (error) {
      await this.snapshotStore.deleteRevisionSnapshot(run.config.memoryDir, snapshot.snapshotRelativePath).catch(() => undefined);
      throw error;
    }
  }

  private buildNextProjection(input: {
    projection: PublishedArtifactProjection;
    artifactId: string;
    runId: string;
    canonicalPath: string;
    description: string | null;
    artifactType: PublishedArtifactSummary["type"];
    revisionId: string;
    publishedAt: string;
    snapshotRelativePath: string;
    sourceFileName: string;
  }): PublishedArtifactProjection {
    const nextProjection = cloneProjection(input.projection);
    const existingSummaryIndex = nextProjection.summaries.findIndex((summary) => summary.id === input.artifactId);
    const existingSummary = existingSummaryIndex >= 0 ? nextProjection.summaries[existingSummaryIndex] : null;

    const nextSummary: PublishedArtifactSummary = {
      id: input.artifactId,
      runId: input.runId,
      path: input.canonicalPath,
      type: input.artifactType,
      status: "available",
      description: input.description,
      revisionId: input.revisionId,
      createdAt: existingSummary?.createdAt ?? input.publishedAt,
      updatedAt: input.publishedAt,
    };

    const nextRevision: PublishedArtifactRevision = {
      revisionId: input.revisionId,
      artifactId: input.artifactId,
      runId: input.runId,
      path: input.canonicalPath,
      type: input.artifactType,
      description: input.description,
      createdAt: input.publishedAt,
      snapshotRelativePath: input.snapshotRelativePath,
      sourceFileName: input.sourceFileName,
    };

    if (existingSummaryIndex >= 0) {
      nextProjection.summaries.splice(existingSummaryIndex, 1, nextSummary);
    } else {
      nextProjection.summaries.push(nextSummary);
    }
    nextProjection.revisions.push(nextRevision);
    return nextProjection;
  }
}

let cachedPublishedArtifactPublicationService: PublishedArtifactPublicationService | null = null;

export const getPublishedArtifactPublicationService = (): PublishedArtifactPublicationService => {
  if (!cachedPublishedArtifactPublicationService) {
    cachedPublishedArtifactPublicationService = new PublishedArtifactPublicationService();
  }
  return cachedPublishedArtifactPublicationService;
};
