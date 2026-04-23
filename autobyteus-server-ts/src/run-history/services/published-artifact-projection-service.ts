import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "./agent-run-metadata-service.js";
import {
  PublishedArtifactProjectionStore,
  getPublishedArtifactProjectionStore,
} from "../../services/published-artifacts/published-artifact-projection-store.js";
import {
  PublishedArtifactSnapshotStore,
  getPublishedArtifactSnapshotStore,
} from "../../services/published-artifacts/published-artifact-snapshot-store.js";
import type {
  PublishedArtifactProjection,
  PublishedArtifactRevision,
  PublishedArtifactSummary,
} from "../../services/published-artifacts/published-artifact-types.js";
import { EMPTY_PUBLISHED_ARTIFACT_PROJECTION } from "../../services/published-artifacts/published-artifact-types.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";

interface ProjectionContext {
  memoryDir: string | null;
  projection: PublishedArtifactProjection;
  isActiveRun: boolean;
}

export class PublishedArtifactProjectionService {
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly projectionStore: PublishedArtifactProjectionStore;
  private readonly snapshotStore: PublishedArtifactSnapshotStore;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    metadataService?: AgentRunMetadataService;
    projectionStore?: PublishedArtifactProjectionStore;
    snapshotStore?: PublishedArtifactSnapshotStore;
  } = {}) {
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = options.metadataService ?? getAgentRunMetadataService();
    this.projectionStore = options.projectionStore ?? getPublishedArtifactProjectionStore();
    this.snapshotStore = options.snapshotStore ?? getPublishedArtifactSnapshotStore();
  }

  async getRunPublishedArtifacts(runId: string): Promise<PublishedArtifactSummary[]> {
    const context = await this.readProjectionContext(runId);
    return structuredClone(context.projection.summaries);
  }

  async getPublishedArtifactsFromMemoryDir(memoryDir: string): Promise<PublishedArtifactSummary[]> {
    const projection = await this.projectionStore.readProjection(memoryDir);
    return structuredClone(projection.summaries);
  }

  async getRevision(runId: string, revisionId: string): Promise<PublishedArtifactRevision | null> {
    const context = await this.readProjectionContext(runId);
    return (
      structuredClone(
        context.projection.revisions.find((candidate) => candidate.revisionId === revisionId) ?? null,
      )
    );
  }

  async getPublishedArtifactRevisionText(input: {
    runId: string;
    revisionId: string;
  }): Promise<string | null> {
    const resolved = await this.resolveRevision(input.runId, input.revisionId);
    if (!resolved?.memoryDir) {
      return null;
    }
    return this.snapshotStore.readRevisionText(resolved.memoryDir, resolved.revision.snapshotRelativePath);
  }

  async getPublishedArtifactRevisionTextFromMemoryDir(input: {
    memoryDir: string;
    revisionId: string;
  }): Promise<string | null> {
    const projection = await this.projectionStore.readProjection(input.memoryDir);
    const revision =
      projection.revisions.find((candidate) => candidate.revisionId === input.revisionId) ?? null;
    if (!revision) {
      return null;
    }
    return this.snapshotStore.readRevisionText(input.memoryDir, revision.snapshotRelativePath);
  }

  async resolveRevision(runId: string, revisionId: string): Promise<{
    revision: PublishedArtifactRevision;
    absolutePath: string;
    memoryDir: string;
    isActiveRun: boolean;
  } | null> {
    const context = await this.readProjectionContext(runId);
    if (!context.memoryDir) {
      return null;
    }

    const revision = context.projection.revisions.find((candidate) => candidate.revisionId === revisionId) ?? null;
    if (!revision) {
      return null;
    }

    return {
      revision: structuredClone(revision),
      absolutePath: this.snapshotStore.resolveSnapshotAbsolutePath(context.memoryDir, revision.snapshotRelativePath),
      memoryDir: context.memoryDir,
      isActiveRun: context.isActiveRun,
    };
  }

  private async readProjectionContext(runId: string): Promise<ProjectionContext> {
    const activeRun = this.agentRunManager.getActiveRun(runId);
    if (activeRun) {
      return this.readActiveRunProjectionContext(activeRun);
    }

    const metadata = await this.metadataService.readMetadata(runId);
    const memoryDir = metadata?.memoryDir ?? null;
    if (!memoryDir) {
      return {
        memoryDir: null,
        projection: structuredClone(EMPTY_PUBLISHED_ARTIFACT_PROJECTION),
        isActiveRun: false,
      };
    }

    return {
      memoryDir,
      projection: await this.projectionStore.readProjection(memoryDir),
      isActiveRun: false,
    };
  }

  private async readActiveRunProjectionContext(run: AgentRun): Promise<ProjectionContext> {
    const memoryDir = run.config.memoryDir ?? null;
    return {
      memoryDir,
      projection: memoryDir
        ? await this.projectionStore.readProjection(memoryDir)
        : structuredClone(EMPTY_PUBLISHED_ARTIFACT_PROJECTION),
      isActiveRun: true,
    };
  }
}

let cachedPublishedArtifactProjectionService: PublishedArtifactProjectionService | null = null;
let cachedPublishedArtifactProjectionMemoryDir: string | null = null;

export const getPublishedArtifactProjectionService = (): PublishedArtifactProjectionService => {
  const memoryDir = appConfigProvider.config.getMemoryDir();
  if (
    !cachedPublishedArtifactProjectionService
    || cachedPublishedArtifactProjectionMemoryDir !== memoryDir
  ) {
    cachedPublishedArtifactProjectionService = new PublishedArtifactProjectionService();
    cachedPublishedArtifactProjectionMemoryDir = memoryDir;
  }
  return cachedPublishedArtifactProjectionService;
};
