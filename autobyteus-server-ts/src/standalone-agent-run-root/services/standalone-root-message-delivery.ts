import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import type { StandaloneRunPostInput, StandaloneRunPostResult } from "../../agent-execution/services/standalone-run-ports.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { TaskDelegationError, type AssignToExistingCopyInput, type SpawnTaskInput, type TaskDelegationContext, type TaskDelegationOutcome } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { delegateToResolvedTarget } from "../../agent-collaboration/execution/task/task-delegation-target.js";
import { buildTaskWorkMessageInput } from "../../agent-collaboration/execution/task/task-execution-input.js";
import type { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
import type { ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import { buildDirectAgentRunInterAgentEvent } from "../../agent-communication/services/global-agent-run-message-runtime-builders.js";
import type { StandaloneHostAgentHandle } from "../domain/standalone-host-agent-handle.js";
import type { StandaloneRootEvent } from "../domain/standalone-root-event.js";
import type { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";
import type { StandaloneRootCollaborators } from "./standalone-root-collaborators.js";
import type { StandaloneRootRecipientResolver } from "./standalone-root-recipient-resolver.js";
import type { StandaloneRootPlacement } from "./standalone-root-task-execution-adapter.js";

type DeliveryInput = Readonly<{
  senderIdentity: CollaborationMemberExecutionIdentity;
  senderDisplayName: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/**
 * The standalone root's message and delegation addressing, `@` mention resolution, input
 * routing and child commands. Every public method runs inside the root's operation gate, held by the caller, so a
 * catalog bring-in never re-enters it. The host is reached through its handle like any child:
 * a message to a host that is not running makes it ready first (no special wake path).
 */
export class StandaloneRootMessageDelivery {
  constructor(private readonly options: Readonly<{
    hostRunId: string;
    root: RootExecutionIdentity;
    getIndex(): StandaloneRootExecutionIndex;
    recipients: StandaloneRootRecipientResolver;
    collaborators: StandaloneRootCollaborators;
    taskExecutions: RootTaskExecutionLifecycle<StandaloneRootPlacement>;
    getCommunication(): RootCommunicationEngine;
    host: StandaloneHostAgentHandle;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    publisher: RootEventPublisher<StandaloneRootEvent>;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
  }>) {}

  /** `@`: resolves the mentioned definitions for the focused agent (adds nothing); the caller composes the note. */
  resolveMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.options.getIndex().getAgent(input.focusedAgentRunId)
      ? this.options.collaborators.resolveMentions(input.focusedAgentRunId, input.mentions)
      : Promise.resolve({ admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in Agent root '${this.options.hostRunId}'.` });
  }

  /**
   * A user message for the host: ready (activated or restored as needed), `onActiveRunReady`
   * (binds its stream) before anything is resolved or posted, mention resolution (adds nothing),
   * then the post of the composed message with the caller's options unchanged. A failed
   * resolution posts nothing.
   */
  async postToHost(input: Omit<StandaloneRunPostInput, "runId">): Promise<StandaloneRunPostResult> {
    const run = await this.options.host.ensureReady();
    input.onActiveRunReady?.(run);
    let message = input.message;
    if (input.mentions?.length) {
      let admission: RootCollaboratorAdmissionResult;
      try {
        admission = await this.resolveMentions({ focusedAgentRunId: this.options.hostRunId, mentions: input.mentions });
      } catch (error) {
        return { kind: "admission_failed", run, message: error instanceof Error ? error.message : String(error) };
      }
      if (!admission.admitted) return { kind: "admission_rejected", run, admission };
      message = new AgentInputUserMessage(
        composeCollaboratorMentionNote(message.content, admission.collaborators),
        message.senderType, message.contextFiles, message.metadata,
      );
    }
    return { kind: "posted", run, post: await run.postUserMessage(message, input.postOptions) };
  }

  /** `list_available_agents` (DS-001): read-only, never creates the package (AR-005). */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.options.authorizeIdentity(sender);
    return this.options.collaborators.listAvailable(sender.agentRunId);
  }

  /** `send_message_to(address)`; a first message to a catalog address brings it in. */
  async deliverToAddress(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(sender);
    const resolution = await this.options.recipients.resolveMessageRecipient(sender, input.recipientAddress);
    if (!resolution.resolved) return { accepted: false, code: resolution.code, message: resolution.message };
    return this.deliverTo(resolution.placement.receiver.agentRunId, {
      senderIdentity: sender,
      senderDisplayName: getAgentTeamAddressBasename(sender.memberAddress) ?? sender.agentRunId,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    });
  }

  /** `send_message_to(run ID)`: existing executions only; never brings anything in. */
  deliverToRunId(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(input.sender.identity);
    if (!this.options.getIndex().getAgent(input.targetAgentRunId)) {
      return Promise.resolve({ accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `AgentRun '${input.targetAgentRunId}' is not in this Agent run.` });
    }
    return this.deliverTo(input.targetAgentRunId, {
      senderIdentity: input.sender.identity,
      senderDisplayName: input.sender.displayName,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    });
  }

  /**
   * `delegate_task(address)`: never to the caller's own address (as in Team and Org roots). The
   * host is not a delegation placement, so its own address is refused before resolution.
   */
  delegateToNewCopy(context: TaskDelegationContext, input: SpawnTaskInput): Promise<TaskDelegationOutcome> {
    this.options.authorizeIdentity(context.identity);
    const selfTarget = () => new CollaborationContractError(
      "COLLABORATION_SELF_TARGET_REJECTED",
      "An Agent cannot delegate a task to its own logical placement.",
    );
    if (input.recipient_address.trim() === context.identity.memberAddress) throw selfTarget();
    return delegateToResolvedTarget(
      () => this.options.recipients.resolveDelegationPlacement(context.identity, input.recipient_address),
      (placement) => {
        if (placement.kind === "agent" && placement.address === context.identity.memberAddress) throw selfTarget();
        return this.options.taskExecutions.delegateToNewCopy(context, input, placement);
      },
    );
  }

  /** `delegate_task` with a copy's own ID: its new Task's work is delivered by this root's exact delivery. */
  assignToExistingCopy(context: TaskDelegationContext, input: AssignToExistingCopyInput): Promise<TaskDelegationOutcome> {
    this.options.authorizeIdentity(context.identity);
    return this.options.taskExecutions.assignToExistingCopy(context, input, (targetAgentRunId, content, referenceFiles) =>
      this.deliverToRunId(buildTaskWorkMessageInput(context.identity, targetAgentRunId, content, referenceFiles)));
  }

  async reserveAgentInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult> {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (agent?.executionKind === "host") {
      const run = this.options.host.getActiveRun();
      return run
        ? run.reserveUserMessage(message)
        : { reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `The run's own agent '${agentRunId}' is not active.` };
    }
    if (!agent || !this.isLiveChild(agentRunId)) {
      return { reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `AgentRun '${agentRunId}' is not live in Agent root '${this.options.hostRunId}'.` };
    }
    return agent.host.hostKind === "root"
      ? this.options.rootAgents.reserveInput(agentRunId, message)
      : this.options.teams.require(agent.host.hostRunId).reserveDirectAgentInput(agentRunId, message);
  }

  presentCommittedCommunication(message: CollaborationCommunicationMessageV1, receiverInput: AgentInputUserMessage): void {
    const index = this.options.getIndex();
    const receiver = index.requireAgent(message.receiverAgentRunId);
    if (receiver.executionKind === "host") {
      // The host's conversation lives on its own Agent stream: show the delivery there.
      const sender = index.requireAgent(message.senderAgentRunId);
      void this.options.host.getActiveRun()?.publishEvent(buildDirectAgentRunInterAgentEvent({
        sender: { senderRunId: sender.agentRunId, senderName: getAgentTeamAddressBasename(sender.address) ?? sender.agentRunId, runtimeKind: null, memberExecutionContext: null },
        targetAgentRunId: receiver.agentRunId,
        content: message.content,
        messageType: message.messageType,
        referenceFiles: [...message.referenceFiles],
        createdAt: message.createdAt,
        messageId: message.messageId,
      })).catch((error: unknown) => console.error(`Agent root '${this.options.hostRunId}' host message presentation failed:`, error));
      return;
    }
    const identity = this.identityFor(receiver.agentRunId, receiver.address);
    const event = buildMemberInputPresentationEvent({ execution: identity, message: receiverInput, receivedAt: message.createdAt });
    this.options.publisher.publish({ kind: "agent_presentation", execution: identity, message: projectAgentPresentationMessage(event) });
  }

  /** Commands for children only; the host's commands come through its own Agent stream. */
  executeChildCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (!agent) return Promise.resolve({ accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not in Agent root '${this.options.hostRunId}'.` });
    if (agent.executionKind === "host") {
      return Promise.resolve({ accepted: false, code: "AGENT_ROOT_HOST_COMMAND_REJECTED", message: "Commands for the run's own agent go through its Agent stream." });
    }
    const execute = () => agent.host.hostKind === "root"
      ? this.options.rootAgents.executeCommand(agentRunId, command)
      : this.options.teams.require(agent.host.hostRunId).executeDirectAgentCommand(agentRunId, command);
    if (command.kind !== "post_message") {
      return this.isLiveChild(agentRunId)
        ? this.options.taskExecutions.withLiveLease(agentRunId, execute)
        : Promise.resolve({ accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in Agent root '${this.options.hostRunId}'.` });
    }
    // Operator input wakes a shut-down child exactly like send_message_to.
    return this.withLiveLease(agentRunId, execute);
  }

  /** Target lease that records the receiver's first accepted message or operator post. */
  withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    return this.options.taskExecutions.withLiveLease(agentRunId, operation);
  }

  isLiveChild(agentRunId: string): boolean {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (!agent || agent.executionKind === "host") return false;
    if (agent.host.hostKind === "root") {
      // A collaborator Agent keeps its handle (it starts lazily); a task Agent is live while active.
      return agent.executionKind === "task" ? this.options.rootAgents.isTaskLive(agentRunId) : this.options.rootAgents.get(agentRunId) !== null;
    }
    const host = this.options.teams.get(agent.host.hostRunId);
    return Boolean(host && (agent.executionKind !== "task" || host.hasLiveDirectTaskExecution({ agentRunId })));
  }

  /** The host is made ready through its handle; a child through its live lease. */
  private async deliverTo(targetAgentRunId: string, input: DeliveryInput): Promise<AgentOperationResult> {
    const receiver = this.options.getIndex().requireAgent(targetAgentRunId);
    const deliver = () => this.options.getCommunication().deliver({
      ...input,
      receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
    });
    if (receiver.executionKind !== "host") return this.withLiveLease(receiver.agentRunId, deliver);
    try {
      await this.options.host.ensureReady();
    } catch (error) {
      return { accepted: false, code: "AGENT_ROOT_HOST_UNAVAILABLE", message: error instanceof Error ? error.message : String(error) };
    }
    return deliver();
  }

  private identityFor(agentRunId: string, address: AgentTeamAddress): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root, memberAddress: address, agentRunId });
  }
}
