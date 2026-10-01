import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveInterAgentSenderAddresses } from "../projection/run-projection-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "./agent-run-view-projection-service.js";
import { TeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";
import { collaboratorExecutionSource } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";

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
      conversation: resolveInterAgentSenderAddresses(projection.conversation, (runId) =>
        new TeamExecutionIndex(location.tree).getAgent(runId)?.address ?? null),
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
    if (!location.configuredPlacement && !collaboratorExecutionSource(location.tree.rootTeam.collaborators, location.memberAddress)) {
      throw new Error(`AgentRun '${run}' has no configured launch placement or collaborator source.`);
    }
    return location;
  }
}

const metadataFor = (
  location: import("./team-run-execution-tree-location-service.js").LocatedTeamAgentExecution,
): AgentRunMetadata => {
  const configured = location.configuredPlacement;
  // A collaborator run has no configured placement: its entry supplies the definition and settings.
  const source = configured ?? collaboratorExecutionSource(location.tree.rootTeam.collaborators, location.memberAddress)!;
  const launch = source.launchConfiguration;
  return {
    runId: location.agentRunId,
    agentDefinitionId: source.agentDefinitionId,
    workspaceRootPath: launch.workspaceRootPath ?? process.cwd(),
    memoryDir: location.memoryDir,
    llmModelIdentifier: launch.llmModelIdentifier,
    llmConfig: launch.llmConfig as Record<string, unknown> | null,
    autoExecuteTools: launch.autoExecuteTools,
    runtimeKind: launch.runtimeKind as AgentRunMetadata["runtimeKind"],
    platformAgentRunId: configured
      ? configured.platformAgentRunId
      : new TeamExecutionIndex(location.tree).getAgent(location.agentRunId)?.source.platformAgentRunId ?? null,
  };
};

let cachedTeamMemberRunViewProjectionService: TeamMemberRunViewProjectionService | null = null;
export const getTeamMemberRunViewProjectionService = (): TeamMemberRunViewProjectionService =>
  cachedTeamMemberRunViewProjectionService ??= new TeamMemberRunViewProjectionService();
