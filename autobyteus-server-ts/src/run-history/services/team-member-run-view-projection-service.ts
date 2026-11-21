import { conversationSenders, receivedSenderAddresses, tracePageSenders } from "./received-sender-addresses.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { peerMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveActiveTracePageSenderAddresses } from "../projection/event-monitor-active-trace-page-projection.js";
import { resolveInterAgentSenderAddresses } from "../projection/run-projection-types.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { AgentRunViewProjectionService, type RunProjection } from "./agent-run-view-projection-service.js";
import { TeamRunExecutionTreeLocationService } from "./team-run-execution-tree-location-service.js";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
  type ResolvedRunFileChangeEntry,
} from "./run-file-change-projection-service.js";
import type { RunFileChangeEntry } from "../../services/run-file-changes/run-file-change-types.js";
import {
  locatedExecutionSource,
  tagTeamAgentExecution,
  type LocatedTeamCollaborationAgentExecution,
} from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
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
  private readonly tree: Pick<DelegationIndex, "agentOf" | "collaborationTreeOf">;
  private readonly peerRunOf: PeerRunOf;
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: TeamRunExecutionTreeLocationService;
  private readonly injectedFileChanges: RunFileChangeProjectionService | null;

  constructor(options: {
    /**
     * The relationships between runs, from the Task entries (SR-047): the runs this team delegated to peers. A run it
     * delegated to on this node is not one of its members; it is read by its own identity (CR-461-014).
     */
    tree: Pick<DelegationIndex, "agentOf" | "collaborationTreeOf">;
    /** A run on a peer node, by its own identity (SR-066), from the composition. */
    peerRunOf: PeerRunOf;
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: TeamRunExecutionTreeLocationService;
    runFileChangeProjectionService?: RunFileChangeProjectionService;
  }) {
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.tree = options.tree;
    this.peerRunOf = options.peerRunOf;
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new TeamRunExecutionTreeLocationService({ memoryDir });
    this.injectedFileChanges = options.runFileChangeProjectionService ?? null;
  }

  async getProjection(rootTeamRunId: string, agentRunId: string): Promise<TeamMemberRunProjection> {
    // N-403, SR-066: an agent of a peer run is read from its node through the run's handle (autobyteus-278).
    const peer = this.peerRunOf(agentRunId.trim());
    if (peer) {
      const { memberAddress: _address, ...projection } = await peerMemberProjection(peer, agentRunId.trim(), null);
      return projection as TeamMemberRunProjection;
    }
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    const projection = await this.agentViews.getProjectionFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
    });
    return {
      agentRunId: projection.runId,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, await this.senderAddresses(location.tree, conversationSenders(projection.conversation))),
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
    const page = await this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `team:${location.rootTeamRunId}:agent:${location.agentRunId}`,
    });
    return resolveActiveTracePageSenderAddresses(page, await this.senderAddresses(location.tree, tracePageSenders(page)));
  }

  /** The senders' addresses as the member got them (contract §2.5, SR-060). */
  private senderAddresses(tree: TeamExecutionIndex["tree"], senders: readonly string[]) {
    const index = new TeamExecutionIndex(tree);
    return receivedSenderAddresses({ receiverRun: { rootSubjectKind: "agent_team", rootRunId: tree.rootTeam.teamRunId }, tree: this.tree,
      ownAddressOf: (runId) => index.getAgent(runId)?.address ?? null, senderAgentRunIds: senders });
  }

  /** The member's artifacts: live while the team runs, else its stored file changes. */
  async getFileChanges(rootTeamRunId: string, agentRunId: string): Promise<RunFileChangeEntry[]> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    return this.fileChanges().getLocatedCollaborationMemberProjection(location);
  }

  /** One recorded file change of the member, resolved against its own launch workspace. */
  async resolveFileChangeEntry(rootTeamRunId: string, agentRunId: string, filePath: string): Promise<ResolvedRunFileChangeEntry | null> {
    const location = await this.requireLocation(rootTeamRunId, agentRunId);
    return this.fileChanges().resolveLocatedCollaborationMemberEntry(location, filePath);
  }

  private fileChanges(): RunFileChangeProjectionService {
    return this.injectedFileChanges ?? getRunFileChangeProjectionService();
  }

  private async requireLocation(rootTeamRunId: string, agentRunId: string): Promise<LocatedTeamCollaborationAgentExecution> {
    const root = required(rootTeamRunId, "rootTeamRunId");
    const run = required(agentRunId, "agentRunId");
    const found = await this.locations.findAgent({ rootTeamRunId: root, agentRunId: run });
    if (!found || found.rootTeamRunId !== root) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' was not found in root TeamRun '${root}'.`);
    }
    const location = tagTeamAgentExecution(found);
    if (!locatedExecutionSource(location)) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' has no configured launch placement or recorded source.`);
    }
    return location;
  }
}

/** The member's own stored node: a member's, or a former member's (leaving or stopped; CR-003). */
const ownNodeOf = (location: LocatedTeamCollaborationAgentExecution) => {
  const index = new TeamExecutionIndex(location.tree);
  return (index.getAgent(location.agentRunId) ?? index.formerMemberByRunId(location.agentRunId))?.source ?? null;
};

const metadataFor = (location: LocatedTeamCollaborationAgentExecution): AgentRunMetadata => {
  // A configured member's placement, or a delegated copy's own recorded source (by execution kind).
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
    // The execution's own runtime session: a copy never shows its placement's.
    platformAgentRunId: ownNodeOf(location)?.platformAgentRunId ?? null,
  };
};

let processService: TeamMemberRunViewProjectionService | null = null;
/** The composition root sets the process service it created with the tree (SR-047 step 8); the returned function releases it. */
export const setProcessTeamMemberRunViewProjectionService = (service: TeamMemberRunViewProjectionService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getTeamMemberRunViewProjectionService = (): TeamMemberRunViewProjectionService => {
  if (!processService) throw new Error("TeamMemberRunViewProjectionService is created by the composition root.");
  return processService;
};
