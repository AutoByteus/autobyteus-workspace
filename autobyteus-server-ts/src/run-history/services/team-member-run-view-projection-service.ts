import {
  AgentRunViewProjectionService,
  type RunProjection,
} from "./agent-run-view-projection-service.js";
import {
  getTeamRunHistoryService,
  TeamRunHistoryService,
} from "./team-run-history-service.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  getRuntimeMemberContexts,
  type RuntimeTeamRunContext,
  type TeamMemberRuntimeContext,
  type TeamSubTeamMemberRuntimeContext,
} from "../../agent-team-execution/domain/team-run-context.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunAgentMemberMetadata } from "../store/team-run-metadata-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { resolveTeamWorkspaceRootPath } from "./team-run-metadata-flattener.js";
import {
  AgentMemoryLocationService,
  getAgentMemoryLocationService,
} from "../../agent-memory/services/agent-memory-location-service.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export interface TeamMemberRunProjection {
  agentRunId: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

const resolveMemberWorkspaceRootPath = (
  member: TeamRunAgentMemberMetadata,
  teamWorkspaceRootPath: string | null | undefined,
): string =>
  member.workspaceRootPath ?? teamWorkspaceRootPath ?? process.cwd();

const toMemberRunMetadata = (
  member: TeamRunAgentMemberMetadata,
  teamWorkspaceRootPath: string | null | undefined,
  memberMemoryDir: string,
): AgentRunMetadata => ({
  runId: member.agentRunId,
  agentDefinitionId: member.agentDefinitionId,
  workspaceRootPath: resolveMemberWorkspaceRootPath(member, teamWorkspaceRootPath),
  memoryDir: memberMemoryDir,
  llmModelIdentifier: member.llmModelIdentifier,
  llmConfig: member.llmConfig ?? null,
  autoExecuteTools: member.autoExecuteTools,
  skillAccessMode: member.skillAccessMode,
  runtimeKind: member.runtimeKind,
  platformAgentRunId: member.platformAgentRunId,
});

const findRuntimeMemberContext = (
  runtimeContext: RuntimeTeamRunContext | null | undefined,
  member: TeamRunAgentMemberMetadata,
): TeamMemberRuntimeContext | null => {
  for (const candidate of getRuntimeMemberContexts(runtimeContext)) {
    if (
      candidate.kind === "agent" && (
        candidate.agentRunId === member.agentRunId || candidate.address === member.address
      )
    ) {
      return candidate;
    }
    if (candidate.kind === "agent_team") {
      const nested = findRuntimeMemberContext(
        (candidate as TeamSubTeamMemberRuntimeContext).childRuntimeContext ?? null,
        member,
      );
      if (nested) {
        return nested;
      }
    }
  }
  return null;
};

const resolveLivePlatformAgentRunId = (
  teamRunId: string,
  member: TeamRunAgentMemberMetadata,
): string | null => {
  const activeTeamRun = AgentTeamRunManager.getInstance().getActiveRun(teamRunId);
  if (!activeTeamRun) {
    return null;
  }

  const runtimeMemberContext = findRuntimeMemberContext(activeTeamRun.getRuntimeContext(), member);
  return runtimeMemberContext?.getPlatformAgentRunId() ?? null;
};

export class TeamMemberRunViewProjectionService {
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly agentRunViewProjectionService: AgentRunViewProjectionService;
  private readonly memoryLocationService: AgentMemoryLocationService;

  constructor(options: {
    memoryDir?: string;
    teamRunHistoryService?: TeamRunHistoryService;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    memoryLocationService?: AgentMemoryLocationService;
  } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.agentRunViewProjectionService =
      options.agentRunViewProjectionService ??
      new AgentRunViewProjectionService(appConfigProvider.config.getMemoryDir());
    this.memoryLocationService =
      options.memoryLocationService ??
      (options.memoryDir
        ? new AgentMemoryLocationService({ memoryDir: options.memoryDir })
        : getAgentMemoryLocationService());
  }

  async getProjection(teamRunId: string, memberAddress: string): Promise<TeamMemberRunProjection> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberAddress = normalizeRequiredString(memberAddress, "memberAddress");
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(normalizedTeamRunId);
    const target = this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
      resumeConfig.metadata,
      { memberAddress: normalizedMemberAddress },
      normalizedTeamRunId,
    );

    if (!target) {
      throw new Error(
        `Member address '${normalizedMemberAddress}' not found for team run '${normalizedTeamRunId}'.`,
      );
    }
    const binding = target.member;
    const memberMetadataWithLivePlatformId: TeamRunAgentMemberMetadata = {
      ...binding,
      platformAgentRunId:
        resolveLivePlatformAgentRunId(normalizedTeamRunId, binding) ?? binding.platformAgentRunId,
    };

    const projection = await this.agentRunViewProjectionService.getProjectionFromMetadata({
      runId: binding.agentRunId,
      metadata: toMemberRunMetadata(
        memberMetadataWithLivePlatformId,
        resolveTeamWorkspaceRootPath(resumeConfig.metadata),
        target.memoryDir,
      ),
    });

    return {
      agentRunId: projection.runId,
      conversation: projection.conversation,
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  async getActiveTracePage(
    teamRunId: string,
    memberAddress: string,
    beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePage> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberAddress = normalizeRequiredString(memberAddress, "memberAddress");
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(normalizedTeamRunId);
    const target = this.memoryLocationService.resolveTeamMemberLocationFromMetadata(
      resumeConfig.metadata,
      { memberAddress: normalizedMemberAddress },
      normalizedTeamRunId,
    );
    if (!target) {
      throw new Error(`Member address '${normalizedMemberAddress}' not found for team run '${normalizedTeamRunId}'.`);
    }
    const binding = target.member;
    return this.agentRunViewProjectionService.getActiveTracePageFromMetadata({
      runId: binding.agentRunId,
      metadata: toMemberRunMetadata(
        binding,
        resolveTeamWorkspaceRootPath(resumeConfig.metadata),
        target.memoryDir,
      ),
      beforeCursor,
      canonicalSubject: `team:${normalizedTeamRunId}:member:${normalizedMemberAddress}`,
    });
  }
}

let cachedTeamMemberRunViewProjectionService: TeamMemberRunViewProjectionService | null = null;

export const getTeamMemberRunViewProjectionService = (): TeamMemberRunViewProjectionService => {
  if (!cachedTeamMemberRunViewProjectionService) {
    cachedTeamMemberRunViewProjectionService = new TeamMemberRunViewProjectionService();
  }
  return cachedTeamMemberRunViewProjectionService;
};
