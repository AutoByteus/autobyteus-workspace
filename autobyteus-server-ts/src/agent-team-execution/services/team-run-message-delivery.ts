import { reachingAddressOf } from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { resolveMessageRecipient } from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import { resolveDelegationPlacement } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { TeamCommunicationService } from "../../services/team-communication/team-communication-service.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import { TeamRecipientResolver } from "./team-recipient-resolver.js";
import type { TeamDelegationPlacement } from "./resolved-team-recipient.js";
import type { TeamRunCollaborators } from "./team-run-collaborators.js";
import type { RemoteInboundMessage, RemoteRunLinks } from "../../agent-collaboration/execution/remote/remote-run-links.js";

export type ExactTeamAgentMessageInput = Readonly<{
  sender: InterAgentMessageParticipant;
  targetAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/**
 * The Team root's message and delegation addressing (DS-001, DS-002). Every method runs
 * inside the root's materialization gate, held by the caller. Messaging only resolves; it never
 * creates a run.
 */
export class TeamRunMessageDelivery {
  private readonly recipients = new TeamRecipientResolver();

  constructor(private readonly options: Readonly<{
    rootTeamRunId: string;
    getIndex(): TeamExecutionIndex;
    collaborators: TeamRunCollaborators;
    communication: TeamCommunicationService;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
    isLiveAgent(agentRunId: string): boolean;
    /** Target lease that records the receiver's first accepted message. */
    withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult>;
    remoteLinks: RemoteRunLinks;
  }>) {}

  /**
   * `send_message_to(run ID)` from an agent of this Team: a remote endpoint goes through the link under the
   * sender's live lease (never reactivated, S3); any other run ID through today's exact delivery (`local`).
   */
  deliverExact(input: ExactTeamAgentMessageInput, local: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    const sender = input.sender.identity;
    const route = this.options.remoteLinks.route(sender.agentRunId, input.targetAgentRunId);
    if (route.kind === "refused") return Promise.resolve(route.result);
    if (route.kind === "local") return local();
    this.options.authorizeIdentity(sender);
    return this.options.withLiveLease(sender.agentRunId, () => this.options.communication.sendToRemote(this.options.remoteLinks, route.endpoint,
      { senderIdentity: sender, content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles }));
  }

  /** A message from a linked run on a peer node: its paired agent here is woken or restored first (N-8). */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.options.communication.acceptFromRemote(this.options.remoteLinks, input, {
      receiver: (agentRunId) => {
        const execution = this.options.getIndex().getAgent(agentRunId);
        return execution ? { identity: this.identityFor(execution.address, execution.agentRunId),
          displayName: getAgentTeamAddressBasename(execution.address) ?? execution.agentRunId } : null;
      },
      wake: (agentRunId, operation) => this.options.withLiveLease(agentRunId, operation),
    });
  }

  /** `send_message_to(address)`: the sender's own instance, then run-wide standing instances; else not found. */
  async deliverToAddress(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    if (intent.rootTeamRunId !== this.options.rootTeamRunId) {
      return { accepted: false, code: "COLLABORATION_ROOT_MISMATCH", message: "Message root does not match the selected RootTeamRun." };
    }
    const sender = intent.sender.participant.identity;
    this.options.authorizeIdentity(sender);
    const target = resolveMessageRecipient({
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.recipients.requireNonRootAddress(intent.recipientAddress),
    }).receiver;
    return this.options.withLiveLease(target.agentRunId, () => this.options.communication.deliver({
      intent,
      receiverIdentity: this.identityFor(target.address, target.agentRunId),
      receiverDisplayName: getAgentTeamAddressBasename(target.address) ?? target.agentRunId,
      senderAddress: reachingAddressOf(this.options.getIndex(), target.agentRunId, sender),
    }));
  }

  /** `send_message_to(run ID)`: existing executions only; never brings anything in. */
  async deliverToRunId(input: ExactTeamAgentMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(input.sender.identity);
    const execution = this.options.getIndex().getAgent(input.targetAgentRunId.trim());
    if (!execution) {
      return { accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `Exact AgentRun target '${input.targetAgentRunId}' is not in root '${this.options.rootTeamRunId}'.` };
    }
    const receiver = this.identityFor(execution.address, execution.agentRunId);
    return this.options.withLiveLease(execution.agentRunId, () => this.options.communication.deliver({
      intent: {
        rootTeamRunId: this.options.rootTeamRunId,
        sender: buildDeliveryEndpointForParticipant(input.sender),
        recipientAddress: execution.address,
        content: input.content,
        messageType: input.messageType,
        referenceFiles: input.referenceFiles ? [...input.referenceFiles] : null,
      },
      receiverIdentity: receiver,
      receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
      senderAddress: reachingAddressOf(this.options.getIndex(), receiver.agentRunId, input.sender.identity),
    }));
  }

  /** `delegate_task(address)`: refuses the sender's own Team (CM-1), then a configured Agent, then the catalog. */
  resolveDelegationPlacement(sender: CollaborationMemberExecutionIdentity, recipientAddress: string): Promise<TeamDelegationPlacement> {
    const address = this.recipients.requireNonRootAddress(recipientAddress);
    return resolveDelegationPlacement({
      port: this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address,
      resolveInRun: () => this.recipients.resolveInRunDelegationPlacement(this.options.getIndex(), address),
      catalogSource: () => this.options.collaborators.catalogTaskSource({ address, senderRunId: sender.agentRunId }),
    });
  }

  /** `list_available_agents` (DS-001): read-only. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.options.authorizeIdentity(sender);
    return this.options.collaborators.listAvailable();
  }

  private identityFor(memberAddress: CollaborationMemberExecutionIdentity["memberAddress"], agentRunId: string) {
    return createCollaborationMemberExecutionIdentity({
      root: createTeamRootExecutionIdentity(this.options.rootTeamRunId), memberAddress, agentRunId,
    });
  }
}
