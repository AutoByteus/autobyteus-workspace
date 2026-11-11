import { NOT_AN_AGENT_OF_THIS_RUN, type CrossRunAcceptInput } from "../../agent-collaboration/communication/cross-run-accept-input.js";
import { reachingAddressOf } from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { mentionViewerOf } from "../../agent-collaboration/collaborators/mention-viewer.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { type AssignToExistingCopyInput, type SpawnTaskInput, type TaskDelegationContext, type TaskDelegationOutcome } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { delegateThrough } from "../../agent-collaboration/execution/task/task-delegation-binding.js";
import { localPlacement } from "../../agent-collaboration/execution/task/task-delegation.js";
import type { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgExecutionIndex, AgentOrgIndexedAgentExecution } from "./agent-org-execution-index.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentOrgRecipientResolver } from "./agent-org-recipient-resolver.js";
import type { AgentOrgRunCollaborators } from "./agent-org-run-collaborators.js";
import { REMOTE_REFUSAL } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import type { RemoteInboundMessage, RemoteRunLinks } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteDelegation } from "../../agent-collaboration/execution/remote/remote-delegation.js";
import type { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";

/**
 * The AgentOrg's message and delegation addressing, `@` mention resolution and child input
 * routing. Every public method runs inside the Org's operation gate, held by the caller, so a
 * catalog bring-in never re-enters it. Mirrors the Team root's `TeamRunMessageDelivery`.
 */
export class AgentOrgRunMessageDelivery {
  constructor(private readonly options: Readonly<{
    orgRunId: string;
    root: RootExecutionIdentity;
    getIndex(): AgentOrgExecutionIndex;
    recipients: AgentOrgRecipientResolver;
    collaborators: AgentOrgRunCollaborators;
    getCommunication(): RootCommunicationEngine;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    publisher: RootEventPublisher<AgentOrgRunEvent>;
    remoteLinks: RemoteRunLinks;
    remoteDelegation: RemoteDelegation;
    remoteSend: RemoteMessageSend;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
  }>) {}

  /**
   * `send_message_to(run ID)` from an agent of this Org: the routing decision only. A remote endpoint goes to
   * the shared remote send (never reactivated, S3); any other run ID through
   * today's exact delivery.
   */
  deliverExact(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    const sender = input.sender.identity;
    const endpoint = this.options.remoteLinks.endpointFor(input.targetAgentRunId);
    if (!endpoint) return this.deliverToRunId(input);
    this.options.authorizeIdentity(sender);
    return this.options.remoteSend.send({ sender, endpoint,
      content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles });
  }

  /** DS-2: a message from another run of this node, for an agent of this org run; it is woken or restored first. */
  acceptFromRun(input: CrossRunAcceptInput): Promise<AgentOperationResult> {
    const receiver = this.options.getIndex().getAgent(input.message.receiverAgentRunId);
    if (!receiver) return Promise.resolve(NOT_AN_AGENT_OF_THIS_RUN(input.message.receiverAgentRunId));
    return this.options.getCommunication().acceptFromRun({ ...input,
      receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId });
  }

  /** The inbound order: the link check, then the paired agent is woken or restored (N-8), then the engine admits it. */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    const endpoint = this.options.remoteLinks.inboundEndpoint(input.fromNodeId, input.message.senderAgentRunId, input.message.receiverAgentRunId);
    // The endpoint admitted the message's target as one of its paired agents (N-301): it is the receiver.
    const receiver = endpoint ? this.options.getIndex().getAgent(input.message.receiverAgentRunId) : null;
    if (!endpoint || !receiver) {
      return Promise.resolve({ accepted: false, code: REMOTE_REFUSAL.TARGET_NOT_PERMITTED, message: "That run is not linked with the sender." });
    }
    return this.options.getCommunication().acceptFromRemote({
      message: input.message,
      endpoint,
      receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
      senderNodeName: input.fromNodeName,
    });
  }

  /** `@`: resolves the mentioned definitions for the focused agent (adds nothing); the caller composes the note. */
  resolveMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.options.getIndex().getAgent(input.focusedAgentRunId)
      ? this.options.collaborators.resolveMentions(input.mentions, mentionViewerOf(this.options.getIndex(), input.focusedAgentRunId))
      : Promise.resolve({ admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in AgentOrg '${this.options.orgRunId}'.` });
  }

  /** `list_available_agents` (DS-001): read-only. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.options.authorizeIdentity(sender);
    return this.options.collaborators.listAvailable();
  }

  /** `send_message_to(address)`: delivers to a standing instance; any other address is not found. */
  async deliverToAddress(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(sender);
    const target = this.options.recipients.resolveMessageRecipient(sender, input.recipientAddress).receiver;
    const receiver = this.identityFor(target.agentRunId, target.address);
    return this.options.getCommunication().deliver({
      senderIdentity: sender,
      senderDisplayName: getAgentTeamAddressBasename(sender.memberAddress) ?? sender.agentRunId,
      senderAddress: reachingAddressOf(this.options.getIndex(), receiver.agentRunId, sender),
      receiverIdentity: receiver,
      receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    });
  }

  /** `send_message_to(run ID)`: existing executions only; never brings anything in. */
  deliverToRunId(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(input.sender.identity);
    const receiver = this.options.getIndex().getAgent(input.targetAgentRunId);
    if (!receiver) {
      return Promise.resolve({ accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `AgentRun '${input.targetAgentRunId}' is not in this AgentOrg.` });
    }
    return this.options.getCommunication().deliver({
      senderIdentity: input.sender.identity,
      senderDisplayName: input.sender.displayName,
      senderAddress: reachingAddressOf(this.options.getIndex(), receiver.agentRunId, input.sender.identity),
      receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    });
  }

  /** `delegate_task(address)`: never to the caller itself, a teammate or its own Team (CM-1, in the shared resolution). */
  async delegateToNewCopy(context: TaskDelegationContext, input: SpawnTaskInput): Promise<TaskDelegationOutcome> {
    this.options.authorizeIdentity(context.identity);
    if (input.node !== undefined) {
      return this.options.remoteDelegation.delegate({ ...input, node: input.node }, context);
    }
    // DS-1: the new run is an ordinary run of its own; this org run is its delegating run.
    return delegateThrough((delegation) => delegation.toNewRun({ sender: context.identity, senderRun: context.identity.root,
      delegatorAddress: reachingAddressOf(this.options.getIndex(), null, context.identity), spawn: input,
      resolvePlacement: async (work, folder) => localPlacement(await this.options.recipients.resolveDelegationPlacement(context.identity, input.recipient_address, work, folder)) }));
  }

  /** `delegate_task` with a copy's own ID: its new Task's work is delivered by this root's exact delivery. */
  assignToExistingCopy(context: TaskDelegationContext, input: AssignToExistingCopyInput): Promise<TaskDelegationOutcome> {
    this.options.authorizeIdentity(context.identity);
    return delegateThrough((delegation) => delegation.toExistingRun({ sender: context.identity, senderRun: context.identity.root, assign: input }));
  }

  reserveAgentInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (!agent || !this.isLiveAgent(agentRunId)) return Promise.resolve({
      reserved: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
      message: `AgentRun '${agentRunId}' is not live in AgentOrg '${this.options.orgRunId}'.`,
    });
    return agent.host.hostKind === "root"
      ? this.options.rootAgents.reserveInput(agentRunId, message, options)
      : this.options.teams.require(agent.host.hostRunId).reserveDirectAgentInput(agentRunId, message, options);
  }

  presentCommittedCommunication(
    message: AgentOrgCommunicationMessagesFile["messages"][number],
    receiverInput: AgentInputUserMessage,
  ): void {
    // Admission already succeeded. Retained identities, not current liveness,
    // correlate this post-durable presentation consequence.
    const index = this.options.getIndex();
    // A sender on a peer node is a linked remote endpoint, not an agent of this Org.
    if (!this.options.remoteLinks.has(message.senderAgentRunId)) index.requireAgent(message.senderAgentRunId);
    const receiver = index.requireAgent(message.receiverAgentRunId);
    const identity = this.identityFor(receiver.agentRunId, receiver.address);
    const event = buildMemberInputPresentationEvent({
      execution: identity, message: receiverInput, receivedAt: message.createdAt,
    });
    this.options.publisher.publish({
      kind: "agent_presentation", execution: identity,
      message: projectAgentPresentationMessage(event),
    });
  }

  /** An operator command for one agent; inside the root's gate, held by the caller. */
  async executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<Readonly<{
    result: AgentOperationResult;
    executionKind: AgentOrgIndexedAgentExecution["executionKind"] | null;
  }>> {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (!agent) return Object.freeze({
      result: { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not in AgentOrg '${this.options.orgRunId}'.` },
      executionKind: null,
    });
    const execute = () => agent.host.hostKind === "root"
      ? this.options.rootAgents.executeCommand(agentRunId, command)
      : this.options.teams.require(agent.host.hostRunId).executeDirectAgentCommand(agentRunId, command);
    if (command.kind !== "post_message") {
      const result = this.isLiveAgent(agentRunId)
        ? await execute()
        : { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in AgentOrg '${this.options.orgRunId}'.` };
      return Object.freeze({ result, executionKind: agent.executionKind });
    }
    const result = await execute();
    return Object.freeze({ result, executionKind: agent.executionKind });
  }


  /** Runtime liveness (AR-005): a direct agent is registered; a mounted team's member is live with its team (lazy start). */
  isLiveAgent(agentRunId: string): boolean {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (!agent) return false;
    if (agent.host.hostKind === "root") return this.options.rootAgents.get(agentRunId) !== null;
    return this.options.teams.get(agent.host.hostRunId) !== null;
  }

  private identityFor(agentRunId: string, address: AgentTeamAddress): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root, memberAddress: address, agentRunId });
  }
}
