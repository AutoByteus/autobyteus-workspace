<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
import { taskScopedMessageRecipient } from "../../agent-collaboration/collaborators/task-scoped-message-recipient.js";
import type { TaskExecutionLifetimePort, TaskExecutionReleaseOutcome } from "../../agent-collaboration/execution/task/task-execution-lifetime.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { collectAgentRootInputSnapshots } from "../services/agent-run-collaboration-input-snapshot.js";
import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
=======
import { collectStandaloneRootInputSnapshots } from "../services/standalone-root-input-snapshot.js";
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type {
  StandaloneHostTerminationResult,
  StandaloneRunPostInput,
  StandaloneRunPostResult,
} from "../../agent-execution/services/standalone-run-ports.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createCollaborationMemberExecutionIdentity,
  sameCollaborationMemberExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
import { TaskDelegationError, type DelegateTaskInput, type DelegateTaskResult, type TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { delegateToResolvedTarget } from "../../agent-collaboration/execution/task/task-delegation-target.js";
=======
import type { DelegateTaskInput, DelegateTaskResult, TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { ActiveRootMessageBoundary, ExactAgentMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootEventPublisher, RootSnapshotConnection } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import { createCollaborationAgentStatusSnapshot, type CollaborationAgentExecutionEvent, type CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import { createFrozenRootTerminationScope, type FrozenRootTerminationScope } from "../../agent-collaboration/execution/backends/frozen-root-termination-scope.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorAdmission, CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { RootOperationGate } from "../../agent-collaboration/execution/services/root-operation-gate.js";
import type { StandaloneRootMessagesFileV1, StandaloneRootTreeSnapshot } from "./standalone-root-tree.js";
import type { StandaloneRootEvent } from "./standalone-root-event.js";
import type { StandaloneHostAgentHandle } from "./standalone-host-agent-handle.js";
import { StandaloneRootExecutionIndex } from "../services/standalone-root-execution-index.js";
import { StandaloneRootCollaborators } from "../services/standalone-root-collaborators.js";
import { StandaloneRootCommunicationAdapter } from "../services/standalone-root-communication-adapter.js";
import type { StandaloneRootPersistenceCoordinator } from "../services/standalone-root-persistence-coordinator.js";
import { StandaloneRootRecipientResolver } from "../services/standalone-root-recipient-resolver.js";
import { StandaloneRootTaskExecutionAdapter, type StandaloneRootPlacement } from "../services/standalone-root-task-execution-adapter.js";
import { StandaloneRootMessageDelivery } from "../services/standalone-root-message-delivery.js";
import { adoptStandaloneRootPlatformBinding, replaceStandaloneRootPlatformBindingWithoutConversation } from "../services/standalone-root-tree-mutator.js";

export type StandaloneRootPackageSnapshot = Readonly<{
  tree: StandaloneRootTreeSnapshot;
  messages: StandaloneRootMessagesFileV1;
  statuses: readonly CollaborationAgentStatusSnapshot[];
  inputStates: readonly import("../../agent-collaboration/execution/domain/live-agent-input-snapshot.js").LiveAgentInputSnapshot[];
}>;

/**
 * The single owner of one collaboration-eligible standalone Agent run (root kind `agent`): its
 * host agent (through its handle), collaborators, task copies, messages, package and lifecycle.
 * It lives from first use until an explicit Stop, a history delete or archive, or server
 * shutdown; a host crash does not end it (the next use makes the host ready again).
 */
export class StandaloneAgentRunRoot implements ActiveRootMessageBoundary {
  private lifecycle: "activating" | "active" | "terminating" | "terminated" | "fail_stop" = "activating";
  private tree: StandaloneRootTreeSnapshot;
  private messages: StandaloneRootMessagesFileV1;
  private index: StandaloneRootExecutionIndex;
  private readonly taskExecutions: RootTaskExecutionLifecycle<StandaloneRootPlacement>;
  private readonly communication: RootCommunicationEngine;
  private readonly presentation: CollaborationAgentPresentationEventAdapter;
  private readonly operationGate: RootOperationGate;
  private readonly collaborators: StandaloneRootCollaborators;
  private readonly delivery: StandaloneRootMessageDelivery;
  private termination: Promise<AgentOperationResult> | null = null;
  private failStopped = false;
  private frozenTerminationScope: FrozenRootTerminationScope | null = null;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    tree: StandaloneRootTreeSnapshot;
    messages: StandaloneRootMessagesFileV1;
    host: StandaloneHostAgentHandle;
    rootLaunchConfiguration: AgentLaunchConfiguration;
    rootAgents: RootAgentExecutionRegistry;
    teams: RootTeamExecutionDirectory;
    callbacks: FlatTeamExecutionCallbacks;
    persistence: StandaloneRootPersistenceCoordinator;
    publisher: RootEventPublisher<StandaloneRootEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    lifetimePort?: TaskExecutionLifetimePort;
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
    this.index = new StandaloneRootExecutionIndex(this.tree);
    if (options.root.rootSubjectKind !== "agent" || options.root.rootRunId !== this.tree.host.agentRunId
      || this.messages.hostRunId !== this.tree.host.agentRunId || options.host.hostRunId !== this.tree.host.agentRunId) {
      throw new Error("Agent root authorities do not correlate to one exact host run.");
    }
    this.operationGate = new RootOperationGate({ rootLabel: `Agent root '${this.hostRunId}'`, canEnter: () => this.isAdmitting() });
    this.presentation = new CollaborationAgentPresentationEventAdapter((agentRunId) => {
      const agent = this.index.getAgent(agentRunId);
      return agent && agent.executionKind !== "host" ? this.identityFor(agent.agentRunId, agent.address) : null;
    });
    this.collaborators = new StandaloneRootCollaborators({
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
<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
    this.recipients = new AgentRunCollaborationRecipientResolver({ getIndex: () => this.index, collaborators: this.collaborators,
      taskScope: sender => taskScopedMessageRecipient({ sender, lifecycle: this.taskExecutions,
        resolvePlacement: address => this.recipients.resolveDelegationPlacement(sender, address),
        getAgent: id => this.index.requireAgent(id),
      }),
    });
    this.taskExecutions = new RootTaskExecutionLifecycle(new AgentRunCollaborationTaskExecutionAdapter({
=======
    this.taskExecutions = new RootTaskExecutionLifecycle(new StandaloneRootTaskExecutionAdapter({
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
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
<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
    }), { ...options.taskExecutionIdleShutdown, lifetimePort: options.lifetimePort });
    this.communication = new RootCommunicationEngine(new AgentRunCollaborationCommunicationAdapter({
=======
    }), options.taskExecutionIdleShutdown ?? {});
    this.delivery = new StandaloneRootMessageDelivery({
      hostRunId: this.hostRunId,
      root: options.root,
      getIndex: () => this.index,
      recipients: new StandaloneRootRecipientResolver({ getIndex: () => this.index, collaborators: this.collaborators }),
      collaborators: this.collaborators,
      taskExecutions: this.taskExecutions,
      getCommunication: () => this.communication,
      host: options.host,
      rootAgents: options.rootAgents,
      teams: options.teams,
      publisher: options.publisher,
      authorizeIdentity: (identity) => this.authorizeIdentity(identity),
    });
    this.communication = new RootCommunicationEngine(new StandaloneRootCommunicationAdapter({
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
      root: options.root,
      initial: options.messages,
      persistence: options.persistence,
      isOpen: () => this.isAdmitting(),
      assertDeliveryAllowed: (sender, receiver) => this.taskExecutions.assertMessageScope(sender.agentRunId, receiver.agentRunId),
      isCurrentAgent: (identity) => this.isCurrentAgent(identity),
      reserveRecipientInput: (agentRunId, message) => this.delivery.reserveAgentInput(agentRunId, message),
      replaceMessages: (messages) => { this.messages = messages; },
      publish: (message) => options.publisher.publish({ kind: "communication", message }),
      presentCommittedMessage: (message, receiverInput) => this.delivery.presentCommittedCommunication(message, receiverInput),
    }));
  }

  assertExecutionInputAllowed(agentRunId: string): void {
    this.assertAdmitting();
    this.taskExecutions.assertInputAllowed(agentRunId);
  }
  releaseTaskLifetime(id: string, executions: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionReleaseOutcome[]> {
    return this.taskExecutions.releaseTaskLifetime(id, executions);
  }

  get hostRunId(): string { return this.tree.host.agentRunId; }
  get hostAddress(): AgentTeamAddress { return this.tree.host.address; }
  get rootIdentity(): RootExecutionIdentity { return this.options.root; }
  isActive(): boolean { return this.lifecycle === "active"; }
  activate(): void {
    if (this.lifecycle !== "activating") throw new Error(`Agent root '${this.hostRunId}' is not activatable.`);
    this.lifecycle = "active";
  }
  getExecutionTreeSnapshot(): StandaloneRootTreeSnapshot { return this.tree; }
  getCommunicationSnapshot(): StandaloneRootMessagesFileV1 { return this.messages; }
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

  /** The host's real live state (the collaboration view's `isActive`). */
  isHostLive(): boolean { return this.options.host.readiness === "live"; }

  /** Makes the host ready (activated, restored, or the live run) with its root-built member context. */
  ensureHostReady(): Promise<AgentRun> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      return this.options.host.ensureReady();
    });
  }

  /**
   * A user message for the host: the host is made ready, `onActiveRunReady` runs (binding its
   * stream) before anything is admitted or posted, mentions are admitted, then the composed
   * message is posted with the caller's post options unchanged. A failed admission leaves the
   * host ready and posts nothing.
   */
  postHostUserMessage(input: Omit<StandaloneRunPostInput, "runId">): Promise<StandaloneRunPostResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      return this.delivery.postToHost(input);
    });
  }

  /** `@` for a child: ensures the mentioned collaborators in one gate; the caller composes the note. */
  admitCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      return this.delivery.admitMentions(input);
    });
  }

  /** `list_available_agents` (DS-001): read-only, so it takes no gate and never creates the package (AR-005). */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    return this.delivery.listAvailableAgents(sender);
  }

  collaboratorPort(): CollaboratorRootPort { return this.collaborators.port(); }

  delegateTask(context: TaskDelegationContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.operationGate.run(() => this.delivery.delegateTask(context, input));
  }

  /** `send_message_to(address)`; a first message to a catalog address brings it in under this gate. */
  deliverLogicalMessage(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
    return this.operationGate.run(() => this.taskExecutions.withLiveLease(sender.agentRunId, async () => {
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
    }));
  }

  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.taskExecutions.withLiveLease(input.sender.identity.agentRunId, async () => {
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
    }));
=======
    return this.operationGate.run(() => this.delivery.deliverToAddress(sender, input));
  }

  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.delivery.deliverToRunId(input));
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
  }

  /** Commands for children only; the host's commands come through its own Agent stream. */
  executeAgentCommand(agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
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
          ? this.taskExecutions.withLiveLease(agentRunId, execute, false)
          : { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in Agent root '${this.hostRunId}'.` };
      }
      // Operator input wakes a shut-down child exactly like send_message_to.
      return this.taskExecutions.withLiveLease(agentRunId, execute);
=======
      return this.delivery.executeChildCommand(agentRunId, command);
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
    });
  }

  async commitAgentPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.assertAdmitting();
          const tree = change.kind === "adopt_or_retain"
            ? adoptStandaloneRootPlatformBinding({ tree: this.tree, binding: change.binding }).tree
            : replaceStandaloneRootPlatformBindingWithoutConversation({ tree: this.tree, replacement: change.replacement });
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

  subscribeToEvents(listener: Parameters<RootEventPublisher<StandaloneRootEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<StandaloneRootPackageSnapshot, StandaloneRootEvent>> {
    return this.options.publisher.openSnapshotConnection(() => Object.freeze({
      tree: this.tree,
      messages: this.messages,
      statuses: this.getAgentStatusSnapshots(),
      inputStates: collectStandaloneRootInputSnapshots(this.index, [
        ...this.options.rootAgents.getInputStateSnapshots(),
        ...this.options.teams.list().flatMap(team => team.getInputStateSnapshots()),
      ]),
    }));
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  /** Explicit Stop, history delete or archive: every child ends first, then the host. Throws when the children cannot finish. */
  async stop(): Promise<StandaloneHostTerminationResult> {
    const children = await this.terminate();
    if (!children.accepted) throw new Error(children.message ?? `Agent root '${this.hostRunId}' did not finish stopping.`);
    return this.options.host.terminate();
  }

  /** Fences and shuts down every child, then unregisters (server shutdown and fail-stop end here; the host is untouched). */
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
    if (!local.accepted) return { accepted: false, code: "AGENT_ROOT_TERMINATION_FAILED",
      message: local.message ?? local.code ?? "Agent root termination failed." };
    this.lifecycle = "terminated";
    this.options.publisher.publish({ kind: "lifecycle", isActive: false });
    this.options.publisher.clear();
    this.options.onTerminated?.();
    return { accepted: true };
  }

<<<<<<< HEAD:autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts
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
    if (receiver.executionKind !== "host") return this.taskExecutions.withLiveLease(receiver.agentRunId, deliver);
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

=======
>>>>>>> origin/personal:autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts
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
      : this.delivery.isLiveChild(identity.agentRunId);
  }
  private identityFor(agentRunId: string, address: AgentTeamAddress): CollaborationMemberExecutionIdentity {
    return createCollaborationMemberExecutionIdentity({ root: this.options.root, memberAddress: address, agentRunId });
  }
  private replaceTree(tree: StandaloneRootTreeSnapshot): void {
    this.tree = tree;
    this.index = new StandaloneRootExecutionIndex(tree);
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
