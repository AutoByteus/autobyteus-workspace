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
  TeamRunMemberMetadata,
  TeamRunMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

const compactOptional = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeDateString = (value: string | null | undefined): string | null => {
  const normalized = compactOptional(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const flattenMembers = (members: readonly TeamRunMemberMetadata[]): TeamRunMemberMetadata[] => (
  members.flatMap((member) => [
    member,
    ...(member.memberKind === "agent_team" ? flattenMembers(member.memberTree) : []),
  ])
);

const findMember = (metadata: TeamRunMetadata | null, input: {
  memberAgentRunId: string | null;
  memberRouteKey: string | null;
}): TeamRunMemberMetadata | null => {
  if (!metadata) return null;
  const members = flattenMembers(metadata.memberTree);
  return members.find((member) => Boolean(input.memberAgentRunId && member.memberRunId === input.memberAgentRunId)) ??
    members.find((member) => Boolean(input.memberRouteKey && member.memberRouteKey === input.memberRouteKey)) ??
    null;
};

export class TokenUsageDisplayFieldCapturer {
  constructor(private readonly dependencies: {
    agentCatalog?: Pick<AgentRunHistoryCatalogService, "getCatalogRow">;
    teamCatalog?: Pick<TeamRunHistoryCatalogService, "getCatalogRow">;
    agentMetadata?: Pick<AgentRunMetadataService, "readMetadata">;
    teamMetadata?: Pick<TeamRunMetadataService, "readMetadata">;
  } = {}) {}

  async capture(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    return payload.root_team_run_id
      ? this.captureTeamUsage(payload, payload.root_team_run_id)
      : this.captureStandaloneUsage(payload);
  }

  private async captureStandaloneUsage(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const [catalogRow, metadata] = await Promise.all([
      this.getAgentCatalog().getCatalogRow(payload.run_id).catch(() => null),
      this.getAgentMetadata().readMetadata(payload.run_id).catch(() => null),
    ]);

    return {
      ...payload,
      team_name: compactOptional(payload.team_name),
      agent_name: compactOptional(payload.agent_name) ?? compactOptional(catalogRow?.agentName),
      run_summary: compactOptional(payload.run_summary) ?? compactOptional(catalogRow?.summary),
      run_created_at: normalizeDateString(payload.run_created_at) ??
        normalizeDateString(catalogRow?.createdAt) ??
        normalizeDateString(metadata?.preparedAt) ??
        normalizeDateString(metadata?.startedAt),
      member_name: compactOptional(payload.member_name),
    };
  }

  private async captureTeamUsage(
    payload: TokenUsageUpdatedPayload,
    teamRunId: string,
  ): Promise<TokenUsageUpdatedPayload> {
    const [catalogRow, metadata] = await Promise.all([
      this.getTeamCatalog().getCatalogRow(teamRunId).catch(() => null),
      this.getTeamMetadata().readMetadata(teamRunId).catch(() => null),
    ]);
    const member = findMember(metadata, {
      memberAgentRunId: payload.member_agent_run_id ?? payload.run_id,
      memberRouteKey: payload.member_route_key,
    });

    return {
      ...payload,
      team_name: compactOptional(payload.team_name) ??
        compactOptional(catalogRow?.teamDefinitionName) ??
        compactOptional(metadata?.teamDefinitionName),
      agent_name: compactOptional(payload.agent_name),
      run_summary: compactOptional(payload.run_summary) ?? compactOptional(catalogRow?.summary),
      run_created_at: normalizeDateString(payload.run_created_at) ??
        normalizeDateString(catalogRow?.createdAt) ??
        normalizeDateString(metadata?.createdAt),
      member_name: compactOptional(payload.member_name) ??
        compactOptional(member?.memberName) ??
        compactOptional(payload.member_route_key),
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
}
