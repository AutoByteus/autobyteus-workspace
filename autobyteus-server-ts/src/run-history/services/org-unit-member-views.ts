import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { OrgContainerPort } from "../../agent-collaboration/domain/org-container-port.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { RunFileChangeEntry } from "../../services/run-file-changes/run-file-change-types.js";
import type { TokenUsageRunStore } from "../../token-usage/providers/token-usage-run-store.js";
import { resolveActiveTracePageSenderAddresses } from "../projection/event-monitor-active-trace-page-projection.js";
import type { EventMonitorActiveTracePage } from "../projection/event-monitor-active-trace-page-types.js";
import { resolveInterAgentSenderAddresses } from "../projection/run-projection-types.js";
import type { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunViewProjectionService } from "./agent-run-view-projection-service.js";
import type { AgentOrgMemberRunProjection } from "./agent-org-member-run-view-projection-service.js";
import { conversationSenders, receivedSenderAddresses, tracePageSenders } from "./received-sender-addresses.js";
import type { ResolvedRunFileChangeEntry, RunFileChangeProjectionService } from "./run-file-change-projection-service.js";
import type { TeamMemberRunViewProjectionService } from "./team-member-run-view-projection-service.js";

type Unit = Readonly<{ kind: "agent_team"; teamRunId: string } | { kind: "agent"; agentRunId: string }>;

/**
 * An Org container's member, read from its unit run (org-teams-follow-definition, design R-5: "its members' views, last
 * activity and records read from the unit runs"): a Team unit's member through the Team member reads, a direct Org agent
 * through its own run's reads. The member is named by its Org address; senders are named as the member got them.
 */
export class OrgUnitMemberViews {
  constructor(private readonly dependencies: Readonly<{
    directory: Pick<OrgContainerPort, "containedInOf" | "unitOfAgent">;
    isContainer(orgRunId: string): Promise<boolean>;
    teamMembers(): TeamMemberRunViewProjectionService;
    agentViews: AgentRunViewProjectionService;
    metadata: Pick<AgentRunMetadataStore, "readMetadata">;
    tree: Pick<DelegationIndex, "agentOf" | "collaborationTreeOf">;
    tokenUsage: Pick<TokenUsageRunStore, "getAgentRunSummary">;
    fileChanges(): RunFileChangeProjectionService;
  }>) {}

  /** The member's unit, when the Org is a container; `null` for a released Org run (its own reads answer). */
  async unitOf(orgRunId: string, memberAddress: string, agentRunId: string): Promise<Unit | null> {
    if (!await this.dependencies.isContainer(orgRunId)) return null;
    const unit = await this.dependencies.directory.unitOfAgent(orgRunId, agentRunId);
    if (!unit || unit.orgAddress !== memberAddress) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${agentRunId}' at '${memberAddress}' was not found in AgentOrg '${orgRunId}'.`);
    }
    return unit.run.rootSubjectKind === "agent_team" ? { kind: "agent_team", teamRunId: unit.run.rootRunId } : { kind: "agent", agentRunId: unit.run.rootRunId };
  }

  async projection(unit: Unit, memberAddress: string, agentRunId: string): Promise<AgentOrgMemberRunProjection> {
    if (unit.kind === "agent_team") return { ...await this.dependencies.teamMembers().getProjection(unit.teamRunId, agentRunId), memberAddress };
    const metadata = await this.requireMetadata(unit.agentRunId);
    const projection = await this.dependencies.agentViews.getRequiredProjectionFromMetadata({ runId: unit.agentRunId, metadata });
    return { agentRunId: projection.runId, memberAddress, summary: projection.summary, lastActivityAt: projection.lastActivityAt,
      conversation: resolveInterAgentSenderAddresses(projection.conversation, await this.senders(unit.agentRunId, memberAddress, conversationSenders(projection.conversation))),
      activities: projection.activities, hasEarlierActiveTraceEvents: projection.hasEarlierActiveTraceEvents };
  }

  async tracePage(orgRunId: string, unit: Unit, memberAddress: string, agentRunId: string, beforeCursor?: string | null): Promise<EventMonitorActiveTracePage> {
    if (unit.kind === "agent_team") return this.dependencies.teamMembers().getActiveTracePage(unit.teamRunId, agentRunId, beforeCursor);
    const page = await this.dependencies.agentViews.getActiveTracePageFromMetadata({ runId: unit.agentRunId, metadata: await this.requireMetadata(unit.agentRunId),
      beforeCursor, canonicalSubject: `org:${orgRunId}:member:${memberAddress}:agent:${agentRunId}` });
    return resolveActiveTracePageSenderAddresses(page, await this.senders(unit.agentRunId, memberAddress, tracePageSenders(page)));
  }

  /** The member's token usage, as its own run records it (a Team unit's member names its Team run). */
  tokenUsage(agentRunId: string): Promise<TokenUsageRunSummaryPayload> { return this.dependencies.tokenUsage.getAgentRunSummary(agentRunId); }

  fileChanges(unit: Unit, agentRunId: string): Promise<RunFileChangeEntry[]> {
    return unit.kind === "agent_team" ? this.dependencies.teamMembers().getFileChanges(unit.teamRunId, agentRunId)
      : this.dependencies.fileChanges().getStandaloneRunProjection(unit.agentRunId);
  }

  resolveFileChange(unit: Unit, agentRunId: string, filePath: string): Promise<ResolvedRunFileChangeEntry | null> {
    return unit.kind === "agent_team" ? this.dependencies.teamMembers().resolveFileChangeEntry(unit.teamRunId, agentRunId, filePath)
      : this.dependencies.fileChanges().resolveStandaloneRunEntry(unit.agentRunId, filePath);
  }

  private async requireMetadata(agentRunId: string) {
    const metadata = await this.dependencies.metadata.readMetadata(agentRunId);
    if (!metadata) throw new CollaborationMemberNotFoundError(`AgentRun '${agentRunId}' has no stored run file.`);
    return metadata;
  }

  /** A direct Org agent's senders as it got them: itself at its address, every other by its collaboration tree. */
  private senders(agentRunId: string, address: string, senders: readonly string[]) {
    return receivedSenderAddresses({ receiverRun: createAgentRootExecutionIdentity(agentRunId), tree: this.dependencies.tree,
      ownAddressOf: (runId) => runId === agentRunId ? address : null, senderAgentRunIds: senders });
  }
}
