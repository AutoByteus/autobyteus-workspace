import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  locatedLaunchConfiguration,
  type LocatedCollaborationAgentExecution,
} from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { canonicalizeRunFileChangePath, resolveRunFileChangeAbsolutePath } from "../../services/run-file-changes/run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "../../services/run-file-changes/run-file-change-projection-normalizer.js";
import { RunFileChangeProjectionStore, getRunFileChangeProjectionStore } from "../../services/run-file-changes/run-file-change-projection-store.js";
import { resolveRunFileChangeWorkspaceRootPath } from "../../services/run-file-changes/run-file-change-runtime.js";
import { RunFileChangeService, getRunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import type { RunFileChangeEntry, RunFileChangeProjection } from "../../services/run-file-changes/run-file-change-types.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentRunMetadataService, getAgentRunMetadataService } from "./agent-run-metadata-service.js";

export interface ResolvedRunFileChangeEntry {
  entry: RunFileChangeEntry;
  absolutePath: string | null;
  isActiveRun: boolean;
}

type ProjectionContext = {
  projection: RunFileChangeProjection;
  workspaceRootPath: string | null;
  isActiveRun: boolean;
};

/**
 * File-change reads of two subjects: a standalone run named by its run id, and a collaboration
 * member its caller (the member's family member-view service) already located. It never locates
 * members itself, so no read searches saved team, org or hub trees.
 */
export class RunFileChangeProjectionService {
  private readonly injectedAgentRuns: AgentRunManager | null;
  private readonly agentMetadata: AgentRunMetadataService;
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly injectedChanges: RunFileChangeService | null;
  private readonly workspaces: WorkspaceManager;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    metadataService?: AgentRunMetadataService;
    projectionStore?: RunFileChangeProjectionStore;
    runFileChangeService?: RunFileChangeService;
    workspaceManager?: WorkspaceManager;
  } = {}) {
    this.injectedAgentRuns = options.agentRunManager ?? null;
    this.agentMetadata = options.metadataService ?? getAgentRunMetadataService();
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.injectedChanges = options.runFileChangeService ?? null;
    this.workspaces = options.workspaceManager ?? getWorkspaceManager();
  }

  /** A standalone run's artifacts; any other run id has none. */
  async getStandaloneRunProjection(runId: string): Promise<RunFileChangeEntry[]> {
    return (await this.standaloneRun(runId))?.projection.entries ?? [];
  }

  /** One recorded file change of a standalone run; null for any other run id. */
  async resolveStandaloneRunEntry(runId: string, filePath: string): Promise<ResolvedRunFileChangeEntry | null> {
    const context = await this.standaloneRun(runId);
    return context ? entryIn(context, filePath) : null;
  }

  /**
   * Artifacts of a collaboration member its caller already located: the live projection while its
   * root is active, else the member's stored `file_changes.json`.
   */
  async getLocatedCollaborationMemberProjection(location: LocatedCollaborationAgentExecution): Promise<RunFileChangeEntry[]> {
    return (await this.locatedCollaborationMember(location)).projection.entries;
  }

  /** One recorded file change of a collaboration member its caller already located. */
  async resolveLocatedCollaborationMemberEntry(
    location: LocatedCollaborationAgentExecution,
    filePath: string,
  ): Promise<ResolvedRunFileChangeEntry | null> {
    return entryIn(await this.locatedCollaborationMember(location), filePath);
  }

  /** The process run owners are resolved per call, so reads always reach the currently bound authority. */
  private agentRuns(): AgentRunManager {
    return this.injectedAgentRuns ?? AgentRunManager.getInstance();
  }

  private changes(): RunFileChangeService {
    return this.injectedChanges ?? getRunFileChangeService();
  }

  /**
   * A run is standalone exactly when it has standalone run metadata. Collaboration members share
   * the activation registry, so being active does not make a run standalone: metadata decides
   * first, then the live run (while active) or the stored projection serves it.
   */
  private async standaloneRun(runId: string): Promise<ProjectionContext | null> {
    const metadata = await this.agentMetadata.readMetadata(runId);
    if (!metadata) return null;
    const activeRun = this.agentRuns().getActiveRun(runId);
    if (activeRun) return this.activeStandalone(activeRun);
    const workspaceRootPath = metadata.workspaceRootPath ?? null;
    return {
      projection: normalizeRunFileChangeProjection(
        await this.projectionStore.readProjection(metadata.memoryDir),
        { runId, workspaceRootPath },
      ),
      workspaceRootPath,
      isActiveRun: false,
    };
  }

  private async locatedCollaborationMember(location: LocatedCollaborationAgentExecution): Promise<ProjectionContext> {
    const workspaceRootPath = locatedLaunchConfiguration(location)?.workspaceRootPath ?? null;
    return {
      projection: location.isActive
        ? await this.changes().getProjectionForCollaborationMember({
            agentRunId: location.agentRunId,
            memoryDir: location.memoryDir,
            workspaceRootPath,
          })
        : normalizeRunFileChangeProjection(
            await this.projectionStore.readProjection(location.memoryDir),
            { runId: location.agentRunId, workspaceRootPath },
          ),
      workspaceRootPath,
      isActiveRun: location.isActive,
    };
  }

  private async activeStandalone(run: AgentRun): Promise<ProjectionContext> {
    return {
      projection: await this.changes().getProjectionForRun(run),
      workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaces),
      isActiveRun: true,
    };
  }
}

/** The recorded entry at `filePath` (canonicalized against the context's workspace) and its absolute path. */
const entryIn = (context: ProjectionContext, filePath: string): ResolvedRunFileChangeEntry | null => {
  const canonical = canonicalizeRunFileChangePath(filePath, context.workspaceRootPath);
  if (!canonical) return null;
  const entry = context.projection.entries.find((candidate) => candidate.path === canonical) ?? null;
  return entry ? {
    entry,
    absolutePath: resolveRunFileChangeAbsolutePath(entry.path, context.workspaceRootPath),
    isActiveRun: context.isActiveRun,
  } : null;
};

let cachedRunFileChangeProjectionService: RunFileChangeProjectionService | null = null;
export const getRunFileChangeProjectionService = (): RunFileChangeProjectionService =>
  cachedRunFileChangeProjectionService ??= new RunFileChangeProjectionService();
