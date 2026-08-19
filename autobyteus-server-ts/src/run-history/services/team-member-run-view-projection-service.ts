import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "./agent-run-view-projection-service.js";
import { TeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
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

export class TeamMemberRunViewProjectionService {
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: TeamRunExecutionTreeLocationService;

  constructor(options: {
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: TeamRunExecutionTreeLocationService;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new TeamRunExecutionTreeLocationService({ memoryDir });
  }

  async getProjection(rootTeamRunId: string, agentRunId: string): Promise<TeamMemberRunProjection> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    const projection = await this.agentViews.getProjectionFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
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
    rootTeamRunId: string,
    agentRunId: string,
    beforeCursor?: string | null,
  ): Promise<EventMonitorActiveTracePage> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    return this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `team:${location.rootTeamRunId}:agent:${location.agentRunId}`,
    });
  }

  private async requireLocation(rootTeamRunId: string, agentRunId: string) {
    const root = required(rootTeamRunId, "rootTeamRunId");
    const run = required(agentRunId, "agentRunId");
    const location = await this.locations.findAgent({ agentRunId: run });
    if (!location || location.rootTeamRunId !== root) {
      throw new Error(`AgentRun '${run}' was not found in root TeamRun '${root}'.`);
    }
    if (!location.configuredPlacement) {
      throw new Error(`AgentRun '${run}' has no configured launch placement.`);
    }
    return location;
  }
}

const metadataFor = (
  location: import("./team-run-execution-tree-location-service.js").LocatedTeamAgentExecution,
): AgentRunMetadata => {
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
    platformAgentRunId: "platformAgentRunId" in configured ? configured.platformAgentRunId : null,
  };
};

let cachedTeamMemberRunViewProjectionService: TeamMemberRunViewProjectionService | null = null;
export const getTeamMemberRunViewProjectionService = (): TeamMemberRunViewProjectionService =>
  cachedTeamMemberRunViewProjectionService ??= new TeamMemberRunViewProjectionService();
