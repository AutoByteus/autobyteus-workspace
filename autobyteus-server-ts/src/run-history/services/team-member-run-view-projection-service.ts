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
import {
  TeamMemberMemoryProjectionReader,
  getTeamMemberMemoryProjectionReader,
} from "../../agent-memory/services/team-member-memory-projection-reader.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunMemberMetadata } from "../store/team-run-metadata-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

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
  bindings: TeamRunMemberMetadata[],
  memberRouteKey: string,
): TeamRunMemberMetadata | null => {
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
  summary: string | null;
  lastActivityAt: string | null;
}

const resolveMemberWorkspaceRootPath = (
  member: TeamRunMemberMetadata,
  teamWorkspaceRootPath: string | null | undefined,
): string =>
  member.workspaceRootPath ?? teamWorkspaceRootPath ?? process.cwd();

const resolveTeamMemberMemoryLayout = (): TeamMemberMemoryLayout =>
  new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());

const toMemberRunMetadata = (
  teamRunId: string,
  member: TeamRunMemberMetadata,
  teamWorkspaceRootPath: string | null | undefined,
): AgentRunMetadata => ({
  runId: member.memberRunId,
  agentDefinitionId: member.agentDefinitionId,
  workspaceRootPath: resolveMemberWorkspaceRootPath(member, teamWorkspaceRootPath),
  memoryDir: resolveTeamMemberMemoryLayout().getMemberDirPath(teamRunId, member.memberRunId),
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
  member: TeamRunMemberMetadata,
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
  private readonly projectionReader: TeamMemberMemoryProjectionReader;
  private readonly agentRunViewProjectionService: AgentRunViewProjectionService;

  constructor(options: {
    teamRunHistoryService?: TeamRunHistoryService;
    projectionReader?: TeamMemberMemoryProjectionReader;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
  } = {}) {
    this.teamRunHistoryService = options.teamRunHistoryService ?? getTeamRunHistoryService();
    this.projectionReader = options.projectionReader ?? getTeamMemberMemoryProjectionReader();
    this.agentRunViewProjectionService =
      options.agentRunViewProjectionService ??
      new AgentRunViewProjectionService(appConfigProvider.config.getMemoryDir());
  }

  async getProjection(teamRunId: string, memberRouteKey: string): Promise<TeamMemberRunProjection> {
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const normalizedMemberRouteKey = normalizeRequiredString(memberRouteKey, "memberRouteKey");
    const resumeConfig = await this.teamRunHistoryService.getTeamRunResumeConfig(normalizedTeamRunId);
    const binding = resolveMemberBinding(
      resumeConfig.metadata.memberMetadata,
      normalizedMemberRouteKey,
    );

    if (!binding) {
      throw new Error(
        `Member route key '${normalizedMemberRouteKey}' not found for team run '${normalizedTeamRunId}'.`,
      );
    }
    const memberMetadataWithLivePlatformId: TeamRunMemberMetadata = {
      ...binding,
      platformAgentRunId:
        resolveLivePlatformAgentRunId(normalizedTeamRunId, binding) ?? binding.platformAgentRunId,
    };

    let projection: RunProjection | null = null;
    let projectionReadError: unknown = null;
    try {
      projection = await this.projectionReader.getProjection(
        normalizedTeamRunId,
        binding.memberRunId,
      );
    } catch (error) {
      projectionReadError = error;
    }
    projection = await this.agentRunViewProjectionService.getProjectionFromMetadata({
      runId: binding.memberRunId,
      metadata: toMemberRunMetadata(
        normalizedTeamRunId,
        memberMetadataWithLivePlatformId,
        resumeConfig.metadata.memberMetadata.find((member) => member.workspaceRootPath)?.workspaceRootPath ?? null,
      ),
      localProjection: projection,
      allowFallbackProvider: false,
    });

    if (projection.conversation.length === 0 && projectionReadError) {
      throw projectionReadError;
    }

    return {
      agentRunId: projection.runId,
      conversation: projection.conversation,
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
