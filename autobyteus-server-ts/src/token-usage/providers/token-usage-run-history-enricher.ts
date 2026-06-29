import path from "node:path";
import {
  getAgentRunHistoryCatalogService,
  type AgentRunHistoryCatalogService,
} from "../../run-history/services/agent-run-history-catalog-service.js";
import {
  getAgentRunMetadataService,
  type AgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  getTeamRunHistoryCatalogService,
  type TeamRunHistoryCatalogService,
} from "../../run-history/services/team-run-history-catalog-service.js";
import {
  getTeamRunMetadataService,
  type TeamRunMetadataService,
} from "../../run-history/services/team-run-metadata-service.js";
import type {
  TeamRunAgentMemberMetadata,
  TeamRunMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import type {
  TokenUsageCreatedTimeSource,
  TokenUsageTaskRowDisplayMetadata,
} from "../domain/statistics-models.js";

export interface TokenUsageMemberDisplayMetadata {
  memberName: string;
  memberPath: string[];
  agentDefinitionId: string | null;
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
}

interface EnrichAgentRunInput {
  runId: string;
  firstObservedAt: string;
  fallbackAgentDefinitionId?: string | null;
  fallbackWorkspaceId?: string | null;
}

interface EnrichTeamRunInput {
  teamRunId: string;
  firstObservedAt: string;
}

interface EnrichMemberInput {
  rootTeamRunId: string;
  memberAgentRunId: string | null;
  memberRouteKey: string | null;
  memberPath: string[] | null;
  fallbackAgentDefinitionId: string | null;
  firstObservedAt: string;
}

const UNKNOWN_AGENT_LABEL = "Unknown agent run";
const UNKNOWN_TEAM_LABEL = "Unknown team run";
const UNKNOWN_MEMBER_LABEL = "Unknown member";
const UNASSIGNED_WORKSPACE_KEY = "unassigned-team-workspace";
const UNASSIGNED_WORKSPACE_LABEL = "Unassigned Team Workspace";

const compactOptional = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const workspaceNameFromRootPath = (workspaceRootPath: string | null | undefined): string | null => {
  const normalized = compactOptional(workspaceRootPath);
  if (!normalized) return null;
  if (normalized === UNASSIGNED_WORKSPACE_KEY) return UNASSIGNED_WORKSPACE_LABEL;
  const withoutTrailingSlash = normalized.replace(/\\/g, "/").replace(/\/+$/, "");
  const baseName = path.basename(withoutTrailingSlash);
  return baseName || withoutTrailingSlash;
};

const chooseCreatedAt = (
  historyCreatedAt: string | null | undefined,
  firstObservedAt: string,
): { createdAt: string; createdTimeSource: TokenUsageCreatedTimeSource } => {
  const createdAt = compactOptional(historyCreatedAt);
  return createdAt
    ? { createdAt, createdTimeSource: "RUN_HISTORY" }
    : { createdAt: firstObservedAt, createdTimeSource: "FIRST_USAGE_OBSERVED" };
};

const flattenMembers = (members: readonly TeamRunMemberMetadata[]): TeamRunMemberMetadata[] => (
  members.flatMap((member) => [
    member,
    ...(member.memberKind === "agent_team" ? flattenMembers(member.memberTree) : []),
  ])
);

const isAgentMember = (member: TeamRunMemberMetadata): member is TeamRunAgentMemberMetadata => (
  member.memberKind === "agent"
);

const findMember = (
  metadata: TeamRunMetadata | null,
  input: EnrichMemberInput,
): TeamRunMemberMetadata | null => {
  if (!metadata) return null;
  const members = flattenMembers(metadata.memberTree);
  return members.find((member) => (
    Boolean(input.memberAgentRunId && member.memberRunId === input.memberAgentRunId) ||
    Boolean(input.memberRouteKey && member.memberRouteKey === input.memberRouteKey)
  )) ?? null;
};

export class TokenUsageRunHistoryEnricher {
  constructor(private readonly dependencies: {
    agentCatalog?: Pick<AgentRunHistoryCatalogService, "getCatalogRow">;
    teamCatalog?: Pick<TeamRunHistoryCatalogService, "getCatalogRow">;
    agentMetadata?: Pick<AgentRunMetadataService, "readMetadata">;
    teamMetadata?: Pick<TeamRunMetadataService, "readMetadata">;
  } = {}) {}

  async enrichAgentRun(input: EnrichAgentRunInput): Promise<TokenUsageTaskRowDisplayMetadata> {
    const catalogRow = await this.getAgentCatalog().getCatalogRow(input.runId).catch(() => null);
    const metadata = catalogRow ? null : await this.getAgentMetadata().readMetadata(input.runId).catch(() => null);
    const workspaceRootPath = catalogRow?.workspaceRootPath ?? metadata?.workspaceRootPath ?? null;
    const created = chooseCreatedAt(catalogRow?.createdAt ?? metadata?.preparedAt ?? metadata?.startedAt, input.firstObservedAt);

    return {
      displayName: catalogRow?.agentName || input.fallbackAgentDefinitionId || UNKNOWN_AGENT_LABEL,
      summary: compactOptional(catalogRow?.summary) ?? null,
      workspaceName: workspaceNameFromRootPath(workspaceRootPath) ?? input.fallbackWorkspaceId ?? null,
      workspaceRootPath,
      ...created,
    };
  }

  async enrichTeamRun(input: EnrichTeamRunInput): Promise<TokenUsageTaskRowDisplayMetadata> {
    const [catalogRow, metadata] = await Promise.all([
      this.getTeamCatalog().getCatalogRow(input.teamRunId).catch(() => null),
      this.getTeamMetadata().readMetadata(input.teamRunId).catch(() => null),
    ]);
    const workspaceRootPath = catalogRow?.workspaceRootPath ?? this.resolveTeamWorkspaceRootPath(metadata) ?? null;
    const created = chooseCreatedAt(catalogRow?.createdAt ?? metadata?.createdAt, input.firstObservedAt);

    return {
      displayName: catalogRow?.teamDefinitionName || metadata?.teamDefinitionName || UNKNOWN_TEAM_LABEL,
      summary: compactOptional(catalogRow?.summary) ?? null,
      workspaceName: workspaceNameFromRootPath(workspaceRootPath),
      workspaceRootPath,
      ...created,
    };
  }

  async enrichMember(input: EnrichMemberInput): Promise<TokenUsageMemberDisplayMetadata> {
    const [teamMetadata, agentMetadata] = await Promise.all([
      this.getTeamMetadata().readMetadata(input.rootTeamRunId).catch(() => null),
      input.memberAgentRunId
        ? this.getAgentMetadata().readMetadata(input.memberAgentRunId).catch(() => null)
        : Promise.resolve(null),
    ]);
    const member = findMember(teamMetadata, input);
    const memberPath = member?.memberPath ?? input.memberPath ?? [];
    const agentDefinitionId = member?.memberKind === "agent"
      ? member.agentDefinitionId
      : input.fallbackAgentDefinitionId;
    const created = chooseCreatedAt(agentMetadata?.preparedAt ?? agentMetadata?.startedAt, input.firstObservedAt);

    return {
      memberName: member?.memberName || input.memberRouteKey || input.memberAgentRunId || UNKNOWN_MEMBER_LABEL,
      memberPath,
      agentDefinitionId: agentDefinitionId ?? null,
      ...created,
    };
  }

  private getAgentCatalog(): Pick<AgentRunHistoryCatalogService, "getCatalogRow"> {
    return this.dependencies.agentCatalog ?? getAgentRunHistoryCatalogService();
  }

  private getTeamCatalog(): Pick<TeamRunHistoryCatalogService, "getCatalogRow"> {
    return this.dependencies.teamCatalog ?? getTeamRunHistoryCatalogService();
  }

  private getAgentMetadata(): Pick<AgentRunMetadataService, "readMetadata"> {
    return this.dependencies.agentMetadata ?? getAgentRunMetadataService();
  }

  private getTeamMetadata(): Pick<TeamRunMetadataService, "readMetadata"> {
    return this.dependencies.teamMetadata ?? getTeamRunMetadataService();
  }

  private resolveTeamWorkspaceRootPath(metadata: TeamRunMetadata | null): string | null {
    if (!metadata) return null;
    const agentMembers = flattenMembers(metadata.memberTree).filter(isAgentMember);
    const coordinator = agentMembers.find((member) => member.memberRouteKey === metadata.coordinatorMemberRouteKey);
    return coordinator?.workspaceRootPath ?? agentMembers.find((member) => member.workspaceRootPath)?.workspaceRootPath ?? null;
  }
}
