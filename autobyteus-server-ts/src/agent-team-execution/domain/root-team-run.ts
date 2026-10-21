import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import { mentionViewerOf } from "../../agent-collaboration/collaborators/mention-viewer.js";
import type { TaskExecutionResourcePort, TaskExecutionStopResult } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { TeamCommunicationService } from "../../services/team-communication/team-communication-service.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";
import type { InterAgentMessageDeliveryIntent } from "./inter-agent-message-delivery.js";
import {
  createTeamAgentStatusDetails,
  createTeamAgentStatusSnapshot,
  type TeamAgentStatusSnapshot,
} from "./team-agent-status.js";
import type { CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  createCollaborationMemberExecutionIdentity,
  createTeamRootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamMemberExecutionCommand } from "./team-member-execution-command.js";
import type { TeamRunEvent } from "./team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";
import type { TeamRun } from "./team-run.js";
import { TeamExecutionIndex } from "../services/team-execution-index.js";
import type { TeamRunPersistenceCoordinator } from "../services/team-run-persistence-coordinator.js";
import { TeamRunResolver } from "../services/team-run-resolver.js";
import type { RootEventListener, RootSnapshotConnection } from "../services/team-run-event-publisher.js";
import { TeamRunEventPublisher } from "../services/team-run-event-publisher.js";
import { TeamRunMessageDelivery, type ExactTeamAgentMessageInput } from "../services/team-run-message-delivery.js";
import { TeamRunCollaborators } from "../services/team-run-collaborators.js";
import { delegateToResolvedTarget } from "../../agent-collaboration/execution/task/task-delegation-target.js";
import { buildTaskWorkMessageInput } from "../../agent-collaboration/execution/task/task-execution-input.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorAdmission, CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import {
  type AssignToExistingCopyInput,
  type SpawnTaskInput,
  type TaskDelegationOutcome,
  type TaskDelegationContext,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { messageLogOwnerOf, REMOTE_RUN_LOG } from "../../run-history/store/task-agent-message-logs.js";
import { RemoteRunLinks, type RemoteInboundMessage, type RemoteInboundWorkPacket } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import { teamRunRemoteLinks } from "./team-run-remote-links.js";
import { RemoteTeamIdleShutdown } from "../services/remote-team-idle-shutdown.js";
import type { PreparedLocalExecutionTermination } from "../../agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import { RemoteDelegation } from "../../agent-collaboration/execution/remote/remote-delegation.js";
import { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { TeamTaskExecutionService } from "../task-delegation/team-task-execution-service.js";
import type { TaskExecutionIdentityCapabilities } from "../task-delegation/task-execution-identity-capabilities.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { TeamAgentPlatformBindingCommitter } from "../services/team-agent-platform-binding-committer.js";
import type { FrozenTeamRunTerminationScope } from "./frozen-team-run-termination-scope.js";
import { RootTeamRunMaterializationGate } from "./root-team-run-materialization-gate.js";
import type {
  DelegatedLaunchSelectionCommand,
  DelegatedLaunchUpdateResult,
  DelegatedStopResult,
} from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import type { DelegatedLaunchChange, DelegatedRunReference } from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import { createTeamDelegatedLaunchCommand } from "../services/team-run-delegated-launches.js";

export type RootTeamRunPackageSnapshot = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  /** Task executions of `tree` whose Task is DONE or CANCELLED (read at the same point as the tree). */
  closedTaskExecutions: readonly TaskExecutionReference[];
  messages: TeamCommunicationMessagesSnapshot;
  statuses: readonly TeamAgentStatusSnapshot[];
  inputStates: readonly import("../../agent-collaboration/execution/domain/live-agent-input-snapshot.js").LiveAgentInputSnapshot[];
}>;

export type TeamRunExecutionCheckpoint = Readonly<{
  rootTeamRunId: string;
  changeSequence: number;
  hasOpenExecutionWork: boolean;
}>;

type RootLifecycleState = "active" | "persistence_fail_stop" | "terminating" | "terminated";

/** The sole public operation boundary for one rooted Team execution. */
export class RootTeamRun {
  private lifecycle: RootLifecycleState = "active";
  private tree: TeamRunExecutionTreeSnapshot;
  private messages: TeamCommunicationMessagesSnapshot;
  private index: TeamExecutionIndex;
  private readonly teamRunResolver: TeamRunResolver;
  private readonly taskExecutions: TeamTaskExecutionService;
  private readonly communication: TeamCommunicationService;
  private readonly platformBindings: TeamAgentPlatformBindingCommitter;
  private readonly materializationGate: RootTeamRunMaterializationGate;
  private readonly collaborators: TeamRunCollaborators;
  private readonly delivery: TeamRunMessageDelivery;
  private readonly delegatedLaunches: DelegatedLaunchSelectionCommand;
  private readonly remoteLinks: RemoteRunLinks;
  private readonly remoteDelegation: RemoteDelegation;
  private readonly remoteIdle: RemoteTeamIdleShutdown | null; // DS-004: only on a Team run a peer started
  private readonly unsubscribeTaskExecutionEvents: () => void;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private failStopped = false;

  constructor(private readonly options: {
    rootRun: TeamRun;
    tree: TeamRunExecutionTreeSnapshot;
    messages: TeamCommunicationMessagesSnapshot;
    persistence: TeamRunPersistenceCoordinator;
    publisher: TeamRunEventPublisher<TeamRunEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    taskExecutionResources?: TaskExecutionResourcePort;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorAdmission;
    disposeRootSubjects?(): void;
    onTerminated?(): void;
  }) {
    if (!options.taskExecutionIdentity ||
        typeof options.taskExecutionIdentity.agentRuns?.allocateForAgentDefinition !== "function" ||
        typeof options.taskExecutionIdentity.taskTeams?.create !== "function") {
      throw new Error("RootTeamRun task execution identity capabilities are required.");
    }
    this.tree = options.tree;
    this.messages = options.messages;
    this.index = new TeamExecutionIndex(options.tree);
    this.materializationGate = new RootTeamRunMaterializationGate({
      rootTeamRunId: this.teamRunId,
      canEnter: () => this.isAdmitting(),
    });
    this.remoteLinks = new RemoteRunLinks(teamRunRemoteLinks(() => this.tree));
    const remoteDelegation = new RemoteDelegation({ root: createTeamRootExecutionIdentity(this.teamRunId) });
    this.remoteDelegation = remoteDelegation;
    this.teamRunResolver = new TeamRunResolver({
      rootTeamRun: options.rootRun,
      getIndex: () => this.index,
    });
    this.taskExecutions = new TeamTaskExecutionService({
      rootTeamRunId: this.teamRunId,
      getTree: () => this.tree,
      getIndex: () => this.index,
      remoteLinks: this.remoteLinks,
      remoteDelegation,
      isRootOpen: () => this.isAdmitting(),
      authorize: (identity) => this.authorizeCurrentIdentity(identity),
      requireTeamRun: (teamRunId) => this.requireTeamRun(teamRunId),
      teamRunResolver: this.teamRunResolver,
      commitTaskActivation: (command) => options.persistence.commitTaskActivation(command),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
      replaceTree: (tree) => this.replaceTree(tree),
      publish: (event) => options.publisher.publish(event),
      taskExecutionIdentity: options.taskExecutionIdentity,
      memoryLocator: options.memoryLocator,
      activityInspector: options.activityInspector,
      idleShutdown: options.taskExecutionIdleShutdown,
      taskExecutionResources: options.taskExecutionResources,
      onLiveLeaseReleased: () => this.remoteIdle?.arm(),
    });
    this.communication = new TeamCommunicationService({
      rootTeamRunId: this.teamRunId,
      initial: options.messages,
      assertDeliveryAllowed: (sender, receiver) => this.taskExecutions.assertMessageScope(sender, receiver),
      isCurrentAgent: (identity) => this.isCurrentAgent(identity),
      messageLogOwnerOf: (agentRunId) => this.remoteLinks.has(agentRunId) ? REMOTE_RUN_LOG
        : messageLogOwnerOf(agentRunId, this.index.getMemoryPlacementForAgent(agentRunId)),
      requireContainingTeamRun: (agentRunId) => this.requireContainingTeamRun(agentRunId),
      commit: (plan) => options.persistence.commitReservedMessageAppend(plan),
      publish: (event) => options.publisher.publish(event),
      replaceSnapshot: (messages) => this.replaceMessages(messages),
    });
    this.collaborators = new TeamRunCollaborators({
      admission: options.collaboratorAdmission,
      getTree: () => this.tree,
    });
    this.delivery = new TeamRunMessageDelivery({
      rootTeamRunId: this.teamRunId,
      getIndex: () => this.index,
      collaborators: this.collaborators,
      communication: this.communication,
      authorizeIdentity: (identity) => this.authorizeIdentity(identity),
      isLiveAgent: (agentRunId) => this.isLiveAgent(agentRunId),
      withLiveLease: (agentRunId, operation) => this.taskExecutions.withLiveLease(agentRunId, operation),
      remoteLinks: this.remoteLinks,
      remoteSend: new RemoteMessageSend({ engine: () => this.communication.remoteSendEngine(), links: this.remoteLinks }),
    });
    this.platformBindings = new TeamAgentPlatformBindingCommitter({
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      replaceTree: (tree) => this.replaceTree(tree),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
    });
    this.delegatedLaunches = createTeamDelegatedLaunchCommand({
      taskExecutions: this.taskExecutions,
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      replaceTree: (tree) => this.replaceTree(tree),
      publish: (event) => options.publisher.publish(event),
    });
    this.remoteIdle = this.tree.delegatedFrom ? new RemoteTeamIdleShutdown({ teamRunId: this.teamRunId,
      shutDownIfQuiet: () => this.shutDownIfQuiet(), ...options.taskExecutionIdleShutdown }) : null;
    this.unsubscribeTaskExecutionEvents = options.publisher.subscribe(({ event }) => {
      this.taskExecutions.onRootEvent(event);
      this.remoteIdle?.onRootEvent(event);
    });
    this.assertRootCorrelation();
  }

  assertExecutionInputAllowed(agentRunId: string): void {
    this.assertAdmitting();
    this.taskExecutions.assertInputAllowed(agentRunId);
  }
  releaseTaskExecutions(executions: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionStopResult[]> {
    return this.taskExecutions.releaseTaskExecutions(executions);
  }
  /** A task execution's own live status for the Task side (`offline` once this root stops admitting). */
  taskExecutionStatus(execution: TaskExecutionReference): AgentExecutionStatus {
    return this.taskExecutions.taskExecutionStatus(execution);
  }

  /** DS-002: the user's Stop of one delegated copy and the copies it started. */
  stopDelegatedExecution(target: DelegatedRunReference): Promise<DelegatedStopResult> {
    return this.materializationGate.run(() => this.delegatedLaunches.stop(target));
  }
  /** DS-001: the user's model choice for stopped delegated copies of this live run. */
  updateDelegatedLaunchSelections(
    changes: readonly DelegatedLaunchChange[],
    validator: RunModelSelectionValidator,
  ): Promise<DelegatedLaunchUpdateResult> {
    return this.materializationGate.run(() => this.delegatedLaunches.update(changes, validator));
  }

  get teamRunId(): string { return this.tree.rootTeam.teamRunId; }
  isActive(): boolean { return this.lifecycle === "active" && this.options.rootRun.isActive(); }
  /** Running work only: delegated children count only while initializing or running. */
  hasOpenExecutionWork(): boolean {
    return this.options.rootRun.hasOpenExecutionWork();
  }
  getExecutionCheckpoint(): TeamRunExecutionCheckpoint {
    return Object.freeze({
      rootTeamRunId: this.teamRunId,
      changeSequence: this.options.publisher.getCurrentChangeSequence(),
      hasOpenExecutionWork: this.hasOpenExecutionWork(),
    });
  }
  /** Live leaves plus `offline` for every tree agent without a live execution (shut-down children). */
  getLeafAgentStatusSnapshots(): readonly TeamAgentStatusSnapshot[] {
    const live = this.options.rootRun.getLeafAgentStatusSnapshots();
    const reported = new Set(live.map((snapshot) => snapshot.execution.agentRunId));
    const root = createTeamRootExecutionIdentity(this.teamRunId);
    const dormant = this.index.listAgentExecutions()
      .filter((agent) => !reported.has(agent.agentRunId))
      .map((agent) => createTeamAgentStatusSnapshot({
        execution: createCollaborationMemberExecutionIdentity({ root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
        details: createTeamAgentStatusDetails({ status: "offline" }),
      }));
    return Object.freeze([...live, ...dormant]);
  }
  getExecutionTreeSnapshot(): TeamRunExecutionTreeSnapshot { return this.tree; }
  /** Same-root membership for run-ID routing: every agent of the Team (and its copies) and every remote endpoint. */
  hasAgentExecution(agentRunId: string): boolean {
    return this.index.getAgent(agentRunId.trim()) !== null || this.remoteLinks.has(agentRunId.trim());
  }
  getCommunicationSnapshot(): TeamCommunicationMessagesSnapshot { return this.messages; }

  commitAgentPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    return this.platformBindings.commit(change);
  }

  getCoordinatorAgentRunId(teamRunId: string = this.teamRunId): string {
    this.index.requireTeam(teamRunId);
    const coordinatorAddress = this.teamRunResolver.getManaged(teamRunId)?.context.teamNode.coordinatorAddress
      ?? (teamRunId === this.teamRunId ? this.tree.rootTeam.coordinatorAddress : null);
    if (!coordinatorAddress) throw new Error(`TeamRun '${teamRunId}' has no active coordinator address.`);
    const coordinator = this.index.listDirectAgentExecutions(teamRunId)
      .find((agent) => agent.address === coordinatorAddress);
    if (!coordinator) throw new Error(`TeamRun '${teamRunId}' has no concrete coordinator AgentRun.`);
    return coordinator.agentRunId;
  }

  postMessage(message: AgentInputUserMessage, agentRunId: string | null = null): Promise<AgentOperationResult> {
    const targetAgentRunId = agentRunId?.trim() || this.getCoordinatorAgentRunId();
    return this.executeAgentCommand(targetAgentRunId, { kind: "post_message", message });
  }

  /** `@`: resolves the mentioned definitions for the focused agent in one gate (adds nothing); the caller composes the note. */
  resolveCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.materializationGate.run(async () => {
      this.assertAdmitting();
      return this.index.getAgent(input.focusedAgentRunId)
        ? this.collaborators.resolveMentions(input.mentions, mentionViewerOf(this.index, input.focusedAgentRunId))
        : { admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in root '${this.teamRunId}'.` };
    });
  }

  /** `list_available_agents` (DS-001): read-only, so it takes no gate. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> {
    return this.delivery.listAvailableAgents(sender);
  }

  collaboratorPort(): CollaboratorRootPort { return this.collaborators.port(); }

  authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void {
    this.assertAdmitting();
    this.authorizeCurrentIdentity(identity);
  }

  private authorizeCurrentIdentity(identity: CollaborationMemberExecutionIdentity): void {
    if (!this.isCurrentAgent(identity)) {
      throw new CollaborationContractError(
        "COLLABORATION_CONTEXT_REQUIRED",
        `AgentRun '${identity.agentRunId}' is not a live execution at '${identity.memberAddress}' in root '${this.teamRunId}'.`,
      );
    }
  }

  delegateToNewCopy(context: TaskDelegationContext, input: SpawnTaskInput): Promise<TaskDelegationOutcome> {
    return this.materializationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      if (input.node !== undefined) {
        return this.remoteDelegation.delegate({ ...input, node: input.node }, (local, placement) => this.taskExecutions.delegateToNewCopy(context, local, placement));
      }
      return delegateToResolvedTarget(() => this.delivery.resolveDelegationPlacement(context.identity, input.recipient_address), (placement) =>
        this.taskExecutions.delegateToNewCopy(context, input, placement));
    });
  }

  /** `delegate_task` with a copy's own ID: its new Task's work is delivered by this root's exact delivery. */
  assignToExistingCopy(context: TaskDelegationContext, input: AssignToExistingCopyInput): Promise<TaskDelegationOutcome> {
    return this.materializationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      return this.taskExecutions.assignToExistingCopy(context, input, (targetAgentRunId, content, referenceFiles) =>
        this.delivery.deliverToRunId(buildTaskWorkMessageInput(context.identity, targetAgentRunId, content, referenceFiles)));
    });
  }
  /** The coordinator agent run of this root's Team copy with that team run ID (`send_message_to` guidance); null otherwise. */
  teamCoordinatorOf(teamRunId: string): string | null { return this.taskExecutions.teamCoordinatorOf(teamRunId); }

  /** `send_message_to(address)`: delivers to a standing instance; never creates a run. */
  deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    return this.materializationGate.run(() => this.taskExecutions.withLiveLease(intent.sender.participant.identity.agentRunId, () => this.delivery.deliverToAddress(intent)));
  }

  deliverExactAgentMessage(input: ExactTeamAgentMessageInput): Promise<AgentOperationResult> {
    return this.materializationGate.run(() => this.delivery.deliverExact(input, () => this.taskExecutions.deliverToExactTarget(
      input.sender.identity.agentRunId, input.targetAgentRunId, () => this.delivery.deliverToRunId(input))));
  }

  /** A message from a linked run on a peer node, admitted by its peer gateway (DS-003). */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptRemoteMessage(input); });
  }

  /** N-6 for a Team a peer started: the delegator's work packet starts the coordinator with the task notification. */
  acceptRemoteWorkPacket(input: RemoteInboundWorkPacket): Promise<AgentOperationResult> {
    return this.delivery.acceptRemoteWorkPacket(input, this.getCoordinatorAgentRunId(), (message, agentRunId) => this.postMessage(message, agentRunId));
  }

  async executeAgentCommand(
    agentRunId: string,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => {
      const execution = this.index.getAgent(agentRunId);
      if (!execution) {
        return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not in root '${this.teamRunId}'.` };
      }
      if (command.kind !== "post_message") {
        if (!this.isLiveAgent(agentRunId)) {
          return { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in root '${this.teamRunId}'.` };
        }
        return this.taskExecutions.withLiveLease(agentRunId, async () => {
          const run = await this.requireContainingTeamRun(agentRunId);
          this.taskExecutions.assertInputAllowed(agentRunId);
          return run.executeDirectAgentCommand(agentRunId, command);
        });
      }
      // Operator input wakes a shut-down child exactly like send_message_to.
      return this.taskExecutions.withLiveLease(agentRunId, async () => {
        const run = await this.requireContainingTeamRun(agentRunId);
        return run.executeDirectAgentCommand(agentRunId, command);
      });
    });
  }

  subscribeToEvents(listener: RootEventListener<TeamRunEvent>): () => void {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<RootTeamRunPackageSnapshot, TeamRunEvent>> {
    this.assertAdmitting();
    return this.options.publisher.openSnapshotConnection(() =>
      this.options.persistence.readConsistent(() => ({
        tree: this.tree,
        closedTaskExecutions: this.taskExecutions.closedTaskExecutions(),
        messages: this.messages,
        statuses: this.getLeafAgentStatusSnapshots(),
        inputStates: this.options.rootRun.getInputStateSnapshots(),
      })),
    );
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.failStopped) return;
    this.failStopped = true;
    this.lifecycle = "persistence_fail_stop";
    this.options.persistence.enterRootFailStop();
    this.taskExecutions.enterRootFailStop();
    this.communication.closeAdmission();
    queueMicrotask(() => {
      void this.terminate().catch((error) => {
        console.error(`RootTeamRun '${this.teamRunId}' fail-stop teardown failed:`, error);
      });
    });
  }

  /** DS-004 (peer-started Team): ends quietly, in the gate, when no child work, lease or member is busy (AR-301).
   * It never interrupts a member, and it ends as a Stop ends (the package is kept). */
  async shutDownIfQuiet(): Promise<boolean> {
    if (this.termination || !this.isAdmitting()) return false;
    const quiet = await this.materializationGate.run(async () => {
      if (this.hasOpenExecutionWork() || this.taskExecutions.hasLiveLeases()) return null;
      const prepared = await this.options.rootRun.tryPrepareTerminationIfQuiescent();
      if (prepared) this.lifecycle = "terminating";
      return prepared;
    });
    return quiet ? (await this.terminate(quiet)).accepted : false;
  }

  terminate(quiet: PreparedLocalExecutionTermination | null = null): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) { quiet?.cancel(); return this.termination; }
    this.remoteIdle?.dispose();
    this.lifecycle = "terminating";
    this.taskExecutions.closeExternalAdmission();
    this.communication.closeAdmission();
    void this.materializationGate.closeAndDrain();
    const termination = this.runTermination(quiet);
    this.termination = termination;
    void termination.then((result) => {
      if (!result.accepted && this.termination === termination) this.termination = null;
    }, () => {
      if (this.termination === termination) this.termination = null;
    });
    return termination;
  }

  private async runTermination(quiet: PreparedLocalExecutionTermination | null): Promise<AgentOperationResult> {
    await this.materializationGate.closeAndDrain();
    this.teamRunResolver.closeRegistration();
    // A quiet shutdown (DS-004) fences nothing: every member and child already prepared its quiescent termination.
    const committed = quiet?.commit() ?? null;
    if (!committed) this.frozenTerminationScope ??= this.options.rootRun.freezeForRootTermination();
    const fenced = committed ? { accepted: true } : await this.frozenTerminationScope!.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    // Live children are terminated by the frozen scope; shut-down children own no runtime.
    await this.taskExecutions.drain();
    await this.options.persistence.drain();
    const result = committed ? await committed.finish() : await this.frozenTerminationScope!.finish();
    if (!result.accepted) return result;
    this.teamRunResolver.clear();
    this.unsubscribeTaskExecutionEvents();
    this.options.disposeRootSubjects?.();
    this.options.publisher.clear();
    this.lifecycle = "terminated";
    this.options.onTerminated?.();
    return { accepted: true };
  }

  private isAdmitting(): boolean {
    return this.lifecycle === "active" && this.options.rootRun.isActive();
  }

  private assertAdmitting(): void {
    if (!this.isAdmitting()) throw new Error(`RootTeamRun '${this.teamRunId}' is not accepting operations.`);
  }

  private isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean {
    if (
      identity.root.rootSubjectKind !== "agent_team"
      || identity.root.rootRunId !== this.teamRunId
    ) return false;
    const execution = this.index.getAgent(identity.agentRunId);
    return !!execution && execution.address === identity.memberAddress && this.isLiveAgent(identity.agentRunId);
  }

  /**
   * Runtime liveness: the containing TeamRun is active and, for a task Agent, its handle is
   * registered. Configured members are live with their TeamRun (lazy start).
   */
  private isLiveAgent(agentRunId: string): boolean {
    const agent = this.index.getAgent(agentRunId);
    if (!agent) return false;
    const containing = this.teamRunResolver.getActive(agent.containingTeamRunId);
    if (!containing) return false;
    return agent.executionKind !== "task" || containing.hasLiveDirectTaskExecution({ agentRunId });
  }

  private async requireTeamRun(teamRunId: string): Promise<TeamRun> {
    const indexed = this.index.requireTeam(teamRunId);
    const active = this.teamRunResolver.getActive(teamRunId);
    if (active) return active;
    if (indexed.executionKind !== "configured") throw new Error(`Task TeamRun '${teamRunId}' is not active.`);
    return this.teamRunResolver.requireConfigured(teamRunId);
  }

  private async requireContainingTeamRun(agentRunId: string): Promise<TeamRun> {
    const execution = this.index.requireAgent(agentRunId);
    return this.requireTeamRun(execution.containingTeamRunId);
  }

  private replaceTree(tree: TeamRunExecutionTreeSnapshot): void {
    this.tree = tree;
    this.index = new TeamExecutionIndex(tree);
    this.assertRootCorrelation();
  }

  private replaceMessages(messages: TeamCommunicationMessagesSnapshot): void {
    this.messages = messages;
    this.assertRootCorrelation();
  }

  private assertRootCorrelation(): void {
    if (
      this.options.rootRun.teamRunId !== this.tree.rootTeam.teamRunId ||
      this.messages.rootTeamRunId !== this.tree.rootTeam.teamRunId
    ) throw new Error("RootTeamRun subject identities do not agree.");
  }
}
