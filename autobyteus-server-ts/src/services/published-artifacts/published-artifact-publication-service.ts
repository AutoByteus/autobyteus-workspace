import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { ApplicationExecutionContext } from "../../application-orchestration/domain/models.js";
import {
  ApplicationPublishedArtifactRelayService,
  getApplicationPublishedArtifactRelayService,
} from "../../application-orchestration/services/application-published-artifact-relay-service.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { inferArtifactType } from "../../utils/artifact-utils.js";
import {
  buildPublishedArtifactIdentity,
  resolvePublishedArtifactSourcePath,
} from "./published-artifact-path-identity.js";
import {
  PublishedArtifactProjectionStore,
  getPublishedArtifactProjectionStore,
} from "./published-artifact-projection-store.js";
import {
  PublishedArtifactSnapshotStore,
  getPublishedArtifactSnapshotStore,
} from "./published-artifact-snapshot-store.js";
import type { PublishArtifactsToolArtifactInput } from "./published-artifact-tool-contract.js";
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

const normalizeOptionalNonEmptyString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type FallbackPublicationRuntimeContext = {
  memoryDir?: string | null;
  workspaceRootPath?: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;
  emitArtifactPersisted?: ((artifact: PublishedArtifactSummary) => void | Promise<void>) | null;
};

export class PublishedArtifactPublicationService {
  constructor(
    private readonly dependencies: {
      agentRunManager?: AgentRunManager;
      workspaceManager?: WorkspaceManager;
      publishedArtifactRelayService?: ApplicationPublishedArtifactRelayService;
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

  private get publishedArtifactRelayService(): ApplicationPublishedArtifactRelayService {
    return this.dependencies.publishedArtifactRelayService ?? getApplicationPublishedArtifactRelayService();
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
    fallbackRuntimeContext?: FallbackPublicationRuntimeContext | null;
  }): Promise<PublishedArtifactSummary> {
    const run = this.agentRunManager.getActiveRun(input.runId);
    const fallbackRuntimeContext = input.fallbackRuntimeContext ?? null;
    const emitArtifactPersisted = fallbackRuntimeContext?.emitArtifactPersisted ?? null;
    if (!run && !emitArtifactPersisted) {
      throw new Error(`Run '${input.runId}' is not active.`);
    }

    const memoryDir = run?.config.memoryDir?.trim()
      || normalizeOptionalNonEmptyString(fallbackRuntimeContext?.memoryDir)
      || null;
    if (!memoryDir) {
      throw new Error(`Run '${input.runId}' is missing a durable memory directory.`);
    }

    const workspaceRootPath = run?.config.workspaceId?.trim()
      ? normalizeOptionalNonEmptyString(
          (await this.workspaceManager.getOrCreateWorkspace(run.config.workspaceId)).getBasePath(),
        )
      : normalizeOptionalNonEmptyString(fallbackRuntimeContext?.workspaceRootPath);

    const applicationExecutionContext = run?.config.applicationExecutionContext
      ?? fallbackRuntimeContext?.applicationExecutionContext
      ?? null;

    const pathResolution = await resolvePublishedArtifactSourcePath(input.path, workspaceRootPath);
    if (!pathResolution.ok) {
      throw new Error(pathResolution.message);
    }
    const { canonicalPath, sourceAbsolutePath } = pathResolution;

    const sourceStat = await fs.stat(sourceAbsolutePath).catch(() => null);
    if (!sourceStat?.isFile()) {
      throw new Error(`Published artifact path '${canonicalPath}' does not resolve to a readable regular file.`);
    }

    const projection = await this.projectionStore.readProjection(memoryDir);
    const publishedAt = new Date().toISOString();
    const revisionId = randomUUID();
    const { artifactId } = buildPublishedArtifactIdentity(input.runId, canonicalPath);
    const description = normalizeOptionalDescription(input.description);
    const artifactType = normalizePublishedArtifactType(inferArtifactType(canonicalPath));

    const snapshot = await this.snapshotStore.snapshotArtifact({
      memoryDir,
      revisionId,
      sourceAbsolutePath,
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Published artifact path '${canonicalPath}' could not be snapshotted: ${message}`);
    });

    try {
      const nextProjection = this.buildNextProjection({
        projection,
        artifactId,
        runId: input.runId,
        canonicalPath,
        description,
        artifactType,
        revisionId,
        publishedAt,
        snapshotRelativePath: snapshot.snapshotRelativePath,
        sourceFileName: snapshot.sourceFileName,
      });
      await this.projectionStore.writeProjection(memoryDir, nextProjection);
      const summary = nextProjection.summaries.find((candidate) => candidate.id === artifactId);
      if (!summary) {
        throw new Error(`Published artifact '${artifactId}' was not persisted.`);
      }

      const clonedSummary = structuredClone(summary);
      if (run) {
        run.emitLocalEvent({
          eventType: AgentRunEventType.ARTIFACT_PERSISTED,
          runId: run.runId,
          statusHint: null,
          payload: structuredClone(clonedSummary) as Record<string, unknown>,
        });
      } else if (emitArtifactPersisted) {
        await emitArtifactPersisted(structuredClone(clonedSummary));
      } else {
        throw new Error(`Run '${input.runId}' is not active.`);
      }

      if (!run && applicationExecutionContext) {
        await this.publishedArtifactRelayService.relayArtifactForExecutionContext({
          runId: input.runId,
          applicationExecutionContext,
          artifact: structuredClone(clonedSummary),
        });
      }

      return clonedSummary;
    } catch (error) {
      await this.snapshotStore.deleteRevisionSnapshot(memoryDir, snapshot.snapshotRelativePath).catch(() => undefined);
      throw error;
    }
  }


  async publishManyForRun(input: {
    runId: string;
    artifacts: PublishArtifactsToolArtifactInput[];
    fallbackRuntimeContext?: FallbackPublicationRuntimeContext | null;
  }): Promise<PublishedArtifactSummary[]> {
    if (!Array.isArray(input.artifacts) || input.artifacts.length === 0) {
      throw new Error("At least one published artifact is required.");
    }

    const summaries: PublishedArtifactSummary[] = [];
    for (const artifact of input.artifacts) {
      const publishedArtifact = await this.publishForRun({
        runId: input.runId,
        path: artifact.path,
        description: artifact.description ?? null,
        fallbackRuntimeContext: input.fallbackRuntimeContext ?? null,
      });
      summaries.push(publishedArtifact);
    }
    return summaries;
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
