import { NOT_AN_AGENT_OF_THIS_RUN, type CrossRunAcceptInput } from "../../agent-collaboration/communication/cross-run-accept-input.js";
import type { WorkPacket } from "../../agent-collaboration/execution/task/task-delegation.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { mentionViewerOf } from "../../agent-collaboration/collaborators/mention-viewer.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import type { StandaloneRunPostInput, StandaloneRunPostResult } from "../../agent-execution/services/standalone-run-ports.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { localPlacement } from "../../agent-collaboration/execution/task/task-delegation.js";
import type { DelegationSource } from "../../agent-collaboration/execution/task/member-task-capability.js";
import { buildTaskAssigneeWorkPacket } from "../../agent-collaboration/execution/task/task-execution-input.js";
import { REFERENCE_FILE_REFUSAL_TEXT, REMOTE_REFUSAL, remoteTargetNotRunning } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import { receivingAgentFolder, type ReceivedFilesPlacement } from "../../agent-collaboration/execution/remote/transferred-files.js";
import type { RemoteInboundMessage, RemoteInboundWorkPacket, RemoteRunLinks } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";
import { unlinkedRunEndpoint } from "../../agent-collaboration/execution/remote/remote-endpoint.js";
import type { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import type { ExactAgentMessageInput, PeerRunMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { buildDirectAgentRunInterAgentEvent } from "../../agent-communication/services/global-agent-run-message-runtime-builders.js";
import type { StandaloneRunAgentHandle } from "../domain/standalone-run-agent-handle.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { StandaloneRootIndex } from "./standalone-root-index.js";
import type { StandaloneRootCollaborators } from "./standalone-root-collaborators.js";
import type { StandaloneRootRecipientResolver } from "./standalone-root-recipient-resolver.js";

const notLinked: AgentOperationResult = Object.freeze({ accepted: false, code: REMOTE_REFUSAL.TARGET_NOT_PERMITTED, message: "That run is not linked with the sender." });
const unavailable = (error: unknown): AgentOperationResult =>
  ({ accepted: false, code: "AGENT_ROOT_HOST_UNAVAILABLE", message: error instanceof Error ? error.message : String(error) });
const SELF: AgentOperationResult = Object.freeze({ accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." });

/**
 * A standalone run's messages and delegations (autobyteus-461). Its one agent is the run itself; every run it
 * delegates to is a run of its own (`TaskDelegation`), reached by run ID (`CrossRunMessageDelivery`) or, on a peer
 * node, through this run's peer endpoints. Every public method runs inside the root's operation gate, held by the
 * caller. A message to the run's agent when it is not running makes it ready first.
 */
export class StandaloneRootMessageDelivery {
  constructor(private readonly options: Readonly<{
    agentRunId: string;
    root: RootExecutionIdentity;
    getIndex(): StandaloneRootIndex;
    recipients: StandaloneRootRecipientResolver;
    collaborators: StandaloneRootCollaborators;
    getCommunication(): RootCommunicationEngine;
    agent: StandaloneRunAgentHandle;
    remoteLinks: RemoteRunLinks;
    remoteSend: RemoteMessageSend;
    /** autobyteus-587: where files from another node land (the run's own folder). */
    receivedFiles: ReceivedFilesPlacement;
    /** Told each time the run's agent is made ready (its idle shutdown follows it). */
    onAgentReady?(run: AgentRun): void;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
  }>) {}

  /** `@` for the run's agent: resolves the mentioned definitions (adds nothing); the caller composes the note. */
  resolveMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.options.getIndex().isRunAgent(input.focusedAgentRunId)
      ? this.options.collaborators.resolveMentions(input.focusedAgentRunId, input.mentions, mentionViewerOf(this.options.getIndex(), input.focusedAgentRunId))
      : Promise.resolve({ admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in Agent root '${this.options.agentRunId}'.` });
  }

  /**
   * A user message for the run's agent: ready (activated or restored as needed), `onActiveRunReady` (binds its stream)
   * before anything is resolved or posted, mention resolution (adds nothing), then the post with the caller's options.
   */
  async postToAgent(input: Omit<StandaloneRunPostInput, "runId">): Promise<StandaloneRunPostResult> {
    const run = await this.readyAgent();
    input.onActiveRunReady?.(run);
    let message = input.message;
    if (input.mentions?.length) {
      let admission: RootCollaboratorAdmissionResult;
      try {
        admission = await this.resolveMentions({ focusedAgentRunId: this.options.agentRunId, mentions: input.mentions });
      } catch (error) {
        return { kind: "admission_failed", run, message: error instanceof Error ? error.message : String(error) };
      }
      if (!admission.admitted) return { kind: "admission_rejected", run, admission };
      message = new AgentInputUserMessage(composeCollaboratorMentionNote(message.content, admission.collaborators),
        message.senderType, message.contextFiles, message.metadata);
    }
    return { kind: "posted", run, post: await run.postUserMessage(message, input.postOptions) };
  }

  /** `list_available_agents` (DS-001): read-only. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.options.authorizeIdentity(sender);
    return this.options.collaborators.listAvailable(sender.agentRunId);
  }

  /**
   * `send_message_to(address)` in this run (contract §2.3): the run's only agent is the sender, so its own address is
   * the self refusal and any other address is not found here (step 2 follows for a run that works on a Task).
   */
  async deliverToAddress(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(sender);
    this.options.recipients.resolveMessageRecipient(sender, input.recipientAddress);
    return SELF;
  }

  /**
   * `send_message_to(run ID)` without `node` from the run's own agent to an agent of this run: the run holds no other
   * agent (another run's is the router's; a run on another node is refused by `PeerRunNodes` first, autobyteus-587 RF-14).
   */
  async deliverExact(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(input.sender.identity);
    return this.options.getIndex().isRunAgent(input.targetAgentRunId) ? SELF
      : { accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `AgentRun '${input.targetAgentRunId}' is not in this Agent run.` };
  }

  /** DS-004: `send_message_to(node, run ID)` from the run's agent to an agent of a peer node (`RemoteMessageSend` chooses the endpoint). */
  deliverToPeerRun(input: PeerRunMessageInput): Promise<AgentOperationResult> {
    const sender = input.sender.identity;
    this.options.authorizeIdentity(sender);
    return this.options.remoteSend.sendToPeerRun({ sender, nodeId: input.nodeId, targetAgentRunId: input.targetAgentRunId,
      content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles, files: input.files });
  }

  /**
   * DS-004 on the receiving node: a peer agent's message by run ID only, for the run's agent while it runs (never made
   * ready, DEC-003); the engine admits it as from a one-message `unlinked_run` endpoint.
   */
  acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    const receiver = input.message.receiverAgentRunId;
    if (!this.options.getIndex().isRunAgent(receiver) || !this.options.agent.getActiveRun()?.isActive()) return Promise.resolve(remoteTargetNotRunning(receiver));
    return this.options.getCommunication().acceptFromRemote({ message: input.message,
      endpoint: unlinkedRunEndpoint({ nodeId: input.fromNodeId, agentRunId: input.message.senderAgentRunId, pairedAgentRunId: receiver }),
      receiverIdentity: this.agentIdentity(), receiverDisplayName: this.hostName(), senderNodeName: input.fromNodeName, senderAddress: input.senderAddress,
      files: input.files });
  }

  /** The inbound order from a peer: the link check, then the run's agent is made ready (N-8), then the engine admits it. */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    const endpoint = this.options.remoteLinks.inboundEndpoint(input.fromNodeId, input.message.senderAgentRunId, input.message.receiverAgentRunId);
    if (!endpoint || !this.options.getIndex().isRunAgent(input.message.receiverAgentRunId)) return Promise.resolve(notLinked);
    return this.whenReady(() => this.options.getCommunication().acceptFromRemote({
      message: input.message, endpoint, receiverIdentity: this.agentIdentity(), receiverDisplayName: this.hostName(), senderNodeName: input.fromNodeName, senderAddress: input.senderAddress,
      files: input.files,
    }));
  }

  /** DS-2: a message from another run of this node, for this run's agent; it is made ready first. */
  acceptFromRun(input: CrossRunAcceptInput): Promise<AgentOperationResult> {
    if (!this.options.getIndex().isRunAgent(input.message.receiverAgentRunId)) return Promise.resolve(NOT_AN_AGENT_OF_THIS_RUN(input.message.receiverAgentRunId));
    return this.whenReady(() => this.options.getCommunication().acceptFromRun({ ...input,
      receiverIdentity: this.agentIdentity(), receiverDisplayName: this.hostName() }));
  }

  /**
   * N-6: the work packet of the peer's delegation that started this run (the `delegator` endpoint's link check), its
   * agent made ready, then its files placed in the run's own folder (autobyteus-587 AR-002), then the packet posted with
   * their received paths (RF-8).
   */
  async acceptRemoteWorkPacket(input: RemoteInboundWorkPacket): Promise<AgentOperationResult> {
    if (!this.options.remoteLinks.admitsWorkPacket(input.fromNodeId, input.senderAgentRunId, input.targetAgentRunId)) return notLinked;
    let run;
    try { run = await this.readyAgent(); } catch (error) { return unavailable(error); }
    const files = this.options.receivedFiles.planFor({ agentFolder: receivingAgentFolder(run, this.options.agentRunId),
      senderAgentRunId: input.senderAgentRunId, files: input.files });
    const placed = await files.place();
    if (!placed.ok) return { accepted: false, code: REMOTE_REFUSAL.REFERENCE_FILE_CHECK_FAILED, message: REFERENCE_FILE_REFUSAL_TEXT.notReceived(placed.name) };
    return run.postUserMessage(buildTaskAssigneeWorkPacket({ delegator: { agentRunId: input.senderAgentRunId }, delegatorAddress: null,
      delegatorNode: input.fromNodeName, description: input.description, referenceFiles: files.paths }));
  }

  /** DS-1: the work packet of a local delegation that created this run: its first input (makes its agent ready). */
  async acceptWorkPacket(packet: WorkPacket): Promise<AgentOperationResult> {
    let run;
    try { run = await this.readyAgent(); } catch (error) { return unavailable(error); }
    return run.postUserMessage(buildTaskAssigneeWorkPacket({ delegator: packet.delegator, delegatorAddress: packet.delegatorAddress,
      description: packet.description, comments: packet.comments, ...(packet.task ? { task: packet.task } : {}), referenceFiles: packet.referenceFiles }));
  }

  /**
   * What this run answers when its agent delegates (SR-049): the sender, after its identity check; this run; and this
   * run's own placement (its catalog address map and own refusals). The root adds its gate and its
   * view's peer-run notice; the delegation itself is the tool path's.
   */
  delegationSource(context: TaskDelegationContext): Omit<DelegationSource, "peerRunLinked"> {
    this.options.authorizeIdentity(context.identity);
    return Object.freeze({ sender: context.identity, senderRun: this.options.root,
      resolvePlacement: async (address: string, work: Parameters<DelegationSource["resolvePlacement"]>[1], folder: string | null) =>
        localPlacement(await this.options.recipients.resolveDelegationPlacement(context.identity, address, work, folder)) });
  }

  async reserveAgentInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult> {
    const run = this.options.getIndex().isRunAgent(agentRunId) ? this.options.agent.getActiveRun() : null;
    return run ? run.reserveUserMessage(message)
      : { reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `The run's own agent '${agentRunId}' is not active.` };
  }

  /** A delivered message shows on the run's own Agent stream; a sender of another run or node is named by its run ID. */
  presentCommittedCommunication(message: CollaborationCommunicationMessage): void {
    if (!this.options.getIndex().isRunAgent(message.receiverAgentRunId)) return;
    const senderName = this.options.getIndex().isRunAgent(message.senderAgentRunId) ? this.hostName() : message.senderAgentRunId;
    void this.options.agent.getActiveRun()?.publishEvent(buildDirectAgentRunInterAgentEvent({
      sender: { senderRunId: message.senderAgentRunId, senderName, runtimeKind: null, memberExecutionContext: null },
      targetAgentRunId: message.receiverAgentRunId, content: message.content, messageType: message.messageType,
      referenceFiles: [...message.referenceFiles], createdAt: message.createdAt, messageId: message.messageId,
    })).catch((error: unknown) => console.error(`Agent root '${this.options.agentRunId}' message presentation failed:`, error));
  }

  /** The run's agent made ready (activated, restored, or the live run). */
  async readyAgent(): Promise<AgentRun> {
    const run = await this.options.agent.ensureReady();
    this.options.onAgentReady?.(run);
    return run;
  }

  private async whenReady(deliver: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    try { await this.readyAgent(); } catch (error) { return unavailable(error); }
    return deliver();
  }

  private agentIdentity(): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root,
      memberAddress: this.options.getIndex().agentAddressOf(this.options.agentRunId)!, agentRunId: this.options.agentRunId });
  }
  private hostName(): string {
    return getAgentTeamAddressBasename(this.options.getIndex().agentAddressOf(this.options.agentRunId)!) ?? this.options.agentRunId;
  }
}
