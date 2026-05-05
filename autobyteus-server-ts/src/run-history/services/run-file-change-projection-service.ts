import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { TeamMemberRunConfig } from "../../agent-team-execution/domain/team-run-config.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "./agent-run-metadata-service.js";
import {
  TeamRunMetadataService,
  getTeamRunMetadataService,
} from "./team-run-metadata-service.js";
import type { TeamRunMemberMetadata } from "../store/team-run-metadata-types.js";
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

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class RunFileChangeProjectionService {
  private readonly agentRunManager: AgentRunManager;
  private teamRunManager: AgentTeamRunManager | null;
  private readonly metadataService: AgentRunMetadataService;
  private teamMetadataService: TeamRunMetadataService | null;
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly runFileChangeService: RunFileChangeService;
  private readonly workspaceManager: WorkspaceManager;
  private readonly teamLayout: TeamMemberMemoryLayout;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    teamRunManager?: AgentTeamRunManager;
    metadataService?: AgentRunMetadataService;
    teamMetadataService?: TeamRunMetadataService;
    projectionStore?: RunFileChangeProjectionStore;
    runFileChangeService?: RunFileChangeService;
    workspaceManager?: WorkspaceManager;
    memoryDir?: string;
  } = {}) {
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.teamRunManager = options.teamRunManager ?? null;
    this.metadataService = options.metadataService ?? getAgentRunMetadataService();
    this.teamMetadataService = options.teamMetadataService ?? null;
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.runFileChangeService = options.runFileChangeService ?? getRunFileChangeService();
    this.workspaceManager = options.workspaceManager ?? getWorkspaceManager();
    this.teamLayout = new TeamMemberMemoryLayout(
      options.memoryDir ?? appConfigProvider.config.getMemoryDir(),
    );
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
    if (metadata?.memoryDir) {
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

    const activeTeamMember = await this.findActiveTeamMember(runId);
    if (activeTeamMember) {
      return this.readActiveTeamMemberProjectionContext(activeTeamMember.teamRun, runId);
    }

    const historicalTeamMember = await this.findHistoricalTeamMember(runId);
    if (historicalTeamMember) {
      return this.readHistoricalTeamMemberProjectionContext(historicalTeamMember);
    }

    return {
      projection: {
        version: 2,
        entries: [],
      },
      workspaceRootPath,
      isActiveRun: false,
    };
  }

  private async readHistoricalTeamMemberProjectionContext(input: {
    teamRunId: string;
    member: TeamRunMemberMetadata;
  }): Promise<ProjectionContext> {
    const workspaceRootPath = input.member.workspaceRootPath ?? null;
    const memoryDir = this.teamLayout.getMemberDirPath(
      input.teamRunId,
      input.member.memberRunId,
    );
    const projection = normalizeRunFileChangeProjection(
      await this.projectionStore.readProjection(memoryDir),
      {
        runId: input.member.memberRunId,
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

  private async readActiveTeamMemberProjectionContext(
    teamRun: TeamRun,
    memberRunId: string,
  ): Promise<ProjectionContext> {
    const memberConfig = this.resolveTeamMemberConfig(teamRun, memberRunId);
    const workspaceRootPath =
      normalizeOptionalString(memberConfig?.workspaceRootPath)
      ?? this.resolveWorkspaceRootPath(memberConfig?.workspaceId);

    return {
      projection: await this.runFileChangeService.getProjectionForTeamMemberRun(
        teamRun,
        memberRunId,
      ),
      workspaceRootPath,
      isActiveRun: true,
    };
  }

  private async findActiveTeamMember(
    memberRunId: string,
  ): Promise<{ teamRun: TeamRun; memberConfig: TeamMemberRunConfig } | null> {
    const teamRunManager = this.getTeamRunManager();
    for (const teamRunId of teamRunManager.listActiveRuns()) {
      const teamRun = teamRunManager.getTeamRun(teamRunId);
      const memberConfig = teamRun ? this.resolveTeamMemberConfig(teamRun, memberRunId) : null;
      if (teamRun && memberConfig) {
        return { teamRun, memberConfig };
      }
    }
    return null;
  }

  private async findHistoricalTeamMember(
    memberRunId: string,
  ): Promise<{ teamRunId: string; member: TeamRunMemberMetadata } | null> {
    const teamMetadataService = this.getTeamMetadataService();
    for (const teamRunId of await teamMetadataService.listTeamRunIds()) {
      const metadata = await teamMetadataService.readMetadata(teamRunId);
      const member = metadata?.memberMetadata.find(
        (candidate) => candidate.memberRunId === memberRunId,
      ) ?? null;
      if (member) {
        return { teamRunId, member };
      }
    }
    return null;
  }

  private resolveTeamMemberConfig(
    teamRun: TeamRun,
    memberRunId: string,
  ): TeamMemberRunConfig | null {
    return (
      teamRun.config?.memberConfigs.find(
        (candidate) => candidate.memberRunId === memberRunId,
      ) ?? null
    );
  }

  private resolveWorkspaceRootPath(workspaceId: string | null | undefined): string | null {
    const normalizedWorkspaceId = normalizeOptionalString(workspaceId);
    if (!normalizedWorkspaceId) {
      return null;
    }
    return this.workspaceManager.getWorkspaceById(normalizedWorkspaceId)?.getBasePath() ?? null;
  }

  private getTeamRunManager(): AgentTeamRunManager {
    if (!this.teamRunManager) {
      this.teamRunManager = AgentTeamRunManager.getInstance();
    }
    return this.teamRunManager;
  }

  private getTeamMetadataService(): TeamRunMetadataService {
    if (!this.teamMetadataService) {
      this.teamMetadataService = getTeamRunMetadataService();
    }
    return this.teamMetadataService;
  }
}

let cachedRunFileChangeProjectionService: RunFileChangeProjectionService | null = null;

export const getRunFileChangeProjectionService = (): RunFileChangeProjectionService => {
  if (!cachedRunFileChangeProjectionService) {
    cachedRunFileChangeProjectionService = new RunFileChangeProjectionService();
  }
  return cachedRunFileChangeProjectionService;
};
