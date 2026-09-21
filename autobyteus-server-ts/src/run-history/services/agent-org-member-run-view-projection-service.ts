import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "./agent-run-view-projection-service.js";
import {
  AgentOrgExecutionTreeLocationService,
  type LocatedAgentOrgAgentExecution,
} from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import { TokenUsageRunStore } from "../../token-usage/providers/token-usage-run-store.js";
import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export interface AgentOrgMemberRunProjection {
  agentRunId: string;
  memberAddress: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

export class AgentOrgMemberRunViewProjectionService {
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: AgentOrgExecutionTreeLocationService;
  private readonly tokenUsage: TokenUsageRunStore;

  constructor(options: {
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: AgentOrgExecutionTreeLocationService;
    tokenUsage?: TokenUsageRunStore;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new AgentOrgExecutionTreeLocationService({
      memoryDir,
      manager: AgentOrgRunManager.getInstance(),
    });
    this.tokenUsage = options.tokenUsage ?? new TokenUsageRunStore();
  }

  async getProjection(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
  ): Promise<AgentOrgMemberRunProjection> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const projection = await this.agentViews.getRequiredProjectionFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
    });
    return {
      agentRunId: projection.runId,
      memberAddress: location.memberAddress,
      conversation: projection.conversation,
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  async getActiveTracePage(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
    beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePage> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    return this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `org:${location.rootRunId}:member:${location.memberAddress}:agent:${location.agentRunId}`,
    });
  }

  async getTokenUsageSummary(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
  ): Promise<TokenUsageRunSummaryPayload> {
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const summary = await this.tokenUsage.getAgentRunSummary(location.agentRunId);
    if (summary.run_id !== location.agentRunId || summary.root_team_run_id !== null) {
      throw new Error(`AgentOrg token usage for '${location.agentRunId}' has incompatible root identity.`);
    }
    return summary;
  }

  private async requireLocation(orgRunId: string, memberAddress: string, agentRunId: string) {
    const root = required(orgRunId, "orgRunId");
    const address = required(memberAddress, "memberAddress");
    const run = required(agentRunId, "agentRunId");
    const location = await this.locations.findAgent({
      rootRunId: root,
      memberAddress: address,
      agentRunId: run,
    });
    if (!location || location.rootRunId !== root || location.memberAddress !== address) {
      throw new Error(`AgentRun '${run}' at '${address}' was not found in AgentOrg '${root}'.`);
    }
    if (!location.configuredPlacement) {
      throw new Error(`AgentRun '${run}' has no configured AgentOrg launch placement.`);
    }
    return location;
  }
}

const metadataFor = (location: LocatedAgentOrgAgentExecution): AgentRunMetadata => {
  const configured = location.configuredPlacement!;
  return {
    runId: location.agentRunId,
    agentDefinitionId: configured.agentDefinitionId,
    workspaceRootPath: configured.launchConfiguration.workspaceRootPath ?? process.cwd(),
    memoryDir: location.memoryDir,
    llmModelIdentifier: configured.launchConfiguration.llmModelIdentifier,
    llmConfig: configured.launchConfiguration.llmConfig as Record<string, unknown> | null,
    autoExecuteTools: configured.launchConfiguration.autoExecuteTools,
    skillAccessMode: configured.launchConfiguration.skillAccessMode,
    runtimeKind: configured.launchConfiguration.runtimeKind as AgentRunMetadata["runtimeKind"],
    platformAgentRunId: location.platformAgentRunId,
  };
};

let cached: AgentOrgMemberRunViewProjectionService | null = null;
export const getAgentOrgMemberRunViewProjectionService = (): AgentOrgMemberRunViewProjectionService =>
  cached ??= new AgentOrgMemberRunViewProjectionService();
