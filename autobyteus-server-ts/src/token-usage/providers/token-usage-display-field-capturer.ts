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
  createStoredCollaborationExecutionLocationService,
  type LocatedCollaborationAgentExecution,
} from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
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

export class TokenUsageDisplayFieldCapturer {
  constructor(private readonly dependencies: {
    agentCatalog?: Pick<AgentRunHistoryCatalogService, "getCatalogRow">;
    teamCatalog?: Pick<TeamRunHistoryCatalogService, "getCatalogRow">;
    agentMetadata?: Pick<AgentRunMetadataService, "readMetadata">;
    executionLocation?: Readonly<{
      findAgent(input: { agentRunId: string }): Promise<LocatedCollaborationAgentExecution | null>;
    }>;
  } = {}) {}

  async capture(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const located = await this.getExecutionLocation().findAgent({ agentRunId: payload.run_id }).catch(() => null);
    if (located?.rootSubjectKind === "agent_org") return this.captureOrgUsage(payload, located);
    return payload.root_team_run_id
      ? this.captureTeamUsage(payload, payload.root_team_run_id, located)
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
      member_display_name: compactOptional(payload.member_display_name),
    };
  }

  private async captureTeamUsage(
    payload: TokenUsageUpdatedPayload,
    teamRunId: string,
    prelocated: LocatedCollaborationAgentExecution | null,
  ): Promise<TokenUsageUpdatedPayload> {
    const [catalogRow, located] = await Promise.all([
      this.getTeamCatalog().getCatalogRow(teamRunId).catch(() => null),
      prelocated
        ? Promise.resolve(prelocated)
        : this.getExecutionLocation().findAgent({ agentRunId: payload.run_id }).catch(() => null),
    ]);
    const tree = located?.rootSubjectKind === "agent_team" && located.rootRunId === teamRunId
      ? located.tree
      : null;

    return {
      ...payload,
      team_name: compactOptional(payload.team_name) ??
        compactOptional(catalogRow?.teamDefinitionName) ??
        compactOptional(tree?.rootTeam.teamDefinitionName),
      agent_name: compactOptional(payload.agent_name),
      run_summary: compactOptional(payload.run_summary) ?? compactOptional(catalogRow?.summary),
      run_created_at: normalizeDateString(payload.run_created_at) ??
        normalizeDateString(catalogRow?.createdAt) ??
        normalizeDateString(tree?.createdAt),
      member_display_name: compactOptional(payload.member_display_name) ??
        compactOptional(located?.memberAddress),
    };
  }

  private captureOrgUsage(
    payload: TokenUsageUpdatedPayload,
    located: Extract<LocatedCollaborationAgentExecution, { rootSubjectKind: "agent_org" }>,
  ): TokenUsageUpdatedPayload {
    return {
      ...payload,
      team_name: compactOptional(payload.team_name)
        ?? compactOptional(located.tree.rootOrg.orgDefinitionName),
      agent_name: compactOptional(payload.agent_name),
      run_summary: compactOptional(payload.run_summary),
      run_created_at: normalizeDateString(payload.run_created_at)
        ?? normalizeDateString(located.tree.createdAt),
      member_display_name: compactOptional(payload.member_display_name)
        ?? compactOptional(located.memberAddress),
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

  private getExecutionLocation(): NonNullable<typeof this.dependencies.executionLocation> {
    return this.dependencies.executionLocation
      ?? createStoredCollaborationExecutionLocationService(appConfigProvider.config.getMemoryDir());
  }
}
