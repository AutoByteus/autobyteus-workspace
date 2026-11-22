import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { NOT_AN_AGENT_OF_THIS_RUN, type CrossRunAcceptInput } from "../../agent-collaboration/communication/cross-run-accept-input.js";
import type { WorkPacket } from "../../agent-collaboration/execution/task/task-delegation.js";
import { reachingAddressOf } from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import { formerMemberRefusalMessage } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { DelegationWork } from "../../model-routing/domain/model-routing-types.js";
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
import type { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";
import type { TeamExecutionIndex } from "./team-execution-index.js";
import { TeamRecipientResolver } from "./team-recipient-resolver.js";
import type { TeamDelegationPlacement } from "./resolved-team-recipient.js";
import type { TeamRunCollaborators } from "./team-run-collaborators.js";
import { REFERENCE_FILE_REFUSAL_TEXT, REMOTE_REFUSAL, remoteTargetNotRunning } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import type { ReceivedFilesPlacement } from "../../agent-collaboration/execution/remote/transferred-files.js";
import { unlinkedRunEndpoint } from "../../agent-collaboration/execution/remote/remote-endpoint.js";
import type { PeerRunMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RemoteInboundMessage, RemoteInboundWorkPacket, RemoteRunLinks } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import { buildTaskAssigneeWorkPacket } from "../../agent-collaboration/execution/task/task-execution-input.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";

const notLinked: AgentOperationResult = Object.freeze({ accepted: false, code: REMOTE_REFUSAL.TARGET_NOT_PERMITTED, message: "That run is not linked with the sender." });

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
    communication: RootCommunicationEngine;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
    isLiveAgent(agentRunId: string): boolean;
    remoteLinks: RemoteRunLinks;
    remoteSend: RemoteMessageSend;
    /** autobyteus-587: where files from another node land, in a member's own folder. */
    receivedFiles: ReceivedFilesPlacement;
    memberFolderOf(agentRunId: string): Promise<string>;
  }>) {}

  /** DS-2: a message from another run of this node, for a member of this team run; the member is woken or restored first. */
  acceptFromRun(input: CrossRunAcceptInput): Promise<AgentOperationResult> {
    const receiver = this.options.getIndex().getAgent(input.message.receiverAgentRunId);
    if (!receiver) return Promise.resolve(NOT_AN_AGENT_OF_THIS_RUN(input.message.receiverAgentRunId));
    return this.options.communication.acceptFromRun({ ...input,
      receiverIdentity: this.identityFor(receiver.address, receiver.agentRunId),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId });
  }

  /** DS-004: `send_message_to(node, run ID)` from a member to an agent of a peer node (`RemoteMessageSend` chooses the endpoint). */
  deliverToPeerRun(input: PeerRunMessageInput): Promise<AgentOperationResult> {
    const sender = input.sender.identity;
    this.options.authorizeIdentity(sender);
    return this.options.remoteSend.sendToPeerRun({ sender, nodeId: input.nodeId, targetAgentRunId: input.targetAgentRunId,
      content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles, files: input.files });
  }

  /** DS-004 on the receiving node: a peer agent's message by run ID only, for a member while it runs (never woken, DEC-003). */
  acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    const receiver = this.options.getIndex().getAgent(input.message.receiverAgentRunId);
    if (!receiver || !this.options.isLiveAgent(receiver.agentRunId)) return Promise.resolve(remoteTargetNotRunning(input.message.receiverAgentRunId));
    return this.options.communication.acceptFromRemote({
      message: input.message,
      endpoint: unlinkedRunEndpoint({ nodeId: input.fromNodeId, agentRunId: input.message.senderAgentRunId, pairedAgentRunId: receiver.agentRunId }),
      receiverIdentity: this.identityFor(receiver.address, receiver.agentRunId),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
      senderNodeName: input.fromNodeName, senderAddress: input.senderAddress, files: input.files,
    });
  }

  /** The inbound order: the link check, then the paired agent is woken or restored (N-8), then the engine admits it. */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    const endpoint = this.options.remoteLinks.inboundEndpoint(input.fromNodeId, input.message.senderAgentRunId, input.message.receiverAgentRunId);
    // The endpoint admitted the message's target as one of its paired agents (N-301): it is the receiver.
    const receiver = endpoint ? this.options.getIndex().getAgent(input.message.receiverAgentRunId) : null;
    if (!endpoint || !receiver) return Promise.resolve(notLinked);
    return this.options.communication.acceptFromRemote({
      message: input.message,
      endpoint,
      receiverIdentity: this.identityFor(receiver.address, receiver.agentRunId),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
      senderNodeName: input.fromNodeName, senderAddress: input.senderAddress, files: input.files,
    });
  }

  /**
   * N-6 for a Team run a peer started (autobyteus-247 G-8): the link check (from the delegator on its node, for the
   * coordinator), its files placed in the coordinator's own folder (autobyteus-587), then the task notification naming
   * the node and the files' received paths, posted as the coordinator's input (it starts the coordinator). Called outside
   * the gate: `post` is the root's own input path, which takes it.
   */
  async acceptRemoteWorkPacket(input: RemoteInboundWorkPacket, coordinatorAgentRunId: string,
    post: (message: AgentInputUserMessage, agentRunId: string) => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    if (input.targetAgentRunId !== coordinatorAgentRunId
      || !this.options.remoteLinks.admitsWorkPacket(input.fromNodeId, input.senderAgentRunId, input.targetAgentRunId)) return notLinked;
    const files = this.options.receivedFiles.planFor({ agentFolder: await this.options.memberFolderOf(coordinatorAgentRunId),
      senderAgentRunId: input.senderAgentRunId, files: input.files });
    const placed = await files.place();
    if (!placed.ok) return { accepted: false, code: REMOTE_REFUSAL.REFERENCE_FILE_CHECK_FAILED, message: REFERENCE_FILE_REFUSAL_TEXT.notReceived(placed.name) };
    return post(buildTaskAssigneeWorkPacket({ delegator: { agentRunId: input.senderAgentRunId }, delegatorAddress: null,
      delegatorNode: input.fromNodeName, description: input.description, referenceFiles: files.paths }), coordinatorAgentRunId);
  }

  /** DS-1: the work packet of a local delegation that created this team run: the coordinator's first input. */
  acceptWorkPacket(packet: WorkPacket, coordinatorAgentRunId: string,
    post: (message: AgentInputUserMessage, agentRunId: string) => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    return post(buildTaskAssigneeWorkPacket({ delegator: packet.delegator, delegatorAddress: packet.delegatorAddress, description: packet.description,
      comments: packet.comments, ...(packet.task ? { task: packet.task } : {}), referenceFiles: packet.referenceFiles }), coordinatorAgentRunId);
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
    return this.deliverIntent({
      intent,
      receiverIdentity: this.identityFor(target.address, target.agentRunId),
      receiverDisplayName: getAgentTeamAddressBasename(target.address) ?? target.agentRunId,
      senderAddress: reachingAddressOf(this.options.getIndex(), target.agentRunId, sender),
    });
  }

  /** `send_message_to(run ID)`: existing executions only; never brings anything in. */
  async deliverToRunId(input: ExactTeamAgentMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(input.sender.identity);
    const execution = this.options.getIndex().getAgent(input.targetAgentRunId.trim());
    const former = execution ? null : this.options.getIndex().formerMemberByRunId(input.targetAgentRunId.trim());
    // REQ-009: a member that left the team is not reached by its run ID either.
    if (former) return { accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND", message: formerMemberRefusalMessage(former.address) };
    if (!execution) {
      return { accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `Exact AgentRun target '${input.targetAgentRunId}' is not in root '${this.options.rootTeamRunId}'.` };
    }
    const receiver = this.identityFor(execution.address, execution.agentRunId);
    return this.deliverIntent({
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
    });
  }

  /** `delegate_task(address)`: refuses the sender's own Team (CM-1), then a configured Agent (the team's, else one step 2 reaches), then the catalog. */
  resolveDelegationPlacement(sender: CollaborationMemberExecutionIdentity, recipientAddress: string, work: DelegationWork, newDelegatedRunFolder: string | null): Promise<TeamDelegationPlacement> {
    const address = this.recipients.requireNonRootAddress(recipientAddress);
    return resolveDelegationPlacement({
      port: this.options.getIndex(),
      senderAgentRunId: sender.agentRunId,
      address,
      newDelegatedRunFolder,
      resolveInRun: async () => {
        try {
          return this.recipients.resolveInRunDelegationPlacement(this.options.getIndex(), address);
        } catch (error) {
          // Beyond the team's own placements: a configured placement its address step 2 reaches (SR-059).
          if (!(error instanceof CollaborationContractError) || error.code !== "COLLABORATION_TARGET_NOT_FOUND") throw error;
          const reached = await this.options.collaborators.reachedPlacementAt(address);
          if (reached) return reached;
          throw error;
        }
      },
      catalogSource: (workspaceRootPath) => this.options.collaborators.catalogTaskSource({ address, senderRunId: sender.agentRunId, work, workspaceRootPath }),
    });
  }

  /** `list_available_agents` (DS-001): read-only. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.options.authorizeIdentity(sender);
    return this.options.collaborators.listAvailable();
  }

  /** One Team delivery intent, as the engine's same-root `deliver` takes it. */
  private deliverIntent(input: Readonly<{
    intent: InterAgentMessageDeliveryIntent;
    receiverIdentity: CollaborationMemberExecutionIdentity;
    receiverDisplayName: string;
    /** The sender's address as the receiver can use it (design T-5); null otherwise. */
    senderAddress: string | null;
  }>): Promise<AgentOperationResult> {
    return this.options.communication.deliver({
      senderIdentity: input.intent.sender.participant.identity,
      senderDisplayName: input.intent.sender.participant.displayName,
      senderAddress: input.senderAddress,
      receiverIdentity: input.receiverIdentity,
      receiverDisplayName: input.receiverDisplayName,
      content: input.intent.content,
      messageType: input.intent.messageType,
      referenceFiles: input.intent.referenceFiles,
    });
  }

  private identityFor(memberAddress: CollaborationMemberExecutionIdentity["memberAddress"], agentRunId: string) {
    return createCollaborationMemberExecutionIdentity({
      root: createTeamRootExecutionIdentity(this.options.rootTeamRunId), memberAddress, agentRunId,
    });
  }
}
