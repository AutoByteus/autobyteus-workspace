import type { AgentOrgIndexedAgentExecution } from "../services/agent-org-execution-index.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { assertAgentTeamAddress, getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createCollaborationMemberExecutionIdentity, sameCollaborationMemberExecutionIdentity, sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { RootTaskLifecycleEngine } from "../../agent-collaboration/execution/task/root-task-lifecycle-engine.js";
import type { DelegateTaskInput, DelegateTaskResult, ReviewTaskResultInput, ReviewTaskResultResult, SubmitTaskResultInput, SubmitTaskResultResult, TaskDelegationContext } from "../../agent-collaboration/execution/task/task-lifecycle-command.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { ActiveRootMessageBoundary, ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { CollaborationAgentPlatformBinding } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { CollaborationAgentExecutionEvent } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "./agent-org-run-execution-tree.js";
import type { AgentOrgRunEvent } from "./agent-org-run-event.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "../persistence/agent-org-task-delegation-records-v1.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import { AgentOrgExecutionIndex } from "../services/agent-org-execution-index.js";
import { AgentOrgRootAgentExecutionRegistry } from "../services/agent-org-root-agent-execution-registry.js";
import { AgentOrgTeamExecutionDirectory } from "../services/agent-org-team-execution-directory.js";
import { AgentOrgRunPersistenceCoordinator } from "../services/agent-org-run-persistence-coordinator.js";
import { AgentOrgTaskLifecycleAdapter, type ResolvedAgentOrgRecipient } from "../services/agent-org-task-lifecycle-adapter.js";
import { AgentOrgCommunicationAdapter } from "../services/agent-org-communication-adapter.js";
import { adoptAgentOrgPlatformBinding } from "../services/agent-org-run-execution-tree-mutator.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { RootSnapshotConnection } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { AgentOrgOperationGate } from "./agent-org-operation-gate.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-delegation-record-v1.js";
import {
  createFrozenAgentOrgTerminationScope,
  type FrozenAgentOrgTerminationScope,
} from "./frozen-agent-org-termination-scope.js";
import { projectAgentOrgAgentStatusSnapshots } from "../services/agent-org-agent-status-snapshot-projector.js";

export type AgentOrgRunPackageSnapshot = Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  tasks: AgentOrgTaskDelegationRecordsFileV1;
  messages: AgentOrgCommunicationMessagesFileV1;
  statuses: readonly CollaborationAgentStatusSnapshot[];
}>;

/** Native coordinator-free AgentOrg aggregate and sole live owner of its scope. */
export class AgentOrgRun implements ActiveRootMessageBoundary {
  private lifecycle: "activating" | "active" | "terminating" | "terminated" | "fail_stop" = "activating";
  private tree: AgentOrgRunExecutionTreeSnapshot;
  private tasks: AgentOrgTaskDelegationRecordsFileV1;
  private messages: AgentOrgCommunicationMessagesFileV1;
  private index: AgentOrgExecutionIndex;
  private readonly taskEngine: RootTaskLifecycleEngine<ResolvedAgentOrgRecipient>;
  private readonly communication: RootCommunicationEngine;
  private readonly presentation: CollaborationAgentPresentationEventAdapter;
  private readonly operationGate: AgentOrgOperationGate;
  private readonly retiringAgentEvents = new Map<string, CollaborationMemberExecutionIdentity>();
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenAgentOrgTerminationScope | null = null;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    tree: AgentOrgRunExecutionTreeSnapshot;
    tasks: AgentOrgTaskDelegationRecordsFileV1;
    messages: AgentOrgCommunicationMessagesFileV1;
    rootAgents: AgentOrgRootAgentExecutionRegistry;
    teams: AgentOrgTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: AgentOrgRunPersistenceCoordinator;
    publisher: RootEventPublisher<AgentOrgRunEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    onTerminated?(): void;
  }>) {
    this.tree = options.tree;
    this.tasks = options.tasks;
    this.messages = options.messages;
    this.index = new AgentOrgExecutionIndex(this.tree);
    this.assertCorrelation();
    this.operationGate = new AgentOrgOperationGate({
      orgRunId: this.orgRunId,
      canEnter: () => this.isAdmitting(),
    });
    this.presentation = new CollaborationAgentPresentationEventAdapter((agentRunId) => {
      const agent = this.index.getAgent(agentRunId);
      return agent && this.index.isLiveAgent(agentRunId)
        ? this.identityFor(agent.agentRunId, agent.address)
        : null;
    });
    this.taskEngine = new RootTaskLifecycleEngine(new AgentOrgTaskLifecycleAdapter({
      root: options.root,
      initial: options.tasks,
      taskExecutionIdentity: options.taskExecutionIdentity,
      rootAgents: options.rootAgents,
      teams: options.teams,
      callbacks: options.callbacks,
      persistence: options.persistence,
      getTree: () => this.tree,
      getIndex: () => this.index,
      isOpen: () => this.isAdmitting(),
      authorize: (identity) => this.authorizeCurrentIdentity(identity),
      beginTaskExecutionEventRetirement: (reference) => this.beginTaskExecutionEventRetirement(reference),
      replaceState: (tree, tasks) => this.replaceTaskState(tree, tasks),
      publish: (event) => options.publisher.publish({ kind: "task", event }),
      deliverSystemMessage: (agentRunId, message) => this.postMessageToAgent(agentRunId, message),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
    }));
    this.communication = new RootCommunicationEngine(new AgentOrgCommunicationAdapter({
      root: options.root,
      initial: options.messages,
      persistence: options.persistence,
      isOpen: () => this.isAdmitting(),
      isCurrentAgent: (identity) => this.isPublishedAgent(identity),
      reserveRecipientInput: (agentRunId, message) => this.reserveAgentInput(agentRunId, message),
      replaceMessages: (messages) => { this.messages = messages; },
      publish: (message) => options.publisher.publish({ kind: "communication", message }),
      presentCommittedMessage: (message, receiverInput) => {
        this.presentCommittedCommunication(message, receiverInput);
      },
    }));
  }

  get orgRunId(): string { return this.tree.rootOrg.orgRunId; }
  get rootIdentity(): RootExecutionIdentity { return this.options.root; }
  isActive(): boolean { return this.lifecycle === "active"; }
  activate(): void {
    if (this.lifecycle !== "activating") throw new Error(`AgentOrg '${this.orgRunId}' is not activatable.`);
    this.lifecycle = "active";
  }
  getExecutionTreeSnapshot(): AgentOrgRunExecutionTreeSnapshot { return this.tree; }
  getTaskRecordsSnapshot(): AgentOrgTaskDelegationRecordsFileV1 { return this.tasks; }
  getCommunicationSnapshot(): AgentOrgCommunicationMessagesFileV1 { return this.messages; }
  getAgentStatusSnapshots(): readonly CollaborationAgentStatusSnapshot[] {
    return projectAgentOrgAgentStatusSnapshots({
      tree: this.tree,
      rootAgents: this.options.rootAgents,
      teams: this.options.teams,
    });
  }
  hasOpenExecutionWork(): boolean {
    return this.taskEngine.hasOpenWork()
      || this.options.rootAgents.listHandles().some((handle) => handle.hasOpenExecutionWork())
      || this.options.teams.list().some((team) => team.hasOpenExecutionWork());
  }
  getExecutionCheckpoint(): Readonly<{
    orgRunId: string;
    changeSequence: number;
    hasOpenExecutionWork: boolean;
  }> {
    return Object.freeze({
      orgRunId: this.orgRunId,
      changeSequence: this.options.publisher.getCurrentChangeSequence(),
      hasOpenExecutionWork: this.hasOpenExecutionWork(),
    });
  }

  resolveRecipient(addressInput: string): ResolvedAgentOrgRecipient {
    this.assertAdmitting();
    const address = assertAgentTeamAddress(addressInput);
    if (address === "/") throw new Error("AgentOrg root '/' is structural and is not a recipient.");
    const placement = this.index.getConfiguredPlacement(address);
    if (!placement) throw new Error(`Recipient '${address}' is not an exact configured Agent or direct Team in this AgentOrg.`);
    return "agentRunId" in placement
      ? Object.freeze({ kind: "agent", address })
      : Object.freeze({ kind: "agent_team", address, coordinatorAddress: placement.coordinatorAddress });
  }

  authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void {
    this.assertAdmitting();
    this.authorizeCurrentIdentity(identity);
  }
  private authorizeCurrentIdentity(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.isCurrentAgent(identity)) throw new Error(`AgentRun '${identity.agentRunId}' is not a live execution at '${identity.memberAddress}' in AgentOrg '${this.orgRunId}'.`);
  }

  async deliverLogicalMessage(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(sender);
      const recipient = this.resolveRecipient(input.recipientAddress);
      const receiver = this.resolveRecipientIdentity(recipient);
      return this.communication.deliver({
        senderIdentity: sender,
        senderDisplayName: getAgentTeamAddressBasename(sender.memberAddress) ?? sender.agentRunId,
        receiverIdentity: receiver,
        receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
        content: input.content,
        messageType: input.messageType,
        referenceFiles: input.referenceFiles,
      });
    });
  }

  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(input.sender.identity);
      const receiver = this.index.getAgent(input.targetAgentRunId);
      if (!receiver || !this.index.isLiveAgent(receiver.agentRunId)) {
        return { accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE", message: `AgentRun '${input.targetAgentRunId}' is not live in this AgentOrg.` };
      }
      return this.communication.deliver({
        senderIdentity: input.sender.identity,
        senderDisplayName: input.sender.displayName,
        receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
        receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
        content: input.content,
        messageType: input.messageType,
        referenceFiles: input.referenceFiles,
      });
    });
  }

  delegateTask(context: TaskDelegationContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      const placement = this.resolveRecipient(input.recipient_address);
      if (placement.kind === "agent" && placement.address === context.identity.memberAddress) {
        throw new Error("An Agent cannot delegate a task to its own logical placement.");
      }
      return this.taskEngine.delegateTask(context, input, placement);
    });
  }
  submitTaskResult(context: TaskDelegationContext, input: SubmitTaskResultInput): Promise<SubmitTaskResultResult> {
    return this.taskEngine.submitTaskResult(context, input);
  }
  reviewTaskResult(context: TaskDelegationContext, input: ReviewTaskResultInput): Promise<ReviewTaskResultResult> {
    return this.taskEngine.reviewTaskResult(context, input);
  }

  async adoptAgentPlatformBinding(binding: CollaborationAgentPlatformBinding): Promise<void> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      await this.options.persistence.commitTreeMutation({
      prepareAgainstCurrent: () => {
        const mutation = adoptAgentOrgPlatformBinding({ tree: this.tree, binding });
        return {
          nextTree: mutation.tree,
          cancelBeforeDurability: () => undefined,
          commitAfterDurability: () => {
            this.tree = mutation.tree;
            this.index = new AgentOrgExecutionIndex(this.tree);
          },
        };
      },
      });
    });
  }

  onAgentExecutionEvent(identity: CollaborationMemberExecutionIdentity, event: CollaborationAgentExecutionEvent): void {
    if (!sameRootExecutionIdentity(identity.root, this.options.root)) throw new Error("AgentOrg event belongs to another root.");
    if (this.isCommittedTeardownStatus(identity, event)) return;
    const adapted = this.presentation.adapt(identity, event);
    if (adapted.kind === "rejected") {
      this.enterFailStop();
      throw new Error(adapted.message);
    }
    if (adapted.kind === "publish") {
      this.options.publisher.publish({ kind: "agent_presentation", execution: identity, message: adapted.message });
    }
    if ((event.kind === "status_overlay" && (event.snapshot.details.status === "idle" || event.snapshot.details.status === "offline"))
      || (event.kind === "agent_run" && event.event.eventType === "AGENT_STATUS"
        && (event.event.payload.status === "idle" || event.event.payload.status === "offline"))) {
      this.taskEngine.onExecutionBecameIdle();
    }
  }

  subscribeToEvents(listener: Parameters<RootEventPublisher<AgentOrgRunEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<AgentOrgRunPackageSnapshot, AgentOrgRunEvent>> {
    return this.options.publisher.openSnapshotConnection(() => Object.freeze({
      tree: this.tree,
      tasks: this.tasks,
      messages: this.messages,
      statuses: this.getAgentStatusSnapshots(),
    }));
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    const wasFailStopped = this.lifecycle === "fail_stop";
    this.lifecycle = "terminating";
    this.communication.closeAdmission();
    this.taskEngine.closeExternalAdmission();
    void this.operationGate.closeAndDrain();
    const attempt = this.terminateOnce(wasFailStopped);
    this.termination = attempt;
    return attempt;
  }

  private async terminateOnce(failStopped: boolean): Promise<AgentOperationResult> {
    const errors: string[] = [];
    await this.operationGate.closeAndDrain();
    this.frozenTerminationScope ??= createFrozenAgentOrgTerminationScope({
      agentHandles: this.options.rootAgents.freezeForRootTermination(),
      teamScopes: this.options.teams.freezeForRootTermination(),
    });
    const fenced = await this.frozenTerminationScope.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    try {
      if (!failStopped) await this.taskEngine.shutdownAndSettle("AgentOrg root is terminating.");
      else await this.taskEngine.drain();
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    await this.options.persistence.drain();
    const local = await this.frozenTerminationScope.finish();
    if (!local.accepted) errors.push(local.message ?? local.code ?? "AgentOrg local termination failed");
    this.lifecycle = "terminated";
    this.options.publisher.publish({ kind: "lifecycle", isActive: false });
    this.options.publisher.clear();
    this.options.onTerminated?.();
    return errors.length
      ? { accepted: false, code: "AGENT_ORG_TERMINATION_FAILED", message: errors.join("; ") }
      : { accepted: true };
  }

  private reserveAgentInput(agentRunId: string, message: AgentInputUserMessage, options: AgentRunInputOptions = {}): Promise<AgentRunInputReservationResult> {
    const agent = this.index.getAgent(agentRunId);
    if (!agent || !this.index.isLiveAgent(agentRunId)) return Promise.resolve({
      reserved: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
      message: `AgentRun '${agentRunId}' is not live in AgentOrg '${this.orgRunId}'.`,
    });
    return agent.host.hostKind === "root"
      ? this.options.rootAgents.reserveInput(agentRunId, message, options)
      : this.options.teams.require(agent.host.hostRunId).reserveDirectAgentInput(agentRunId, message, options);
  }

  private async postMessageToAgent(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const agent = this.index.getAgent(agentRunId);
    if (!agent || !this.index.isLiveAgent(agentRunId)) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not live in AgentOrg '${this.orgRunId}'.` };
    return agent.host.hostKind === "root"
      ? this.options.rootAgents.executeCommand(agentRunId, { kind: "post_message", message })
      : this.options.teams.require(agent.host.hostRunId).executeDirectAgentCommand(agentRunId, { kind: "post_message", message });
  }

  private presentCommittedCommunication(
    message: AgentOrgCommunicationMessagesFileV1["messages"][number],
    receiverInput: AgentInputUserMessage,
  ): void {
    // Admission already succeeded. Retained identities, not current liveness,
    // correlate this post-durable presentation consequence.
    this.index.requireAgent(message.senderAgentRunId);
    const receiver = this.index.requireAgent(message.receiverAgentRunId);
    const identity = this.identityFor(receiver.agentRunId, receiver.address);
    const event = buildMemberInputPresentationEvent({
      execution: identity, message: receiverInput, receivedAt: message.createdAt,
    });
    this.options.publisher.publish({
      kind: "agent_presentation", execution: identity,
      message: projectAgentPresentationMessage(event),
    });
  }

  private beginTaskExecutionEventRetirement(reference: TaskExecutionReference): () => void {
    const execution = this.index.getTaskExecution(reference);
    if (!execution) throw new Error("Task execution event retirement target is not live in this AgentOrg.");
    const agents = execution.kind === "agent"
      ? [this.index.requireAgent(execution.agentRunId)]
      : this.index.listAgents().filter((agent) => agent.host.hostKind === "team"
        && this.index.listTeamAncestorsDeepestFirst(agent.host.hostRunId)
          .some((team) => team.teamRunId === execution.teamRunId));
    const retired = agents.map((agent) => this.identityFor(agent.agentRunId, agent.address));
    for (const identity of retired) {
      const current = this.retiringAgentEvents.get(identity.agentRunId);
      if (current && !sameCollaborationMemberExecutionIdentity(current, identity)) {
        throw new Error(`AgentRun '${identity.agentRunId}' already has a different event-retirement identity.`);
      }
      this.retiringAgentEvents.set(identity.agentRunId, identity);
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const identity of retired) {
        const current = this.retiringAgentEvents.get(identity.agentRunId);
        if (current && sameCollaborationMemberExecutionIdentity(current, identity)) {
          this.retiringAgentEvents.delete(identity.agentRunId);
        }
      }
    };
  }

  private isCommittedTeardownStatus(
    identity: CollaborationMemberExecutionIdentity,
    event: CollaborationAgentExecutionEvent,
  ): boolean {
    const retired = this.retiringAgentEvents.get(identity.agentRunId);
    return event.kind === "agent_run"
      && event.event.eventType === "AGENT_STATUS"
      && Boolean(retired && sameCollaborationMemberExecutionIdentity(retired, identity));
  }

  async executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    return (await this.executeAgentCommandWithExecutionKind(agentRunId, command)).result;
  }

  executeAgentCommandWithExecutionKind(agentRunId: string, command: TeamMemberExecutionCommand): Promise<Readonly<{
    result: AgentOperationResult;
    executionKind: AgentOrgIndexedAgentExecution["executionKind"] | null;
  }>> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      const agent = this.index.getAgent(agentRunId);
      if (!agent || !this.index.isLiveAgent(agentRunId)) return Object.freeze({
        result: { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not live in AgentOrg '${this.orgRunId}'.` },
        executionKind: agent?.executionKind ?? null,
      });
      const result = await (agent.host.hostKind === "root"
        ? this.options.rootAgents.executeCommand(agentRunId, command)
        : this.options.teams.require(agent.host.hostRunId).executeDirectAgentCommand(agentRunId, command));
      return Object.freeze({ result, executionKind: agent.executionKind });
    });
  }

  private resolveRecipientIdentity(recipient: ResolvedAgentOrgRecipient): CollaborationMemberExecutionIdentity {
    if (recipient.kind === "agent") {
      const placement = this.index.getConfiguredPlacement(recipient.address);
      if (!placement || !("agentRunId" in placement)) throw new Error(`Agent '${recipient.address}' is not configured.`);
      return this.identityFor(placement.agentRunId, placement.address);
    }
    const team = this.index.getConfiguredPlacement(recipient.address);
    if (!team || "agentRunId" in team) throw new Error(`Team '${recipient.address}' is not configured.`);
    const coordinator = team.members.find((agent) => agent.address === team.coordinatorAddress);
    if (!coordinator) throw new Error(`Team '${recipient.address}' has no exact coordinator.`);
    return this.identityFor(coordinator.agentRunId, coordinator.address);
  }
  private identityFor(agentRunId: string, address: AgentTeamAddress): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root, memberAddress: address, agentRunId });
  }
  private isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean {
    if (!this.isPublishedAgent(identity)) return false;
    const agent = this.index.getAgent(identity.agentRunId)!;
    return agent.host.hostKind !== "root" || this.options.rootAgents.isActive(identity.agentRunId);
  }
  // Published receiver membership admits first work; it is not sender authorization.
  private isPublishedAgent(identity: CollaborationMemberExecutionIdentity): boolean {
    if (!sameRootExecutionIdentity(identity.root, this.options.root)) return false;
    const agent = this.index.getAgent(identity.agentRunId);
    const hostIsActive = agent?.host.hostKind === "root"
      ? Boolean(this.options.rootAgents.get(identity.agentRunId))
      : Boolean(agent && this.options.teams.get(agent.host.hostRunId)?.isActive());
    return Boolean(agent && hostIsActive && agent.address === identity.memberAddress && this.index.isLiveAgent(identity.agentRunId)
      && sameCollaborationMemberExecutionIdentity(identity, this.identityFor(agent.agentRunId, agent.address)));
  }
  private replaceTaskState(tree: AgentOrgRunExecutionTreeSnapshot, tasks: AgentOrgTaskDelegationRecordsFileV1): void {
    this.tree = tree;
    this.tasks = tasks;
    this.index = new AgentOrgExecutionIndex(tree);
  }
  private isAdmitting(): boolean { return this.lifecycle === "active"; }
  private assertAdmitting(): void {
    if (!this.isAdmitting()) throw new Error(`AgentOrg '${this.orgRunId}' is not accepting commands.`);
  }
  private assertCorrelation(): void {
    if (this.options.root.rootSubjectKind !== "agent_org"
      || this.options.root.rootRunId !== this.tree.rootOrg.orgRunId
      || this.tasks.orgRunId !== this.orgRunId
      || this.messages.orgRunId !== this.orgRunId) {
      throw new Error("AgentOrg aggregate authorities do not correlate to one exact root.");
    }
  }
  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.lifecycle === "fail_stop") return;
    this.lifecycle = "fail_stop";
    this.options.persistence.enterRootFailStop();
    this.taskEngine.enterRootFailStop();
    this.communication.closeAdmission();
    queueMicrotask(() => { void this.terminate(); });
  }
}
