import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "./agent-run-metadata-service.js";
import {
  RunFileChangeProjectionStore,
  getRunFileChangeProjectionStore,
} from "../../services/run-file-changes/run-file-change-projection-store.js";
import {
  RunFileChangeService,
  getRunFileChangeService,
} from "../../services/run-file-changes/run-file-change-service.js";
import type { RunFileChangeEntry, RunFileChangeProjection } from "../../services/run-file-changes/run-file-change-types.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  canonicalizeRunFileChangePath,
  resolveRunFileChangeAbsolutePath,
} from "../../services/run-file-changes/run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "../../services/run-file-changes/run-file-change-projection-normalizer.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { resolveRunFileChangeWorkspaceRootPath } from "../../services/run-file-changes/run-file-change-runtime.js";

export interface ResolvedRunFileChangeEntry {
  entry: RunFileChangeEntry;
  absolutePath: string | null;
  isActiveRun: boolean;
}

interface ProjectionContext {
  projection: RunFileChangeProjection;
  workspaceRootPath: string | null;
  isActiveRun: boolean;
}

export class RunFileChangeProjectionService {
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly runFileChangeService: RunFileChangeService;
  private readonly workspaceManager: WorkspaceManager;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    metadataService?: AgentRunMetadataService;
    projectionStore?: RunFileChangeProjectionStore;
    runFileChangeService?: RunFileChangeService;
    workspaceManager?: WorkspaceManager;
  } = {}) {
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = options.metadataService ?? getAgentRunMetadataService();
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.runFileChangeService = options.runFileChangeService ?? getRunFileChangeService();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
  }

  async getProjection(runId: string): Promise<RunFileChangeEntry[]> {
    const context = await this.readProjectionContext(runId);
    return context.projection.entries;
  }

  async getEntry(runId: string, filePath: string): Promise<RunFileChangeEntry | null> {
    const resolved = await this.resolveEntry(runId, filePath);
    return resolved?.entry ?? null;
  }

  async resolveEntry(runId: string, filePath: string): Promise<ResolvedRunFileChangeEntry | null> {
    const context = await this.readProjectionContext(runId);
    const canonicalPath = canonicalizeRunFileChangePath(filePath, context.workspaceRootPath);
    if (!canonicalPath) {
      return null;
    }

    const entry = context.projection.entries.find((candidate) => candidate.path === canonicalPath) ?? null;
    if (!entry) {
      return null;
    }

    return {
      entry,
      absolutePath: resolveRunFileChangeAbsolutePath(entry.path, context.workspaceRootPath),
      isActiveRun: context.isActiveRun,
    };
  }

  private async readProjectionContext(runId: string): Promise<ProjectionContext> {
    const activeRun = this.agentRunManager.getActiveRun(runId);
    if (activeRun) {
      return this.readActiveRunProjectionContext(activeRun);
    }

    const metadata = await this.metadataService.readMetadata(runId);
    const workspaceRootPath = metadata?.workspaceRootPath ?? null;
    if (!metadata?.memoryDir) {
      return {
        projection: {
          version: 2,
          entries: [],
        },
        workspaceRootPath,
        isActiveRun: false,
      };
    }

    const projection = normalizeRunFileChangeProjection(
      await this.projectionStore.readProjection(metadata.memoryDir),
      {
        runId,
        workspaceRootPath,
      },
    );

    return {
      projection,
      workspaceRootPath,
      isActiveRun: false,
    };
  }

  private async readActiveRunProjectionContext(run: AgentRun): Promise<ProjectionContext> {
    return {
      projection: await this.runFileChangeService.getProjectionForRun(run),
      workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaceManager),
      isActiveRun: true,
    };
  }
}

let cachedRunFileChangeProjectionService: RunFileChangeProjectionService | null = null;

export const getRunFileChangeProjectionService = (): RunFileChangeProjectionService => {
  if (!cachedRunFileChangeProjectionService) {
    cachedRunFileChangeProjectionService = new RunFileChangeProjectionService();
  }
  return cachedRunFileChangeProjectionService;
};
