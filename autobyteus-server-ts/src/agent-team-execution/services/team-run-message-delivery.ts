import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
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

export type ExactTeamAgentMessageInput = Readonly<{
  sender: InterAgentMessageParticipant;
  targetAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/**
 * The Team root's message and delegation addressing (DS-002, DS-003). Every method runs
 * inside the root's materialization gate, held by the caller, so a catalog bring-in never
 * re-enters it.
 */
export class TeamRunMessageDelivery {
  private readonly recipients = new TeamRecipientResolver();

  constructor(private readonly options: Readonly<{
    rootTeamRunId: string;
    taskScope(sender: CollaborationMemberExecutionIdentity): NonNullable<Parameters<typeof resolveMessageRecipient>[0]["taskScope"]>;
    getIndex(): TeamExecutionIndex;
    collaborators: TeamRunCollaborators;
    communication: TeamCommunicationService;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
    isLiveAgent(agentRunId: string): boolean;
    withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult>;
  }>) {}

  /** `send_message_to(address)`: sender instance, run-wide, then a catalog bring-in. */
  async deliverToAddress(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    if (intent.rootTeamRunId !== this.options.rootTeamRunId) {
      return { accepted: false, code: "COLLABORATION_ROOT_MISMATCH", message: "Message root does not match the selected RootTeamRun." };
    }
    const sender = intent.sender.participant.identity;
    this.options.authorizeIdentity(sender);
    const resolution = await resolveMessageRecipient({
      taskScope: this.options.taskScope(sender),
      port: () => this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address: this.recipients.requireNonRootAddress(intent.recipientAddress),
      catalog: { bringIn: (address) => this.options.collaborators.bringInAt({ address, senderRunId: sender.agentRunId }) },
      notFoundMessage: (address) => `Collaboration target '${address}' was not found.`,
    });
    if (!resolution.resolved) return { accepted: false, code: resolution.code, message: resolution.message };
    const target = resolution.placement.receiver;
    return this.options.withLiveLease(target.agentRunId, () => this.options.communication.deliver({
      intent,
      receiverIdentity: this.identityFor(target.address, target.agentRunId),
      receiverDisplayName: getAgentTeamAddressBasename(target.address) ?? target.agentRunId,
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
    }));
  }

  /** `delegate_task(address)`: a catalog teammate, a configured Agent, a collaborator, then the catalog. */
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
