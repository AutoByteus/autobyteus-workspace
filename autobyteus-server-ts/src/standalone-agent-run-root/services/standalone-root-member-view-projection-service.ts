import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveActiveTracePageSenderAddresses } from "../../run-history/projection/event-monitor-active-trace-page-projection.js";
import { resolveInterAgentSenderAddresses } from "../../run-history/projection/run-projection-types.js";
import { remoteChildOf, remoteMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
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
import { DelegatedChildLocations, type LocatedStandaloneRootAgentExecution } from "../../agent-collaboration/execution/delegation/delegated-child-locations.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";

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
 * Views of one child row of a standalone run (DS-8): an agent of a run it delegated to, read from that run's own folder
 * (stored conversation projection, event-monitor pages, artifact list and content); a peer child from its node.
 */
export class StandaloneRootMemberViewProjectionService {
  private readonly tree: Pick<DelegationTree, "peerChildrenOf" | "childrenOf">;
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: DelegatedChildLocations;
  private readonly injectedFileChanges: RunFileChangeProjectionService | null;

  constructor(options: {
    /** The relationships between runs, from the Task entries (SR-047). */
    tree: Pick<DelegationTree, "peerChildrenOf" | "childrenOf">;
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: DelegatedChildLocations;
    runFileChangeProjectionService?: RunFileChangeProjectionService;
  }) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.tree = options.tree;
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.injectedFileChanges = options.runFileChangeProjectionService ?? null;
    this.locations = options.locations ?? new DelegatedChildLocations({ memoryDir, teams: createStoredTeamRunExecutionTreeLocationService(memoryDir), tree: options.tree });
  }

  async getProjection(hostRunId: string, memberAddress: string, agentRunId: string): Promise<StandaloneRootMemberRunProjection> {
    // N-403: a remote child's conversation is read from its node (autobyteus-278).
    const remote = remoteChildOf(peerRunLinksOf({ rootSubjectKind: "agent", rootRunId: required(hostRunId, "hostRunId") }, this.tree), agentRunId.trim());
    if (remote) return await remoteMemberProjection(remote, memberAddress) as StandaloneRootMemberRunProjection;
    const location = await this.requireLocation(hostRunId, memberAddress, agentRunId);
    const projection = await this.agentViews.getRequiredProjectionFromMetadata({ runId: location.agentRunId, metadata: metadataFor(location) });
    return {
      agentRunId: projection.runId,
      memberAddress: location.memberAddress,
      // A sender of another run is named by its run ID (its address belongs to its own run).
      conversation: resolveInterAgentSenderAddresses(projection.conversation, () => null),
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
    return resolveActiveTracePageSenderAddresses(page, () => null);
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
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' at '${address}' was not found among the runs delegated from Agent run '${root}'.`);
    }
    return location;
  }
}

const metadataFor = (location: LocatedStandaloneRootAgentExecution): AgentRunMetadata => {
  // The run's own definition and launch.
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

let processService: StandaloneRootMemberViewProjectionService | null = null;
/** The composition root sets the process service it created with the tree (SR-047 step 8); the returned function releases it. */
export const setProcessStandaloneRootMemberViewProjectionService = (service: StandaloneRootMemberViewProjectionService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getStandaloneRootMemberViewProjectionService = (): StandaloneRootMemberViewProjectionService => {
  if (!processService) throw new Error("StandaloneRootMemberViewProjectionService is created by the composition root.");
  return processService;
};
