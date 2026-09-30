import type { AgentOrgIndexedAgentExecution } from "../services/agent-org-execution-index.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputOptions, AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { assertAgentTeamAddress, getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createCollaborationMemberExecutionIdentity, sameCollaborationMemberExecutionIdentity, sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { RootTaskExecutionLifecycle, type TaskExecutionLiveLease } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { TaskDelegationError, type DelegateTaskInput, type DelegateTaskResult, type TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { ActiveRootMessageBoundary, ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { createCollaborationAgentStatusSnapshot, type CollaborationAgentExecutionEvent } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "./agent-org-run-execution-tree.js";
import type { AgentOrgRunEvent } from "./agent-org-run-event.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import { AgentOrgExecutionIndex } from "../services/agent-org-execution-index.js";
import { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { AgentOrgRunPersistenceCoordinator } from "../services/agent-org-run-persistence-coordinator.js";
import { AgentOrgTaskExecutionAdapter, type ResolvedAgentOrgRecipient } from "../services/agent-org-task-execution-adapter.js";
import { AgentOrgCommunicationAdapter } from "../services/agent-org-communication-adapter.js";
import { adoptAgentOrgPlatformBinding, replaceAgentOrgPlatformBindingWithoutConversation } from "../services/agent-org-run-execution-tree-mutator.js";
import { delegateToResolvedTarget } from "../../agent-collaboration/execution/task/task-delegation-target.js";
import { AgentOrgTaskEventRetirement } from "../services/agent-org-task-event-retirement.js";
import { AgentOrgRecipientResolver } from "../services/agent-org-recipient-resolver.js";
import { AgentOrgRunCollaborators } from "../services/agent-org-run-collaborators.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorMentionAdmission, CollaboratorMentionAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { RootSnapshotConnection } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { AgentOrgOperationGate } from "./agent-org-operation-gate.js";
import {
  createFrozenAgentOrgTerminationScope,
  type FrozenAgentOrgTerminationScope,
} from "./frozen-agent-org-termination-scope.js";
import { projectAgentOrgAgentStatusSnapshots } from "../services/agent-org-agent-status-snapshot-projector.js";

export type AgentOrgRunPackageSnapshot = Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  messages: AgentOrgCommunicationMessagesFileV1;
  statuses: readonly CollaborationAgentStatusSnapshot[];
}>;

/** Native coordinator-free AgentOrg aggregate and sole live owner of its scope. */
export class AgentOrgRun implements ActiveRootMessageBoundary {
  private lifecycle: "activating" | "active" | "terminating" | "terminated" | "fail_stop" = "activating";
  private tree: AgentOrgRunExecutionTreeSnapshot;
  private messages: AgentOrgCommunicationMessagesFileV1;
  private index: AgentOrgExecutionIndex;
  private readonly taskExecutions: RootTaskExecutionLifecycle<ResolvedAgentOrgRecipient>;
  private readonly communication: RootCommunicationEngine;
  private readonly presentation: CollaborationAgentPresentationEventAdapter;
  private readonly operationGate: AgentOrgOperationGate;
  private readonly recipients = new AgentOrgRecipientResolver();
  private readonly collaborators: AgentOrgRunCollaborators;
  private readonly eventRetirement: AgentOrgTaskEventRetirement;
  private termination: Promise<AgentOperationResult> | null = null;
  /** Fail-stop origin outlives a failed termination attempt, so a retry keeps the fail-stop settlement. */
  private failStopped = false;
  private frozenTerminationScope: FrozenAgentOrgTerminationScope | null = null;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    tree: AgentOrgRunExecutionTreeSnapshot;
    messages: AgentOrgCommunicationMessagesFileV1;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: AgentOrgRunPersistenceCoordinator;
    publisher: RootEventPublisher<AgentOrgRunEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorMentionAdmission;
    onTerminated?(): void;
  }>) {
    this.tree = options.tree;
    this.messages = options.messages;
    this.index = new AgentOrgExecutionIndex(this.tree);
    this.assertCorrelation();
    this.operationGate = new AgentOrgOperationGate({
      orgRunId: this.orgRunId,
      canEnter: () => this.isAdmitting(),
    });
    this.eventRetirement = new AgentOrgTaskEventRetirement({
      getIndex: () => this.index,
      identityFor: (agentRunId, address) => this.identityFor(agentRunId, address as AgentTeamAddress),
    });
    this.presentation = new CollaborationAgentPresentationEventAdapter((agentRunId) => {
      const agent = this.index.getAgent(agentRunId);
      return agent ? this.identityFor(agent.agentRunId, agent.address) : null;
    });
    this.taskExecutions = new RootTaskExecutionLifecycle(new AgentOrgTaskExecutionAdapter({
      root: options.root,
      taskExecutionIdentity: options.taskExecutionIdentity,
      rootAgents: options.rootAgents,
      teams: options.teams,
      callbacks: options.callbacks,
      persistence: options.persistence,
      getTree: () => this.tree,
      getIndex: () => this.index,
      isOpen: () => this.isAdmitting(),
      authorize: (identity) => this.authorizeCurrentIdentity(identity),
      beginTaskExecutionEventRetirement: (reference) => this.eventRetirement.begin(reference),
      replaceTree: (tree) => this.replaceTree(tree),
      publishTaskExecutionStarted: (host, taskExecution) => options.publisher.publish({ kind: "task_execution_started", host, taskExecution }),
      publishAgentOffline: (identity) => this.onAgentExecutionEvent(identity, {
        kind: "status_overlay",
        snapshot: createCollaborationAgentStatusSnapshot({ execution: identity, status: "offline" }),
      }),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
      memoryLocator: options.memoryLocator,
      activityInspector: options.activityInspector,
    }), options.taskExecutionIdleShutdown ?? {});
    this.collaborators = new AgentOrgRunCollaborators({
      admission: options.collaboratorAdmission,
      persistence: options.persistence,
      getTree: () => this.tree,
      getIndex: () => this.index,
      assertAdmitting: () => this.assertAdmitting(),
      replaceTree: (tree) => this.replaceTree(tree),
      publish: (event) => options.publisher.publish(event),
    });
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
  getCommunicationSnapshot(): AgentOrgCommunicationMessagesFileV1 { return this.messages; }
  getAgentStatusSnapshots(): readonly CollaborationAgentStatusSnapshot[] {
    return projectAgentOrgAgentStatusSnapshots({
      tree: this.tree,
      rootAgents: this.options.rootAgents,
      teams: this.options.teams,
    });
  }
  /** Running work only: delegated children count only while initializing or running. */
  hasOpenExecutionWork(): boolean {
    return this.options.rootAgents.hasOpenExecutionWork() || this.options.teams.hasOpenExecutionWork();
  }
  /** Same-root membership for run-ID routing; a shut-down child is still a member. */
  hasAgentExecution(agentRunId: string): boolean { return this.index.getAgent(agentRunId.trim()) !== null; }
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

  /** Message ingress: a configured Agent or direct Team only (a collaborator address gets a hint). */
  resolveMessageRecipient(address: string): ResolvedAgentOrgRecipient {
    this.assertAdmitting();
    return this.recipients.resolveMessageRecipient(this.index, address);
  }

  /** Delegation target: a configured placement first, then a collaborator of this run. */
  resolveDelegationPlacement(address: string): ResolvedAgentOrgRecipient {
    this.assertAdmitting();
    return this.recipients.resolveDelegationPlacement(this.index, address);
  }

  /** Admits mentions for the focused agent in one gate; the caller posts the returned content. */
  admitCollaboratorMentions(input: Parameters<AgentOrgRunCollaborators["admit"]>[0]): Promise<CollaboratorMentionAdmissionResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      return this.index.getAgent(input.focusedAgentRunId)
        ? this.collaborators.admit(input)
        : { admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in AgentOrg '${this.orgRunId}'.` };
    });
  }

  collaboratorPort(): CollaboratorRootPort { return this.collaborators.port(); }

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
      const recipient = this.resolveMessageRecipient(input.recipientAddress);
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
      if (!receiver) {
        return { accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `AgentRun '${input.targetAgentRunId}' is not in this AgentOrg.` };
      }
      return this.withLiveLease(receiver.agentRunId, () => this.communication.deliver({
        senderIdentity: input.sender.identity,
        senderDisplayName: input.sender.displayName,
        receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
        receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
        content: input.content,
        messageType: input.messageType,
        referenceFiles: input.referenceFiles,
      }));
    });
  }

  delegateTask(context: TaskDelegationContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      return delegateToResolvedTarget(() => this.resolveDelegationPlacement(input.recipient_address), (placement) => {
        if (placement.kind === "agent" && placement.address === context.identity.memberAddress) {
          throw new Error("An Agent cannot delegate a task to its own logical placement.");
        }
        return this.taskExecutions.delegate(context, input, placement);
      });
    });
  }

  async commitAgentPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.assertAdmitting();
          const tree = change.kind === "adopt_or_retain"
            ? adoptAgentOrgPlatformBinding({ tree: this.tree, binding: change.binding }).tree
            : replaceAgentOrgPlatformBindingWithoutConversation({ tree: this.tree, replacement: change.replacement });
          return {
            nextTree: tree,
            cancelBeforeDurability: () => undefined,
            commitAfterDurability: () => {
              this.tree = tree;
              this.index = new AgentOrgExecutionIndex(this.tree);
            },
          };
        },
      });
    });
  }

  onAgentExecutionEvent(identity: CollaborationMemberExecutionIdentity, event: CollaborationAgentExecutionEvent): void {
    if (!sameRootExecutionIdentity(identity.root, this.options.root)) throw new Error("AgentOrg event belongs to another root.");
    if (this.eventRetirement.isCommittedTeardownStatus(identity, event)) return;
    const adapted = this.presentation.adapt(identity, event);
    if (adapted.kind === "rejected") {
      this.enterFailStop();
      throw new Error(adapted.message);
    }
    if (adapted.kind === "publish") {
      this.options.publisher.publish({ kind: "agent_presentation", execution: identity, message: adapted.message });
    }
    if (event.kind === "status_overlay") {
      this.taskExecutions.onAgentStatus(identity.agentRunId, event.snapshot.details.status);
    } else if (event.kind === "agent_run" && event.event.eventType === "AGENT_STATUS") {
      this.taskExecutions.onAgentStatus(identity.agentRunId, normalizeAgentApiStatus(event.event.payload.status));
    }
  }

  subscribeToEvents(listener: Parameters<RootEventPublisher<AgentOrgRunEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<AgentOrgRunPackageSnapshot, AgentOrgRunEvent>> {
    return this.options.publisher.openSnapshotConnection(() => Object.freeze({
      tree: this.tree,
      messages: this.messages,
      statuses: this.getAgentStatusSnapshots(),
    }));
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    this.lifecycle = "terminating";
    this.communication.closeAdmission();
    this.taskExecutions.closeExternalAdmission();
    void this.operationGate.closeAndDrain();
    // Shutdown of delegated children is runtime-only, so a fail-stopped attempt drains the same way.
    const attempt = this.terminateOnce();
    this.termination = attempt;
    // A failed or unaccepted attempt must not block a later Terminate or restore self-heal.
    void attempt.then((result) => {
      if (!result.accepted && this.termination === attempt) this.termination = null;
    }, () => {
      if (this.termination === attempt) this.termination = null;
    });
    return attempt;
  }

  private async terminateOnce(): Promise<AgentOperationResult> {
    const errors: string[] = [];
    await this.operationGate.closeAndDrain();
    this.frozenTerminationScope ??= createFrozenAgentOrgTerminationScope({
      agentHandles: this.options.rootAgents.freezeForRootTermination(),
      teamScopes: this.options.teams.freezeForRootTermination(),
    });
    const fenced = await this.frozenTerminationScope.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    // Live children are terminated by the frozen scope; shut-down children own no runtime.
    await this.taskExecutions.drain();
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
    if (!agent || !this.isLiveAgent(agentRunId)) return Promise.resolve({
      reserved: false,
      code: "AGENT_RUN_NOT_ACCEPTING_INPUT",
      message: `AgentRun '${agentRunId}' is not live in AgentOrg '${this.orgRunId}'.`,
    });
    return agent.host.hostKind === "root"
      ? this.options.rootAgents.reserveInput(agentRunId, message, options)
      : this.options.teams.require(agent.host.hostRunId).reserveDirectAgentInput(agentRunId, message, options);
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
      if (!agent) return Object.freeze({
        result: { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not in AgentOrg '${this.orgRunId}'.` },
        executionKind: null,
      });
      const execute = () => agent.host.hostKind === "root"
        ? this.options.rootAgents.executeCommand(agentRunId, command)
        : this.options.teams.require(agent.host.hostRunId).executeDirectAgentCommand(agentRunId, command);
      if (command.kind !== "post_message") {
        const result = this.isLiveAgent(agentRunId)
          ? await execute()
          : { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in AgentOrg '${this.orgRunId}'.` };
        return Object.freeze({ result, executionKind: agent.executionKind });
      }
      // Operator input wakes a shut-down child exactly like send_message_to.
      const result = await this.withLiveLease(agentRunId, execute);
      return Object.freeze({ result, executionKind: agent.executionKind });
    });
  }

  private async withLiveLease(
    agentRunId: string,
    operation: () => Promise<AgentOperationResult>,
  ): Promise<AgentOperationResult> {
    let lease: TaskExecutionLiveLease;
    try {
      lease = await this.taskExecutions.acquireLiveLease(agentRunId);
    } catch (error) {
      if (error instanceof TaskDelegationError) return { accepted: false, code: error.code, message: error.message };
      throw error;
    }
    try {
      return await operation();
    } finally {
      lease.release();
    }
  }

  /**
   * Runtime liveness (AR-005): the host is active and, for a delegated child Agent, its
   * AgentRun is active. Configured Agents keep host membership (they activate lazily).
   */
  private isLiveAgent(agentRunId: string): boolean {
    const agent = this.index.getAgent(agentRunId);
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
    return Boolean(agent && hostIsActive && agent.address === identity.memberAddress && this.isLiveAgent(identity.agentRunId)
      && sameCollaborationMemberExecutionIdentity(identity, this.identityFor(agent.agentRunId, agent.address)));
  }
  private replaceTree(tree: AgentOrgRunExecutionTreeSnapshot): void {
    this.tree = tree;
    this.index = new AgentOrgExecutionIndex(tree);
  }
  private isAdmitting(): boolean { return this.lifecycle === "active"; }
  private assertAdmitting(): void {
    if (!this.isAdmitting()) throw new Error(`AgentOrg '${this.orgRunId}' is not accepting commands.`);
  }
  private assertCorrelation(): void {
    if (this.options.root.rootSubjectKind !== "agent_org"
      || this.options.root.rootRunId !== this.tree.rootOrg.orgRunId
      || this.messages.orgRunId !== this.orgRunId) {
      throw new Error("AgentOrg aggregate authorities do not correlate to one exact root.");
    }
  }
  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.failStopped) return;
    this.failStopped = true;
    this.lifecycle = "fail_stop";
    this.options.persistence.enterRootFailStop();
    this.taskExecutions.enterRootFailStop();
    this.communication.closeAdmission();
    queueMicrotask(() => { void this.terminate(); });
  }
}
