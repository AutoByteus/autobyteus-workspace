import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  CollaborationExecutionLocationService,
  locatedLaunchConfiguration,
  type LocatedCollaborationAgentExecution,
} from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { StandaloneRootLocationService } from "../../standalone-agent-run-root/services/standalone-root-location-service.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { canonicalizeRunFileChangePath, resolveRunFileChangeAbsolutePath } from "../../services/run-file-changes/run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "../../services/run-file-changes/run-file-change-projection-normalizer.js";
import { RunFileChangeProjectionStore, getRunFileChangeProjectionStore } from "../../services/run-file-changes/run-file-change-projection-store.js";
import { resolveRunFileChangeWorkspaceRootPath } from "../../services/run-file-changes/run-file-change-runtime.js";
import { RunFileChangeService, getRunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import type { RunFileChangeEntry, RunFileChangeProjection } from "../../services/run-file-changes/run-file-change-types.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentRunMetadataService, getAgentRunMetadataService } from "./agent-run-metadata-service.js";
import { createStoredTeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";

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

export class RunFileChangeProjectionService {
  private readonly injectedAgentRuns: AgentRunManager | null;
  private readonly agentMetadata: AgentRunMetadataService;
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly injectedChanges: RunFileChangeService | null;
  private readonly workspaces: WorkspaceManager;
  private readonly collaborationLocations: Pick<CollaborationExecutionLocationService, "findAgent">;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    metadataService?: AgentRunMetadataService;
    projectionStore?: RunFileChangeProjectionStore;
    runFileChangeService?: RunFileChangeService;
    workspaceManager?: WorkspaceManager;
    collaborationLocations?: Pick<CollaborationExecutionLocationService, "findAgent">;
    memoryDir?: string;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.injectedAgentRuns = options.agentRunManager ?? null;
    this.agentMetadata = options.metadataService ?? getAgentRunMetadataService();
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.injectedChanges = options.runFileChangeService ?? null;
    this.workspaces = options.workspaceManager ?? getWorkspaceManager();
    this.collaborationLocations = options.collaborationLocations ?? new CollaborationExecutionLocationService({
      teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
      orgs: new AgentOrgExecutionTreeLocationService({ memoryDir }),
      agents: new StandaloneRootLocationService({ memoryDir }),
    });
  }

  async getProjection(runId: string): Promise<RunFileChangeEntry[]> {
    return (await this.readProjectionContext(runId)).projection.entries;
  }

  async getEntry(runId: string, filePath: string): Promise<RunFileChangeEntry | null> {
    return (await this.resolveEntry(runId, filePath))?.entry ?? null;
  }

  async resolveEntry(runId: string, filePath: string): Promise<ResolvedRunFileChangeEntry | null> {
    const context = await this.readProjectionContext(runId);
    const canonical = canonicalizeRunFileChangePath(filePath, context.workspaceRootPath);
    if (!canonical) return null;
    const entry = context.projection.entries.find((candidate) => candidate.path === canonical) ?? null;
    return entry ? {
      entry,
      absolutePath: resolveRunFileChangeAbsolutePath(entry.path, context.workspaceRootPath),
      isActiveRun: context.isActiveRun,
    } : null;
  }

  /** The process run owners are resolved per call, so reads always reach the currently bound authority. */
  private agentRuns(): AgentRunManager {
    return this.injectedAgentRuns ?? AgentRunManager.getInstance();
  }

  private changes(): RunFileChangeService {
    return this.injectedChanges ?? getRunFileChangeService();
  }

  private async readProjectionContext(runId: string): Promise<ProjectionContext> {
    const activeStandalone = this.agentRuns().getActiveRun(runId);
    if (activeStandalone) return this.activeStandalone(activeStandalone);

    const standaloneMetadata = await this.agentMetadata.readMetadata(runId);
    if (standaloneMetadata?.memoryDir) {
      return {
        projection: normalizeRunFileChangeProjection(
          await this.projectionStore.readProjection(standaloneMetadata.memoryDir),
          { runId, workspaceRootPath: standaloneMetadata.workspaceRootPath ?? null },
        ),
        workspaceRootPath: standaloneMetadata.workspaceRootPath ?? null,
        isActiveRun: false,
      };
    }

    const location = await this.collaborationLocations.findAgent({ agentRunId: runId });
    if (!location) return { projection: { version: 2, entries: [] }, workspaceRootPath: null, isActiveRun: false };
    const workspaceRootPath = this.workspaceRootPath(location);
    return {
      projection: location.isActive
        ? await this.changes().getProjectionForCollaborationMember({
            agentRunId: location.agentRunId,
            memoryDir: location.memoryDir,
            workspaceRootPath,
          })
        : normalizeRunFileChangeProjection(
            await this.projectionStore.readProjection(location.memoryDir),
            { runId, workspaceRootPath },
          ),
      workspaceRootPath,
      isActiveRun: location.isActive,
    };
  }

  private workspaceRootPath(location: LocatedCollaborationAgentExecution): string | null {
    return locatedLaunchConfiguration(location)?.workspaceRootPath ?? null;
  }

  private async activeStandalone(run: AgentRun): Promise<ProjectionContext> {
    return {
      projection: await this.changes().getProjectionForRun(run),
      workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaces),
      isActiveRun: true,
    };
  }
}

let cachedRunFileChangeProjectionService: RunFileChangeProjectionService | null = null;
export const getRunFileChangeProjectionService = (): RunFileChangeProjectionService =>
  cachedRunFileChangeProjectionService ??= new RunFileChangeProjectionService();
