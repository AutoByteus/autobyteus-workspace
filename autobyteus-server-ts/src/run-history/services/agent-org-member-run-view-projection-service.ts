import { conversationSenders, receivedSenderAddresses, tracePageSenders } from "./received-sender-addresses.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { peerMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveActiveTracePageSenderAddresses } from "../projection/event-monitor-active-trace-page-projection.js";
import { resolveInterAgentSenderAddresses } from "../projection/run-projection-types.js";
import { AgentOrgExecutionIndex } from "../../agent-org-execution/services/agent-org-execution-index.js";
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
import { locatedExecutionSource } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
  type ResolvedRunFileChangeEntry,
} from "./run-file-change-projection-service.js";
import type { RunFileChangeEntry } from "../../services/run-file-changes/run-file-change-types.js";
import type { OrgUnitMemberViews } from "./org-unit-member-views.js";

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
  private readonly tree: Pick<DelegationIndex, "agentOf" | "collaborationTreeOf">;
  private readonly peerRunOf: PeerRunOf;
  private readonly agentViews: AgentRunViewProjectionService;
  private readonly locations: AgentOrgExecutionTreeLocationService;
  private readonly tokenUsage: TokenUsageRunStore;
  private readonly injectedFileChanges: RunFileChangeProjectionService | null;
  private readonly units: OrgUnitMemberViews | null;

  constructor(options: {
    /** The relationships between runs, from the Task entries (SR-047). */
    tree: Pick<DelegationIndex, "agentOf" | "collaborationTreeOf">;
    /** A run on a peer node, by its own identity (SR-066), from the composition. */
    peerRunOf: PeerRunOf;
    memoryDir?: string;
    agentRunViewProjectionService?: AgentRunViewProjectionService;
    locations?: AgentOrgExecutionTreeLocationService;
    tokenUsage?: TokenUsageRunStore;
    runFileChangeProjectionService?: RunFileChangeProjectionService;
    /** An Org container's members, read from their unit runs (org-teams-follow-definition). */
    units?: OrgUnitMemberViews;
  }) {
    this.units = options.units ?? null;
    const memoryDir = options.memoryDir ?? appConfigProvider.config.getMemoryDir();
    this.tree = options.tree;
    this.peerRunOf = options.peerRunOf;
    this.agentViews = options.agentRunViewProjectionService ?? new AgentRunViewProjectionService(memoryDir);
    this.locations = options.locations ?? new AgentOrgExecutionTreeLocationService({
      memoryDir,
      manager: AgentOrgRunManager.getInstance(),
    });
    this.tokenUsage = options.tokenUsage ?? new TokenUsageRunStore();
    this.injectedFileChanges = options.runFileChangeProjectionService ?? null;
  }

  async getProjection(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
  ): Promise<AgentOrgMemberRunProjection> {
    // N-403, SR-066: an agent of a peer run is read from its node through the run's handle (autobyteus-278).
    const peer = this.peerRunOf(agentRunId.trim());
    if (peer) return await peerMemberProjection(peer, agentRunId.trim(), memberAddress) as AgentOrgMemberRunProjection;
    const unit = await this.unitOf(orgRunId, memberAddress, agentRunId);
    if (unit) return this.units!.projection(unit, memberAddress.trim(), agentRunId.trim());
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const projection = await this.agentViews.getRequiredProjectionFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
    });
    return {
      agentRunId: projection.runId,
      memberAddress: location.memberAddress,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, await this.senderAddresses(location.tree, conversationSenders(projection.conversation))),
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
    const unit = await this.unitOf(orgRunId, memberAddress, agentRunId);
    if (unit) return this.units!.tracePage(orgRunId.trim(), unit, memberAddress.trim(), agentRunId.trim(), beforeCursor);
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const page = await this.agentViews.getActiveTracePageFromMetadata({
      runId: location.agentRunId,
      metadata: metadataFor(location),
      beforeCursor,
      canonicalSubject: `org:${location.rootRunId}:member:${location.memberAddress}:agent:${location.agentRunId}`,
    });
    return resolveActiveTracePageSenderAddresses(page, await this.senderAddresses(location.tree, tracePageSenders(page)));
  }

  /** The senders' addresses as the member got them (contract §2.5, SR-060). */
  private senderAddresses(tree: AgentOrgExecutionIndex["tree"], senders: readonly string[]) {
    const index = new AgentOrgExecutionIndex(tree);
    return receivedSenderAddresses({ receiverRun: { rootSubjectKind: "agent_org", rootRunId: tree.rootOrg.orgRunId }, tree: this.tree,
      ownAddressOf: (runId) => index.getAgent(runId)?.address ?? null, senderAgentRunIds: senders });
  }

  async getTokenUsageSummary(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
  ): Promise<TokenUsageRunSummaryPayload> {
    if (await this.unitOf(orgRunId, memberAddress, agentRunId)) return this.units!.tokenUsage(agentRunId.trim());
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    const summary = await this.tokenUsage.getAgentRunSummary(location.agentRunId);
    if (summary.run_id !== location.agentRunId || summary.root_team_run_id !== null) {
      throw new Error(`AgentOrg token usage for '${location.agentRunId}' has incompatible root identity.`);
    }
    return summary;
  }

  /** The member's artifacts: live while the org runs, else its stored file changes. */
  async getFileChanges(orgRunId: string, memberAddress: string, agentRunId: string): Promise<RunFileChangeEntry[]> {
    const unit = await this.unitOf(orgRunId, memberAddress, agentRunId);
    if (unit) return this.units!.fileChanges(unit, agentRunId.trim());
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    return this.fileChanges().getLocatedCollaborationMemberProjection(location);
  }

  /** One recorded file change of the member, resolved against its own launch workspace. */
  async resolveFileChangeEntry(
    orgRunId: string,
    memberAddress: string,
    agentRunId: string,
    filePath: string,
  ): Promise<ResolvedRunFileChangeEntry | null> {
    const unit = await this.unitOf(orgRunId, memberAddress, agentRunId);
    if (unit) return this.units!.resolveFileChange(unit, agentRunId.trim(), filePath);
    const location = await this.requireLocation(orgRunId, memberAddress, agentRunId);
    return this.fileChanges().resolveLocatedCollaborationMemberEntry(location, filePath);
  }

  /** An Org container's member's unit; `null` for a released Org run (its own location answers). */
  private unitOf(orgRunId: string, memberAddress: string, agentRunId: string) {
    return this.units ? this.units.unitOf(required(orgRunId, "orgRunId"), required(memberAddress, "memberAddress"), required(agentRunId, "agentRunId")) : Promise.resolve(null);
  }

  private fileChanges(): RunFileChangeProjectionService {
    return this.injectedFileChanges ?? getRunFileChangeProjectionService();
  }

  private async requireLocation(orgRunId: string, memberAddress: string, agentRunId: string): Promise<LocatedAgentOrgAgentExecution> {
    const root = required(orgRunId, "orgRunId");
    const address = required(memberAddress, "memberAddress");
    const run = required(agentRunId, "agentRunId");
    const location = await this.locations.findAgent({
      rootRunId: root,
      memberAddress: address,
      agentRunId: run,
    });
    if (!location || location.rootRunId !== root || location.memberAddress !== address) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' at '${address}' was not found in AgentOrg '${root}'.`);
    }
    if (!locatedExecutionSource(location)) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' has no configured AgentOrg launch placement or recorded source.`);
    }
    return location;
  }
}

const metadataFor = (location: LocatedAgentOrgAgentExecution): AgentRunMetadata => {
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
    platformAgentRunId: location.platformAgentRunId,
  };
};

let processService: AgentOrgMemberRunViewProjectionService | null = null;
/** The composition root sets the process service it created with the tree (SR-047 step 8); the returned function releases it. */
export const setProcessAgentOrgMemberRunViewProjectionService = (service: AgentOrgMemberRunViewProjectionService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getAgentOrgMemberRunViewProjectionService = (): AgentOrgMemberRunViewProjectionService => {
  if (!processService) throw new Error("AgentOrgMemberRunViewProjectionService is created by the composition root.");
  return processService;
};
