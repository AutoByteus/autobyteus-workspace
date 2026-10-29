import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveActiveTracePageSenderAddresses } from "../../run-history/projection/event-monitor-active-trace-page-projection.js";
import { resolveInterAgentSenderAddresses } from "../../run-history/projection/run-projection-types.js";
import { remoteChildOf, remoteMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
import { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";
import { locatedExecutionSource } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../../run-history/projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "../../run-history/services/agent-run-view-projection-service.js";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
  type ResolvedRunFileChangeEntry,
} from "../../run-history/services/run-file-change-projection-service.js";
import type { RunFileChangeEntry } from "../../services/run-file-changes/run-file-change-types.js";
import {
  StandaloneRootLocationService,
  type LocatedStandaloneRootAgentExecution,
} from "./standalone-root-location-service.js";
import { getStandaloneAgentRunRootManager } from "./standalone-agent-run-root-manager.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export interface StandaloneRootMemberRunProjection {
  agentRunId: string;
  memberAddress: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

/**
 * Views of one Agent-root child (task Agent or task-Team member) by its exact identity inside one
 * hub: stored conversation projection, event-monitor pages, artifact list and artifact content. Only the named hub's
 * tree is read.
 */
export class StandaloneRootMemberViewProjectionService {
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: StandaloneRootLocationService;
  private readonly injectedFileChanges: RunFileChangeProjectionService | null;

  constructor(options: {
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: StandaloneRootLocationService;
    runFileChangeProjectionService?: RunFileChangeProjectionService;
  } = {}) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.injectedFileChanges = options.runFileChangeProjectionService ?? null;
    this.locations = options.locations ?? new StandaloneRootLocationService({
      memoryDir,
      roots: { getActiveTree: (hostRunId) => getStandaloneAgentRunRootManager().getActiveTree(hostRunId) },
    });
  }

  async getProjection(hostRunId: string, memberAddress: string, agentRunId: string): Promise<StandaloneRootMemberRunProjection> {
    // N-403: a remote child's conversation is read from its node (autobyteus-278).
    const remote = remoteChildOf((await this.locations.readTree(required(hostRunId, "hostRunId")))?.remoteTaskExecutions ?? [], agentRunId.trim());
    if (remote) return await remoteMemberProjection(remote, memberAddress) as StandaloneRootMemberRunProjection;
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    const projection = await this.agentViews.getRequiredProjectionFromMetadata({ runId: location.agentRunId, metadata: metadataFor(location) });
    return {
      agentRunId: projection.runId,
      memberAddress: location.memberAddress,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, (runId) =>
        new StandaloneRootExecutionIndex(location.tree).getAgent(runId)?.address ?? null),
      activities: projection.activities,
      summary: projection.summary,
      lastActivityAt: projection.lastActivityAt,
      hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents,
    };
  }

  async getActiveTracePage(hostRunId: string, memberAddress: string, agentRunId: string, beforeCursor?: string | null): Promise<EventMonitorActiveTracePage> {
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    const page = await this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `agent:${location.rootRunId}:member:${location.memberAddress}:agent:${location.agentRunId}`,
    });
    const index = new StandaloneRootExecutionIndex(location.tree);
    return resolveActiveTracePageSenderAddresses(page, (runId) => index.getAgent(runId)?.address ?? null);
  }

  /** The child's artifacts: live while the hub is active, else its stored file changes. */
  async getFileChanges(hostRunId: string, memberAddress: string, agentRunId: string): Promise<RunFileChangeEntry[]> {
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    return this.fileChanges().getLocatedCollaborationMemberProjection(location);
  }

  /** One recorded file change of the child, resolved against its own launch workspace. */
  async resolveFileChangeEntry(
    hostRunId: string,
    memberAddress: string,
    agentRunId: string,
    filePath: string,
  ): Promise<ResolvedRunFileChangeEntry | null> {
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    return this.fileChanges().resolveLocatedCollaborationMemberEntry(location, filePath);
  }

  private fileChanges(): RunFileChangeProjectionService {
    return this.injectedFileChanges ?? getRunFileChangeProjectionService();
  }

  private async requireLocation(hostRunId: string, memberAddress: string, agentRunId: string): Promise<LocatedStandaloneRootAgentExecution> {
    const root = required(hostRunId, "hostRunId");
    const address = required(memberAddress, "memberAddress");
    const run = required(agentRunId, "agentRunId");
    const location = await this.locations.findAgent({ rootRunId: root, memberAddress: address, agentRunId: run });
    if (!location || location.rootRunId !== root || location.memberAddress !== address
      || !locatedExecutionSource(location)) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' at '${address}' was not found among the delegated copies of Agent run '${root}'.`);
    }
    return location;
  }
}

const metadataFor = (location: LocatedStandaloneRootAgentExecution): AgentRunMetadata => {
  // A delegated copy's definition and launch come from its recorded source.
  const source = locatedExecutionSource(location)!;
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

let cached: StandaloneRootMemberViewProjectionService | null = null;
export const getStandaloneRootMemberViewProjectionService = (): StandaloneRootMemberViewProjectionService =>
  cached ??= new StandaloneRootMemberViewProjectionService();
