import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunInputReservationResult } from "../../agent-execution/input/agent-run-input-contract.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createCollaborationMemberExecutionIdentity,
  sameCollaborationMemberExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { RootTaskExecutionLifecycle, type TaskExecutionLiveLease } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import { TaskDelegationError, type DelegateTaskInput, type DelegateTaskResult, type TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { delegateToResolvedTarget } from "../../agent-collaboration/execution/task/task-delegation-target.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { ActiveRootMessageBoundary, ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher, RootSnapshotConnection } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createCollaborationAgentStatusSnapshot, type CollaborationAgentExecutionEvent, type CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { buildMemberInputPresentationEvent } from "../../agent-collaboration/execution/events/member-input-presentation-event-builder.js";
import { projectAgentPresentationMessage } from "../../agent-collaboration/execution/events/agent-presentation-message-projector.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { createFrozenRootTerminationScope, type FrozenRootTerminationScope } from "../../agent-collaboration/execution/backends/frozen-root-termination-scope.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorAdmission, CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { CollaborationCommunicationMessageV1 } from "../../agent-collaboration/execution/communication/collaboration-communication-message-v1.js";
import { buildDirectAgentRunInterAgentEvent } from "../../agent-communication/services/global-agent-run-message-runtime-builders.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { RootOperationGate } from "../../agent-collaboration/execution/services/root-operation-gate.js";
import type {
  AgentRunCollaborationMessagesFileV1,
  AgentRunCollaborationTreeSnapshot,
} from "./agent-run-collaboration-tree.js";
import type { AgentRunCollaborationRootEvent } from "./agent-run-collaboration-root-event.js";
import { AgentRunCollaborationExecutionIndex } from "../services/agent-run-collaboration-execution-index.js";
import { AgentRunCollaborationCollaborators } from "../services/agent-run-collaboration-collaborators.js";
import { AgentRunCollaborationCommunicationAdapter } from "../services/agent-run-collaboration-communication-adapter.js";
import type { AgentRunCollaborationPersistenceCoordinator } from "../services/agent-run-collaboration-persistence-coordinator.js";
import { AgentRunCollaborationRecipientResolver } from "../services/agent-run-collaboration-recipient-resolver.js";
import { AgentRunCollaborationTaskExecutionAdapter, type AgentRunCollaborationPlacement } from "../services/agent-run-collaboration-task-execution-adapter.js";
import { adoptAgentRunPlatformBinding, replaceAgentRunPlatformBindingWithoutConversation } from "../services/agent-run-collaboration-tree-mutator.js";

/**
 * The host run of an Agent root. The root never creates, restores or terminates it; waking a
 * host whose runtime is not active goes through the standalone lifecycle (DS-009).
 */
export type AgentRunCollaborationHostPort = Readonly<{
  getActiveRun(): AgentRun | null;
  resolveCommandReadyRun(): Promise<AgentRun>;
}>;

export type AgentRunCollaborationPackageSnapshot = Readonly<{
  tree: AgentRunCollaborationTreeSnapshot;
  messages: AgentRunCollaborationMessagesFileV1;
  statuses: readonly CollaborationAgentStatusSnapshot[];
}>;

/**
 * The collaboration root of one standalone Agent run (root kind `agent`). It owns the tree,
 * the communication log, the children registries and the operation gate; it does not own
 * the host run. It lives while the host run is managed and ends only on an explicit Stop or
 * server shutdown.
 */
export class AgentRunCollaborationRoot implements ActiveRootMessageBoundary {
  private lifecycle: "activating" | "active" | "terminating" | "terminated" | "fail_stop" = "activating";
  private tree: AgentRunCollaborationTreeSnapshot;
  private messages: AgentRunCollaborationMessagesFileV1;
  private index: AgentRunCollaborationExecutionIndex;
  private readonly taskExecutions: RootTaskExecutionLifecycle<AgentRunCollaborationPlacement>;
  private readonly communication: RootCommunicationEngine;
  private readonly presentation: CollaborationAgentPresentationEventAdapter;
  private readonly operationGate: RootOperationGate;
  private readonly recipients: AgentRunCollaborationRecipientResolver;
  private readonly collaborators: AgentRunCollaborationCollaborators;
  private termination: Promise<AgentOperationResult> | null = null;
  private failStopped = false;
  private frozenTerminationScope: FrozenRootTerminationScope | null = null;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    tree: AgentRunCollaborationTreeSnapshot;
    messages: AgentRunCollaborationMessagesFileV1;
    host: AgentRunCollaborationHostPort;
    rootLaunchConfiguration: AgentLaunchConfiguration;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: AgentRunCollaborationPersistenceCoordinator;
    publisher: RootEventPublisher<AgentRunCollaborationRootEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorAdmission;
    /** Prepares hosted handles for new collaborator entries (published after the tree write). */
    prepareCollaboratorHandles(entries: readonly CollaboratorEntry[]): Promise<PreparedCollaboratorHandles>;
    onTerminated?(): void;
  }>) {
    this.tree = options.tree;
    this.messages = options.messages;
    this.index = new AgentRunCollaborationExecutionIndex(this.tree);
    if (options.root.rootSubjectKind !== "agent" || options.root.rootRunId !== this.tree.host.agentRunId
      || this.messages.hostRunId !== this.tree.host.agentRunId) {
      throw new Error("Agent root authorities do not correlate to one exact host run.");
    }
    this.operationGate = new RootOperationGate({ rootLabel: `Agent root '${this.hostRunId}'`, canEnter: () => this.isAdmitting() });
    this.presentation = new CollaborationAgentPresentationEventAdapter((agentRunId) => {
      const agent = this.index.getAgent(agentRunId);
      return agent && agent.executionKind !== "host" ? this.identityFor(agent.agentRunId, agent.address) : null;
    });
    this.collaborators = new AgentRunCollaborationCollaborators({
      admission: options.collaboratorAdmission,
      rootLaunchConfiguration: options.rootLaunchConfiguration,
      identities: options.taskExecutionIdentity,
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      prepareHandles: (entries) => options.prepareCollaboratorHandles(entries),
      replaceTree: (tree) => this.replaceTree(tree),
      publish: (event) => options.publisher.publish(event),
    });
    this.recipients = new AgentRunCollaborationRecipientResolver({ getIndex: () => this.index, collaborators: this.collaborators });
    this.taskExecutions = new RootTaskExecutionLifecycle(new AgentRunCollaborationTaskExecutionAdapter({
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
    this.communication = new RootCommunicationEngine(new AgentRunCollaborationCommunicationAdapter({
      root: options.root,
      initial: options.messages,
      persistence: options.persistence,
      isOpen: () => this.isAdmitting(),
      isCurrentAgent: (identity) => this.isCurrentAgent(identity),
      reserveRecipientInput: (agentRunId, message) => this.reserveAgentInput(agentRunId, message),
      replaceMessages: (messages) => { this.messages = messages; },
      publish: (message) => options.publisher.publish({ kind: "communication", message }),
      presentCommittedMessage: (message, receiverInput) => this.presentCommittedCommunication(message, receiverInput),
    }));
  }

  get hostRunId(): string { return this.tree.host.agentRunId; }
  get hostAddress(): AgentTeamAddress { return this.tree.host.address; }
  get rootIdentity(): RootExecutionIdentity { return this.options.root; }
  isActive(): boolean { return this.lifecycle === "active"; }
  activate(): void {
    if (this.lifecycle !== "activating") throw new Error(`Agent root '${this.hostRunId}' is not activatable.`);
    this.lifecycle = "active";
  }
  getExecutionTreeSnapshot(): AgentRunCollaborationTreeSnapshot { return this.tree; }
  getCommunicationSnapshot(): AgentRunCollaborationMessagesFileV1 { return this.messages; }
  /** Children only: every child without a live execution reports `offline`. */
  getAgentStatusSnapshots(): readonly CollaborationAgentStatusSnapshot[] {
    // Root-level Teams: task Teams and collaborator Teams (each reports its members and nested children).
    const teamRunIds = [
      ...this.tree.taskExecutions.flatMap((task) => "teamRunId" in task ? [task.teamRunId] : []),
      ...this.tree.collaborators.flatMap((entry) => entry.kind === "agent_team" ? [entry.teamRunId] : []),
    ];
    const live = [
      ...this.options.rootAgents.getStatusSnapshots(),
      ...teamRunIds.flatMap((teamRunId) => this.options.teams.get(teamRunId)?.getLeafAgentStatusSnapshots() ?? []),
    ];
    const reported = new Set(live.map((snapshot) => snapshot.execution.agentRunId));
    const dormant = this.index.listChildAgents().filter((agent) => !reported.has(agent.agentRunId))
      .map((agent) => createCollaborationAgentStatusSnapshot({ execution: this.identityFor(agent.agentRunId, agent.address), status: "offline" }));
    return Object.freeze([...live, ...dormant]);
  }
  hasOpenExecutionWork(): boolean {
    return this.options.rootAgents.hasOpenExecutionWork() || this.options.teams.hasOpenExecutionWork();
  }
  /** Same-root membership for run-ID routing: the host and every child (shut-down children too). */
  hasAgentExecution(agentRunId: string): boolean { return this.index.getAgent(agentRunId.trim()) !== null; }

  /** `@`: ensures the mentioned collaborators for the focused agent in one gate; the caller composes the note. */
  admitCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      return this.index.getAgent(input.focusedAgentRunId)
        ? this.collaborators.ensure({ senderRunId: input.focusedAgentRunId, definitions: input.mentions })
        : { admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in Agent root '${this.hostRunId}'.` };
    });
  }

  /** `list_available_agents` (DS-001): read-only, so it takes no gate and never creates the package (AR-005). */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    this.authorizeIdentity(sender);
    return this.collaborators.listAvailable();
  }

  collaboratorPort(): CollaboratorRootPort { return this.collaborators.port(); }

  delegateTask(context: TaskDelegationContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      return delegateToResolvedTarget(
        () => this.recipients.resolveDelegationPlacement(context.identity, input.recipient_address),
        (placement) => this.taskExecutions.delegate(context, input, placement),
      );
    });
  }

  /** `send_message_to(address)`; a first message to a catalog address brings it in under this gate. */
  deliverLogicalMessage(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(sender);
      const resolution = await this.recipients.resolveMessageRecipient(sender, input.recipientAddress);
      if (!resolution.resolved) return { accepted: false, code: resolution.code, message: resolution.message };
      return this.deliverTo(resolution.placement.receiver.agentRunId, {
        senderIdentity: sender,
        senderDisplayName: getAgentTeamAddressBasename(sender.memberAddress) ?? sender.agentRunId,
        content: input.content,
        messageType: input.messageType,
        referenceFiles: input.referenceFiles,
      });
    });
  }

  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => {
      this.authorizeIdentity(input.sender.identity);
      if (!this.index.getAgent(input.targetAgentRunId)) {
        return { accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `AgentRun '${input.targetAgentRunId}' is not in this Agent run.` };
      }
      return this.deliverTo(input.targetAgentRunId, {
        senderIdentity: input.sender.identity,
        senderDisplayName: input.sender.displayName,
        content: input.content,
        messageType: input.messageType,
        referenceFiles: input.referenceFiles,
      });
    });
  }

  /** Commands for children only; the host keeps its own Agent stream. */
  executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      const agent = this.index.getAgent(agentRunId);
      if (!agent) return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not in Agent root '${this.hostRunId}'.` };
      if (agent.executionKind === "host") {
        return { accepted: false, code: "AGENT_ROOT_HOST_COMMAND_REJECTED", message: "Commands for the run's own agent go through its Agent stream." };
      }
      const execute = () => agent.host.hostKind === "root"
        ? this.options.rootAgents.executeCommand(agentRunId, command)
        : this.options.teams.require(agent.host.hostRunId).executeDirectAgentCommand(agentRunId, command);
      if (command.kind !== "post_message") {
        return this.isLiveChild(agentRunId)
          ? execute()
          : { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in Agent root '${this.hostRunId}'.` };
      }
      // Operator input wakes a shut-down child exactly like send_message_to.
      return this.withLiveLease(agentRunId, execute);
    });
  }

  async commitAgentPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.assertAdmitting();
          const tree = change.kind === "adopt_or_retain"
            ? adoptAgentRunPlatformBinding({ tree: this.tree, binding: change.binding }).tree
            : replaceAgentRunPlatformBindingWithoutConversation({ tree: this.tree, replacement: change.replacement });
          return { nextTree: tree, cancelBeforeDurability: () => undefined, commitAfterDurability: () => this.replaceTree(tree) };
        },
      });
    });
  }

  onAgentExecutionEvent(identity: CollaborationMemberExecutionIdentity, event: CollaborationAgentExecutionEvent): void {
    if (!sameRootExecutionIdentity(identity.root, this.options.root)) throw new Error("Agent-root event belongs to another root.");
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

  subscribeToEvents(listener: Parameters<RootEventPublisher<AgentRunCollaborationRootEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<AgentRunCollaborationPackageSnapshot, AgentRunCollaborationRootEvent>> {
    return this.options.publisher.openSnapshotConnection(() => Object.freeze({
      tree: this.tree,
      messages: this.messages,
      statuses: this.getAgentStatusSnapshots(),
    }));
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  /** Explicit Stop or server shutdown: fence and shut down every child, then unregister. */
  terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    this.lifecycle = "terminating";
    this.communication.closeAdmission();
    this.taskExecutions.closeExternalAdmission();
    void this.operationGate.closeAndDrain();
    const attempt = this.terminateOnce();
    this.termination = attempt;
    void attempt.then((result) => {
      if (!result.accepted && this.termination === attempt) this.termination = null;
    }, () => {
      if (this.termination === attempt) this.termination = null;
    });
    return attempt;
  }

  private async terminateOnce(): Promise<AgentOperationResult> {
    await this.operationGate.closeAndDrain();
    this.frozenTerminationScope ??= createFrozenRootTerminationScope({
      agentHandles: this.options.rootAgents.freezeForRootTermination(),
      teamScopes: this.options.teams.freezeForRootTermination(),
    });
    const fenced = await this.frozenTerminationScope.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    await this.taskExecutions.drain();
    await this.options.persistence.drain();
    const local = await this.frozenTerminationScope.finish();
    this.lifecycle = "terminated";
    this.options.publisher.publish({ kind: "lifecycle", isActive: false });
    this.options.publisher.clear();
    this.options.onTerminated?.();
    return local.accepted
      ? { accepted: true }
      : { accepted: false, code: "AGENT_ROOT_TERMINATION_FAILED", message: local.message ?? local.code ?? "Agent root termination failed." };
  }

  /** The host is woken through the standalone lifecycle; a child through its live lease. */
  private async deliverTo(
    targetAgentRunId: string,
    input: Readonly<{
      senderIdentity: CollaborationMemberExecutionIdentity;
      senderDisplayName: string;
      content: string;
      messageType?: string | null;
      referenceFiles?: readonly string[] | null;
    }>,
  ): Promise<AgentOperationResult> {
    const receiver = this.index.requireAgent(targetAgentRunId);
    const deliver = () => this.communication.deliver({
      ...input,
      receiverIdentity: this.identityFor(receiver.agentRunId, receiver.address),
      receiverDisplayName: getAgentTeamAddressBasename(receiver.address) ?? receiver.agentRunId,
    });
    if (receiver.executionKind !== "host") return this.withLiveLease(receiver.agentRunId, deliver);
    try {
      await this.options.host.resolveCommandReadyRun();
    } catch (error) {
      return { accepted: false, code: "AGENT_ROOT_HOST_UNAVAILABLE", message: error instanceof Error ? error.message : String(error) };
    }
    return deliver();
  }

  private async reserveAgentInput(agentRunId: string, message: AgentInputUserMessage): Promise<AgentRunInputReservationResult> {
    const agent = this.index.getAgent(agentRunId);
    if (agent?.executionKind === "host") {
      const run = this.options.host.getActiveRun();
      return run
        ? run.reserveUserMessage(message)
        : { reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `The run's own agent '${agentRunId}' is not active.` };
    }
    if (!agent || !this.isLiveChild(agentRunId)) {
      return { reserved: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: `AgentRun '${agentRunId}' is not live in Agent root '${this.hostRunId}'.` };
    }
    return agent.host.hostKind === "root"
      ? this.options.rootAgents.reserveInput(agentRunId, message)
      : this.options.teams.require(agent.host.hostRunId).reserveDirectAgentInput(agentRunId, message);
  }

  private presentCommittedCommunication(message: CollaborationCommunicationMessageV1, receiverInput: AgentInputUserMessage): void {
    const receiver = this.index.requireAgent(message.receiverAgentRunId);
    if (receiver.executionKind === "host") {
      // The host's conversation lives on its own Agent stream: show the delivery there.
      const sender = this.index.requireAgent(message.senderAgentRunId);
      void this.options.host.getActiveRun()?.publishEvent(buildDirectAgentRunInterAgentEvent({
        sender: { senderRunId: sender.agentRunId, senderName: getAgentTeamAddressBasename(sender.address) ?? sender.agentRunId, runtimeKind: null, memberExecutionContext: null },
        targetAgentRunId: receiver.agentRunId,
        content: message.content,
        messageType: message.messageType,
        referenceFiles: [...message.referenceFiles],
        createdAt: message.createdAt,
        messageId: message.messageId,
      })).catch((error: unknown) => console.error(`Agent root '${this.hostRunId}' host message presentation failed:`, error));
      return;
    }
    const identity = this.identityFor(receiver.agentRunId, receiver.address);
    const event = buildMemberInputPresentationEvent({ execution: identity, message: receiverInput, receivedAt: message.createdAt });
    this.options.publisher.publish({ kind: "agent_presentation", execution: identity, message: projectAgentPresentationMessage(event) });
  }

  private async withLiveLease(agentRunId: string, operation: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> {
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

  private isLiveChild(agentRunId: string): boolean {
    const agent = this.index.getAgent(agentRunId);
    if (!agent || agent.executionKind === "host") return false;
    if (agent.host.hostKind === "root") {
      // A collaborator Agent keeps its handle (it starts lazily); a task Agent is live while active.
      return agent.executionKind === "task" ? this.options.rootAgents.isTaskLive(agentRunId) : this.options.rootAgents.get(agentRunId) !== null;
    }
    const host = this.options.teams.get(agent.host.hostRunId);
    return Boolean(host && (agent.executionKind !== "task" || host.hasLiveDirectTaskExecution({ agentRunId })));
  }

  private authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void {
    this.assertAdmitting();
    this.authorizeCurrentIdentity(identity);
  }
  private authorizeCurrentIdentity(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.isCurrentAgent(identity)) {
      throw new Error(`AgentRun '${identity.agentRunId}' is not a live execution at '${identity.memberAddress}' in Agent root '${this.hostRunId}'.`);
    }
  }
  private isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean {
    if (!sameRootExecutionIdentity(identity.root, this.options.root)) return false;
    const agent = this.index.getAgent(identity.agentRunId);
    if (!agent || !sameCollaborationMemberExecutionIdentity(identity, this.identityFor(agent.agentRunId, agent.address))) return false;
    return agent.executionKind === "host"
      ? Boolean(this.options.host.getActiveRun()?.isActive())
      : this.isLiveChild(identity.agentRunId);
  }
  private identityFor(agentRunId: string, address: AgentTeamAddress): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root, memberAddress: address, agentRunId });
  }
  private replaceTree(tree: AgentRunCollaborationTreeSnapshot): void {
    this.tree = tree;
    this.index = new AgentRunCollaborationExecutionIndex(tree);
  }
  private isAdmitting(): boolean { return this.lifecycle === "active"; }
  private assertAdmitting(): void {
    if (!this.isAdmitting()) throw new Error(`Agent root '${this.hostRunId}' is not accepting commands.`);
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
