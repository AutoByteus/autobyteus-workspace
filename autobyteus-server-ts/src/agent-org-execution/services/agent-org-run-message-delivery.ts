import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
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
import type { ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgExecutionIndex, AgentOrgIndexedAgentExecution } from "./agent-org-execution-index.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentOrgRecipientResolver } from "./agent-org-recipient-resolver.js";
import type { AgentOrgRunCollaborators } from "./agent-org-run-collaborators.js";
import type { ResolvedAgentOrgRecipient } from "./agent-org-task-execution-adapter.js";

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
    taskExecutions: RootTaskExecutionLifecycle<ResolvedAgentOrgRecipient>;
    getCommunication(): RootCommunicationEngine;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    publisher: RootEventPublisher<AgentOrgRunEvent>;
    authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void;
  }>) {}

  /** `@`: resolves the mentioned definitions for the focused agent (adds nothing); the caller composes the note. */
  resolveMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.options.getIndex().getAgent(input.focusedAgentRunId)
      ? this.options.collaborators.resolveMentions(input.mentions)
      : Promise.resolve({ admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in AgentOrg '${this.options.orgRunId}'.` });
  }

  /** `list_available_agents` (DS-001): read-only. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.options.authorizeIdentity(sender);
    return this.options.collaborators.listAvailable();
  }

  /** `send_message_to(address)`; a first message to a catalog address brings it in. */
  async deliverToAddress(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(sender);
    const resolution = await this.options.recipients.resolveMessageRecipient(sender, input.recipientAddress);
    if (!resolution.resolved) return { accepted: false, code: resolution.code, message: resolution.message };
    const target = resolution.placement.receiver;
    const receiver = this.identityFor(target.agentRunId, target.address);
    return this.withLiveLease(receiver.agentRunId, () => this.options.getCommunication().deliver({
      senderIdentity: sender,
      senderDisplayName: getAgentTeamAddressBasename(sender.memberAddress) ?? sender.agentRunId,
      receiverIdentity: receiver,
      receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    }));
  }

  /** `send_message_to(run ID)`: existing executions only; never brings anything in. */
  deliverToRunId(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    this.options.authorizeIdentity(input.sender.identity);
    const receiver = this.options.getIndex().getAgent(input.targetAgentRunId);
    if (!receiver) {
      return Promise.resolve({ accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `AgentRun '${input.targetAgentRunId}' is not in this AgentOrg.` });
    }
    return this.withLiveLease(receiver.agentRunId, () => this.options.getCommunication().deliver({
      senderIdentity: input.sender.identity,
      senderDisplayName: input.sender.displayName,
      receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    }));
  }

  /** `delegate_task(address)`: never to the caller's own placement. */
  delegateToNewCopy(context: TaskDelegationContext, input: SpawnTaskInput): Promise<TaskDelegationOutcome> {
    this.options.authorizeIdentity(context.identity);
    return delegateToResolvedTarget(() => this.options.recipients.resolveDelegationPlacement(context.identity, input.recipient_address), (placement) => {
      if (placement.kind === "agent" && placement.address === context.identity.memberAddress) {
        throw new Error("An Agent cannot delegate a task to its own logical placement.");
      }
      return this.options.taskExecutions.delegateToNewCopy(context, input, placement);
    });
  }

  /** `delegate_task` with a copy's own ID: its new Task's work is delivered by this root's exact delivery. */
  assignToExistingCopy(context: TaskDelegationContext, input: AssignToExistingCopyInput): Promise<TaskDelegationOutcome> {
    this.options.authorizeIdentity(context.identity);
    return this.options.taskExecutions.assignToExistingCopy(context, input, (targetAgentRunId, content, referenceFiles) =>
      this.deliverToRunId(buildTaskWorkMessageInput(context.identity, targetAgentRunId, content, referenceFiles)));
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
    message: AgentOrgCommunicationMessagesFileV1["messages"][number],
    receiverInput: AgentInputUserMessage,
  ): void {
    // Admission already succeeded. Retained identities, not current liveness,
    // correlate this post-durable presentation consequence.
    const index = this.options.getIndex();
    index.requireAgent(message.senderAgentRunId);
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
        ? await this.options.taskExecutions.withLiveLease(agentRunId, execute)
        : { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in AgentOrg '${this.options.orgRunId}'.` };
      return Object.freeze({ result, executionKind: agent.executionKind });
    }
    // Operator input wakes a shut-down child exactly like send_message_to.
    const result = await this.withLiveLease(agentRunId, execute);
    return Object.freeze({ result, executionKind: agent.executionKind });
  }

  /** Target lease that records the receiver's first accepted message or operator post. */
  withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
    return this.options.taskExecutions.withLiveLease(agentRunId, operation);
  }

  /**
   * Runtime liveness (AR-005): the host is active and, for a delegated child Agent, its
   * AgentRun is active. Configured Agents and collaborators keep host membership (they
   * activate lazily on their first message).
   */
  isLiveAgent(agentRunId: string): boolean {
    const agent = this.options.getIndex().getAgent(agentRunId);
    if (!agent) return false;
    if (agent.host.hostKind === "root") {
      return agent.executionKind === "task"
        ? this.options.rootAgents.isTaskLive(agentRunId)
        : this.options.rootAgents.get(agentRunId) !== null;
    }
    const host = this.options.teams.get(agent.host.hostRunId);
    if (!host) return false;
    return agent.executionKind !== "task" || host.hasLiveDirectTaskExecution({ agentRunId });
  }

  private identityFor(agentRunId: string, address: AgentTeamAddress): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root, memberAddress: address, agentRunId });
  }
}
