import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveInterAgentSenderAddresses } from "../../run-history/projection/run-projection-types.js";
import { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";
import {
  catalogCopyExecutionSource,
  collaboratorExecutionSource,
  taskExecutionListsOf,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../../run-history/projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "../../run-history/services/agent-run-view-projection-service.js";
import {
  AgentRunCollaborationLocationService,
  type LocatedAgentRunCollaborationAgentExecution,
} from "./agent-run-collaboration-location-service.js";
import { AgentRunCollaborationRootManager } from "./agent-run-collaboration-root-manager.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export interface AgentRunCollaborationMemberRunProjection {
  agentRunId: string;
  memberAddress: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

/** Stored conversation projection of one Agent-root child (task Agent or task-Team member). */
export class AgentRunCollaborationMemberViewProjectionService {
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: AgentRunCollaborationLocationService;

  constructor(options: {
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: AgentRunCollaborationLocationService;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new AgentRunCollaborationLocationService({
      memoryDir,
      roots: { getActiveTree: (hostRunId) => AgentRunCollaborationRootManager.getInstance().getActiveTree(hostRunId) },
    });
  }

  async getProjection(hostRunId: string, memberAddress: string, agentRunId: string): Promise<AgentRunCollaborationMemberRunProjection> {
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    const projection = await this.agentViews.getRequiredProjectionFromMetadata({ runId: location.agentRunId, metadata: metadataFor(location) });
    return {
      agentRunId: projection.runId,
      memberAddress: location.memberAddress,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, (runId) =>
        new AgentRunCollaborationExecutionIndex(location.tree).getAgent(runId)?.address ?? null),
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  async getActiveTracePage(hostRunId: string, memberAddress: string, agentRunId: string, beforeCursor?: string | null): Promise<EventMonitorActiveTracePage> {
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    return this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `agent:${location.rootRunId}:member:${location.memberAddress}:agent:${location.agentRunId}`,
    });
  }

  private async requireLocation(hostRunId: string, memberAddress: string, agentRunId: string) {
    const root = required(hostRunId, "hostRunId");
    const address = required(memberAddress, "memberAddress");
    const run = required(agentRunId, "agentRunId");
    const location = await this.locations.findAgent({ rootRunId: root, memberAddress: address, agentRunId: run });
    if (!location || location.rootRunId !== root || location.memberAddress !== address
      || !childSourceOf(location)) {
      throw new Error(`AgentRun '${run}' at '${address}' was not found in the collaborators or catalog copies of Agent run '${root}'.`);
    }
    return location;
  }
}

/** A collaborator (or its extra copy) from its entry; a catalog copy from its recorded source. */
const childSourceOf = (location: LocatedAgentRunCollaborationAgentExecution) =>
  collaboratorExecutionSource(location.tree.collaborators, location.memberAddress)
  ?? catalogCopyExecutionSource(taskExecutionListsOf(location.tree), location.agentRunId);

const metadataFor = (location: LocatedAgentRunCollaborationAgentExecution): AgentRunMetadata => {
  const source = childSourceOf(location)!;
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
    platformAgentRunId: location.platformAgentRunId,
  };
};

let cached: AgentRunCollaborationMemberViewProjectionService | null = null;
export const getAgentRunCollaborationMemberViewProjectionService = (): AgentRunCollaborationMemberViewProjectionService =>
  cached ??= new AgentRunCollaborationMemberViewProjectionService();
