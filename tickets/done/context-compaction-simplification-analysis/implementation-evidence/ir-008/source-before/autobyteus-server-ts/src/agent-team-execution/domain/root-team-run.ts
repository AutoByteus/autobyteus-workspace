import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import { TeamCommunicationService } from "../../services/team-communication/team-communication-service.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-v1-types.js";
import type {
  InterAgentMessageDeliveryIntent,
  InterAgentMessageParticipant,
} from "./inter-agent-message-delivery.js";
import { buildDeliveryEndpointForParticipant } from "./inter-agent-message-delivery.js";
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
import type { TeamRunConfig } from "./team-run-config.js";
import type { TeamRunEvent } from "./team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";
import type { AgentLaunchConfiguration } from "./team-run-config.js";
import type { TeamRun } from "./team-run.js";
import { TeamExecutionIndex, type TeamMessagePlacement } from "../services/team-execution-index.js";
import type { FlatTeamCollaboratorHost } from "../local/flat-team-execution-factory.js";
import type { ConfiguredMemberActivationMode } from "../local/flat-team-execution-context.js";
import type { TeamRunPersistenceCoordinator } from "../services/team-run-persistence-coordinator.js";
import { TeamRunResolver } from "../services/team-run-resolver.js";
import type { RootEventListener, RootSnapshotConnection } from "../services/team-run-event-publisher.js";
import { TeamRunEventPublisher } from "../services/team-run-event-publisher.js";
import { TeamRecipientResolver } from "../services/team-recipient-resolver.js";
import type { TeamDelegationPlacement } from "../services/resolved-team-recipient.js";
import { TeamRunCollaborators } from "../services/team-run-collaborators.js";
import { delegateToResolvedTarget } from "../../agent-collaboration/execution/task/task-delegation-target.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorMentionAdmission, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-mention-admission.js";
import {
  TaskDelegationError,
  type DelegateTaskInput,
  type DelegateTaskResult,
  type TaskDelegationContext,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionLiveLease } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { TeamTaskExecutionService } from "../task-delegation/team-task-execution-service.js";
import type { TaskExecutionIdentityCapabilities } from "../task-delegation/task-execution-identity-capabilities.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { TeamAgentPlatformBindingCommitter } from "../services/team-agent-platform-binding-committer.js";
import type { FrozenTeamRunTerminationScope } from "./frozen-team-run-termination-scope.js";
import { RootTeamRunMaterializationGate } from "./root-team-run-materialization-gate.js";

export type RootTeamRunPackageSnapshot = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
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
  private readonly recipientResolver = new TeamRecipientResolver();
  private readonly teamRunResolver: TeamRunResolver;
  private readonly taskExecutions: TeamTaskExecutionService;
  private readonly communication: TeamCommunicationService;
  private readonly platformBindings: TeamAgentPlatformBindingCommitter;
  private readonly materializationGate: RootTeamRunMaterializationGate;
  private readonly collaborators: TeamRunCollaborators;
  private readonly unsubscribeTaskExecutionEvents: () => void;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private failStopped = false;

  constructor(private readonly options: {
    rootRun: TeamRun;
    /** Hosts collaborators on the root TeamRun (AR-006). */
    collaboratorHost: FlatTeamCollaboratorHost;
    config: TeamRunConfig;
    tree: TeamRunExecutionTreeSnapshot;
    messages: TeamCommunicationMessagesSnapshot;
    persistence: TeamRunPersistenceCoordinator;
    publisher: TeamRunEventPublisher<TeamRunEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    memoryLocator?: RootedAgentMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorMentionAdmission;
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
    this.teamRunResolver = new TeamRunResolver({
      rootTeamRun: options.rootRun,
      getIndex: () => this.index,
    });
    this.taskExecutions = new TeamTaskExecutionService({
      rootTeamRunId: this.teamRunId,
      config: options.config,
      getTree: () => this.tree,
      getIndex: () => this.index,
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
    });
    this.communication = new TeamCommunicationService({
      rootTeamRunId: this.teamRunId,
      initial: options.messages,
      isCurrentAgent: (identity) => this.isCurrentAgent(identity),
      requireContainingTeamRun: (agentRunId) => this.requireContainingTeamRun(agentRunId),
      commit: (plan) => options.persistence.commitReservedMessageAppend(plan),
      publish: (event) => options.publisher.publish(event),
      replaceSnapshot: (messages) => this.replaceMessages(messages),
    });
    this.collaborators = new TeamRunCollaborators({
      rootTeamRunId: this.teamRunId,
      admission: options.collaboratorAdmission,
      identities: options.taskExecutionIdentity,
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      host: options.collaboratorHost,
      registerTeamRun: (run) => this.teamRunResolver.registerManaged(run),
      replaceTree: (tree) => this.replaceTree(tree),
      publish: (event) => options.publisher.publish(event),
    });
    this.platformBindings = new TeamAgentPlatformBindingCommitter({
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      replaceTree: (tree) => this.replaceTree(tree),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
    });
    this.unsubscribeTaskExecutionEvents = options.publisher.subscribe(({ event }) => {
      this.taskExecutions.onRootEvent(event);
    });
    this.assertRootCorrelation();
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
  /** Same-root membership for run-ID routing; a shut-down child is still a member. */
  hasAgentExecution(agentRunId: string): boolean { return this.index.getAgent(agentRunId.trim()) !== null; }
  getCommunicationSnapshot(): TeamCommunicationMessagesSnapshot { return this.messages; }

  commitAgentPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    return this.platformBindings.commit(change);
  }

  getAgentExecution(agentRunId: string): Readonly<{
    identity: CollaborationMemberExecutionIdentity;
    containingTeamRunId: string;
    ancestorTeamRunIds: readonly string[];
    launchConfiguration: AgentLaunchConfiguration | null;
  }> | null {
    const execution = this.index.getAgent(agentRunId.trim());
    if (!execution) return null;
    return Object.freeze({
      identity: createCollaborationMemberExecutionIdentity({
        root: createTeamRootExecutionIdentity(this.teamRunId),
        memberAddress: execution.address,
        agentRunId: execution.agentRunId,
      }),
      containingTeamRunId: execution.containingTeamRunId,
      ancestorTeamRunIds: this.index
        .getTeamRunPhysicalScope(execution.containingTeamRunId)
        .ancestorTeamRunIds,
      launchConfiguration: "launchConfiguration" in execution.source
        ? execution.source.launchConfiguration
        : null,
    });
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

  /** Message ingress: a configured Agent, then a collaborator (its coordinator) or a collaborator Team member. */
  resolveMessageRecipient(recipientAddress: string): TeamMessagePlacement {
    this.assertAdmitting();
    return this.recipientResolver.resolveMessageRecipient(this.index, recipientAddress);
  }

  /** Delegation target: a configured Agent, else a collaborator of this run. */
  resolveDelegationPlacement(recipientAddress: string): TeamDelegationPlacement {
    this.assertAdmitting();
    return this.recipientResolver.resolveDelegationPlacement(this.index, recipientAddress);
  }

  /** Admits mentions for the focused agent in one gate; the caller posts the returned content. */
  admitCollaboratorMentions(input: Parameters<TeamRunCollaborators["admit"]>[0]): Promise<RootCollaboratorAdmissionResult> {
    return this.materializationGate.run(async () => {
      this.assertAdmitting();
      return this.index.getAgent(input.focusedAgentRunId)
        ? this.collaborators.admit(input)
        : { admitted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${input.focusedAgentRunId}' is not in root '${this.teamRunId}'.` };
    });
  }

  collaboratorPort(): CollaboratorRootPort { return this.collaborators.port(); }

  /** Re-hosts the run's collaborators on restore (no runtime starts; the first message does). */
  restoreCollaborators(mode: ConfiguredMemberActivationMode): Promise<void> { return this.collaborators.restore(mode); }

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

  delegateTask(context: TaskDelegationContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.materializationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      return delegateToResolvedTarget(() => this.resolveDelegationPlacement(input.recipient_address), (placement) => {
        if (placement.kind === "agent" && placement.address === context.identity.memberAddress) {
          throw new CollaborationContractError(
            "COLLABORATION_SELF_TARGET_REJECTED",
            "An Agent cannot delegate a task to its own logical placement.",
          );
        }
        return this.taskExecutions.delegateTask(context, input, placement);
      });
    });
  }

  async deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => {
      if (intent.rootTeamRunId !== this.teamRunId) {
        return { accepted: false, code: "COLLABORATION_ROOT_MISMATCH", message: "Message root does not match the selected RootTeamRun." };
      }
      this.authorizeIdentity(intent.sender.participant.identity);
      const { receiver: target } = this.resolveMessageRecipient(intent.recipientAddress);
      if (!this.isLiveAgent(target.agentRunId)) {
        throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Collaboration recipient '${intent.recipientAddress}' has no live Agent ingress.`);
      }
      const receiver = createCollaborationMemberExecutionIdentity({
        root: createTeamRootExecutionIdentity(this.teamRunId), memberAddress: target.address, agentRunId: target.agentRunId,
      });
      return this.communication.deliver({
        intent,
        receiverIdentity: receiver,
        receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
      });
    });
  }

  async deliverExactAgentMessage(input: {
    sender: InterAgentMessageParticipant;
    targetAgentRunId: string;
    content: string;
    messageType?: string | null;
    referenceFiles?: readonly string[] | null;
  }): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => {
      this.authorizeIdentity(input.sender.identity);
      const execution = this.index.getAgent(input.targetAgentRunId.trim());
      if (!execution) {
        return { accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND", message: `Exact AgentRun target '${input.targetAgentRunId}' is not in root '${this.teamRunId}'.` };
      }
      const receiver = createCollaborationMemberExecutionIdentity({
        root: createTeamRootExecutionIdentity(this.teamRunId),
        memberAddress: execution.address,
        agentRunId: execution.agentRunId,
      });
      return this.withLiveLease(execution.agentRunId, () => this.communication.deliver({
        intent: {
          rootTeamRunId: this.teamRunId,
          sender: buildDeliveryEndpointForParticipant(input.sender),
          recipientAddress: execution.address,
          content: input.content,
          messageType: input.messageType,
          referenceFiles: input.referenceFiles ? [...input.referenceFiles] : null,
        },
        receiverIdentity: receiver,
        receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
      }));
    });
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
        const run = await this.requireContainingTeamRun(agentRunId);
        return run.executeDirectAgentCommand(agentRunId, command);
      }
      // Operator input wakes a shut-down child exactly like send_message_to.
      return this.withLiveLease(agentRunId, async () => {
        const run = await this.requireContainingTeamRun(agentRunId);
        return run.executeDirectAgentCommand(agentRunId, command);
      });
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

  subscribeToEvents(listener: RootEventListener<TeamRunEvent>): () => void {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<RootTeamRunPackageSnapshot, TeamRunEvent>> {
    this.assertAdmitting();
    return this.options.publisher.openSnapshotConnection(() =>
      this.options.persistence.readConsistent(() => ({
        tree: this.tree,
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

  terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    this.lifecycle = "terminating";
    this.taskExecutions.closeExternalAdmission();
    this.communication.closeAdmission();
    void this.materializationGate.closeAndDrain();
    const termination = this.runTermination();
    this.termination = termination;
    void termination.then((result) => {
      if (!result.accepted && this.termination === termination) this.termination = null;
    }, () => {
      if (this.termination === termination) this.termination = null;
    });
    return termination;
  }

  private async runTermination(): Promise<AgentOperationResult> {
    await this.materializationGate.closeAndDrain();
    this.teamRunResolver.closeRegistration();
    this.frozenTerminationScope ??= this.options.rootRun.freezeForRootTermination();
    const fenced = await this.frozenTerminationScope.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    // Live children are terminated by the frozen scope; shut-down children own no runtime.
    await this.taskExecutions.drain();
    await this.options.persistence.drain();
    const result = await this.frozenTerminationScope.finish();
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
   * registered. Configured members and collaborators are live with their TeamRun (lazy start).
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
    if (indexed.executionKind === "collaborator") return this.options.collaboratorHost.requireCollaboratorTeam(teamRunId);
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
