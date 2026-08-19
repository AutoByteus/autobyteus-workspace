import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { canonicalizeRunFileChangePath, resolveRunFileChangeAbsolutePath } from "../../services/run-file-changes/run-file-change-path-identity.js";
import { normalizeRunFileChangeProjection } from "../../services/run-file-changes/run-file-change-projection-normalizer.js";
import { RunFileChangeProjectionStore, getRunFileChangeProjectionStore } from "../../services/run-file-changes/run-file-change-projection-store.js";
import { resolveRunFileChangeWorkspaceRootPath } from "../../services/run-file-changes/run-file-change-runtime.js";
import { RunFileChangeService, getRunFileChangeService } from "../../services/run-file-changes/run-file-change-service.js";
import type { RunFileChangeEntry, RunFileChangeProjection } from "../../services/run-file-changes/run-file-change-types.js";
import { getWorkspaceManager, type WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { AgentRunMetadataService, getAgentRunMetadataService } from "./agent-run-metadata-service.js";
import { TeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";

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
  private readonly agentRuns: AgentRunManager;
  private readonly teamRuns: AgentTeamRunManager;
  private readonly agentMetadata: AgentRunMetadataService;
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly changes: RunFileChangeService;
  private readonly workspaces: WorkspaceManager;
  private readonly teamLocations: TeamRunExecutionTreeLocationService;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    teamRunManager?: AgentTeamRunManager;
    metadataService?: AgentRunMetadataService;
    projectionStore?: RunFileChangeProjectionStore;
    runFileChangeService?: RunFileChangeService;
    workspaceManager?: WorkspaceManager;
    teamLocations?: TeamRunExecutionTreeLocationService;
    memoryDir?: string;
  } = {}) {
    this.agentRuns = options.agentRunManager ?? AgentRunManager.getInstance();
    this.teamRuns = options.teamRunManager ?? AgentTeamRunManager.getInstance();
    this.agentMetadata = options.metadataService ?? getAgentRunMetadataService();
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.changes = options.runFileChangeService ?? getRunFileChangeService();
    this.workspaces = options.workspaceManager ?? getWorkspaceManager();
    this.teamLocations = options.teamLocations ?? new TeamRunExecutionTreeLocationService({ memoryDir: options.memoryDir });
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

  private async readProjectionContext(runId: string): Promise<ProjectionContext> {
    const activeStandalone = this.agentRuns.getActiveRun(runId);
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

    const team = await this.teamLocations.findAgent({ agentRunId: runId });
    if (!team) return { projection: { version: 2, entries: [] }, workspaceRootPath: null, isActiveRun: false };
    const workspaceRootPath = team.configuredPlacement?.launchConfiguration.workspaceRootPath ?? null;
    const managedRoot = this.teamRuns.getManagedTeamRun(team.rootTeamRunId);
    if (managedRoot) return {
      projection: await this.changes.getProjectionForTeamMemberRun(managedRoot, runId),
      workspaceRootPath,
      isActiveRun: true,
    };
    return {
      projection: normalizeRunFileChangeProjection(
        await this.projectionStore.readProjection(team.memoryDir),
        { runId, workspaceRootPath },
      ),
      workspaceRootPath,
      isActiveRun: false,
    };
  }

  private async activeStandalone(run: AgentRun): Promise<ProjectionContext> {
    return {
      projection: await this.changes.getProjectionForRun(run),
      workspaceRootPath: resolveRunFileChangeWorkspaceRootPath(run, this.workspaces),
      isActiveRun: true,
    };
  }
}

let cachedRunFileChangeProjectionService: RunFileChangeProjectionService | null = null;
export const getRunFileChangeProjectionService = (): RunFileChangeProjectionService =>
  cachedRunFileChangeProjectionService ??= new RunFileChangeProjectionService();
