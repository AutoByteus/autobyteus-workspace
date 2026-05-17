import {
  AgentRunViewProjectionService,
  type RunProjection,
} from "./agent-run-view-projection-service.js";
import {
  getTeamRunHistoryService,
  TeamRunHistoryService,
} from "./team-run-history-service.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { getRuntimeMemberContexts } from "../../agent-team-execution/domain/team-run-context.js";
import { normalizeMemberRouteKey } from "../utils/team-member-run-id.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunAgentMemberMetadata } from "../store/team-run-metadata-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import {
  getTeamRunLeafAgentMetadata,
  resolveTeamWorkspaceRootPath,
} from "./team-run-metadata-flattener.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const toNormalizedMemberRouteKey = (value: string): string | null => {
  try {
    return normalizeMemberRouteKey(value);
  } catch {
    return null;
  }
};

const resolveMemberBinding = (
  bindings: TeamRunAgentMemberMetadata[],
  memberRouteKey: string,
): TeamRunAgentMemberMetadata | null => {
  const normalizedTarget = toNormalizedMemberRouteKey(memberRouteKey) ?? memberRouteKey.trim();

  for (const binding of bindings) {
    const routeKey =
      toNormalizedMemberRouteKey(binding.memberRouteKey) ?? binding.memberRouteKey.trim();
    if (routeKey === normalizedTarget) {
      return binding;
    }
    if (binding.memberName.trim() === memberRouteKey.trim()) {
      return binding;
    }
  }

  return null;
};

export interface TeamMemberRunProjection {
  agentRunId: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
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
  runId: member.memberRunId,
  agentDefinitionId: member.agentDefinitionId,
  workspaceRootPath: resolveMemberWorkspaceRootPath(member, teamWorkspaceRootPath),
  memoryDir: memberMemoryDir,
  llmModelIdentifier: member.llmModelIdentifier,
  llmConfig: member.llmConfig ?? null,
  autoExecuteTools: member.autoExecuteTools,
  skillAccessMode: member.skillAccessMode,
  runtimeKind: member.runtimeKind,
  platformAgentRunId: member.platformAgentRunId,
  lastKnownStatus: "IDLE",
});

const resolveLivePlatformAgentRunId = (
  teamRunId: string,
  member: TeamRunAgentMemberMetadata,
): string | null => {
  const activeTeamRun = AgentTeamRunManager.getInstance().getActiveRun(teamRunId);
  if (!activeTeamRun) {
    return null;
  }

  const runtimeMemberContext = getRuntimeMemberContexts(activeTeamRun.getRuntimeContext()).find(
    (candidate) =>
      candidate.memberRunId === member.memberRunId ||
      candidate.memberRouteKey === member.memberRouteKey,
  );
  return runtimeMemberContext?.getPlatformAgentRunId() ?? null;
};

export class TeamMemberRunViewProjectionService {
  private readonly teamRunHistoryService: TeamRunHistoryService;
  private readonly agentRunViewProjectionService: AgentRunViewProjectionService;
  private readonly memberLayout: TeamMemberMemoryLayout;

  constructor(options: {
    memoryDir?: string;
    teamRunHistoryService?: TeamRunHistoryService;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    memberMemoryLayout?: TeamMemberMemoryLayout;
  } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.agentRunViewProjectionService =
      options.agentRunViewProjectionService ??
      new AgentRunViewProjectionService(appConfigProvider.config.getMemoryDir());
    this.memberLayout =
      options.memberMemoryLayout ??
      new TeamMemberMemoryLayout(options.memoryDir ?? appConfigProvider.config.getMemoryDir());
  }

  async getProjection(teamRunId: string, memberRouteKey: string): Promise<TeamMemberRunProjection> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberRouteKey = normalizeRequiredString(memberRouteKey, "memberRouteKey");
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(normalizedTeamRunId);
    const leafMembers = getTeamRunLeafAgentMetadata(resumeConfig.metadata);
    const binding = resolveMemberBinding(
      leafMembers,
      normalizedMemberRouteKey,
    );

    if (!binding) {
      throw new Error(
        `Member route key '${normalizedMemberRouteKey}' not found for team run '${normalizedTeamRunId}'.`,
      );
    }
    const memberMetadataWithLivePlatformId: TeamRunAgentMemberMetadata = {
      ...binding,
      platformAgentRunId:
        resolveLivePlatformAgentRunId(normalizedTeamRunId, binding) ?? binding.platformAgentRunId,
    };

    const projection = await this.agentRunViewProjectionService.getProjectionFromMetadata({
      runId: binding.memberRunId,
      metadata: toMemberRunMetadata(
        memberMetadataWithLivePlatformId,
        resolveTeamWorkspaceRootPath(resumeConfig.metadata),
        this.memberLayout.getMemberDirPath(
          normalizedTeamRunId,
          memberMetadataWithLivePlatformId.memberRunId,
        ),
      ),
    });

    return {
      agentRunId: projection.runId,
      conversation: projection.conversation,
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
    };
  }
}

let cachedTeamMemberRunViewProjectionService: TeamMemberRunViewProjectionService | null = null;

export const getTeamMemberRunViewProjectionService = (): TeamMemberRunViewProjectionService => {
  if (!cachedTeamMemberRunViewProjectionService) {
    cachedTeamMemberRunViewProjectionService = new TeamMemberRunViewProjectionService();
  }
  return cachedTeamMemberRunViewProjectionService;
};
