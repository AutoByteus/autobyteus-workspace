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
import type { TeamAgentStatusSnapshot } from "./team-agent-status.js";
import type { TeamMemberExecutionIdentity } from "./team-member-execution-identity.js";
import { createTeamMemberExecutionIdentity } from "./team-member-execution-identity.js";
import type { TeamMemberExecutionCommand } from "./team-member-execution-command.js";
import type { TeamRunConfig } from "./team-run-config.js";
import type { TeamRunEvent } from "./team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";
import type { AgentLaunchConfiguration } from "./team-run-config.js";
import type { TeamRun } from "./team-run.js";
import { TeamExecutionIndex } from "../services/team-execution-index.js";
import type { TeamRunPersistenceCoordinator } from "../services/team-run-persistence-coordinator.js";
import { TeamRunResolver } from "../services/team-run-resolver.js";
import type { RootEventListener, RootSnapshotConnection } from "../services/team-run-event-publisher.js";
import { TeamRunEventPublisher } from "../services/team-run-event-publisher.js";
import { TeamRecipientResolver } from "../services/team-recipient-resolver.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
  TaskDelegationContext,
} from "../task-delegation/task-delegation-record.js";
import type { TaskDelegationRecordsSnapshot } from "../task-delegation/task-delegation-record-v1.js";
import { TaskDelegationService } from "../task-delegation/task-delegation-service.js";
import type { TaskExecutionIdentityCapabilities } from "../task-delegation/task-execution-identity-capabilities.js";
import type { TeamAgentPlatformBinding } from "./team-agent-platform-binding.js";
import { TeamAgentPlatformBindingError } from "./team-agent-platform-binding.js";
import { adoptAgentPlatformBindingInTree } from "../services/team-run-execution-tree-mutator.js";
import type { FrozenTeamRunTerminationScope } from "./frozen-team-run-termination-scope.js";
import { RootTeamRunMaterializationGate } from "./root-team-run-materialization-gate.js";

export type RootTeamRunPackageSnapshot = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  tasks: TaskDelegationRecordsSnapshot;
  messages: TeamCommunicationMessagesSnapshot;
  statuses: readonly TeamAgentStatusSnapshot[];
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
  private tasks: TaskDelegationRecordsSnapshot;
  private messages: TeamCommunicationMessagesSnapshot;
  private index: TeamExecutionIndex;
  private readonly recipientResolver = new TeamRecipientResolver();
  private readonly teamRunResolver: TeamRunResolver;
  private readonly taskDelegation: TaskDelegationService;
  private readonly communication: TeamCommunicationService;
  private readonly materializationGate: RootTeamRunMaterializationGate;
  private readonly unsubscribeTaskSettlementEvents: () => void;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private failStopped = false;

  constructor(private readonly options: {
    rootRun: TeamRun;
    config: TeamRunConfig;
    tree: TeamRunExecutionTreeSnapshot;
    tasks: TaskDelegationRecordsSnapshot;
    messages: TeamCommunicationMessagesSnapshot;
    persistence: TeamRunPersistenceCoordinator;
    publisher: TeamRunEventPublisher<TeamRunEvent>;
    taskExecutionIdentity: TaskExecutionIdentityCapabilities;
    disposeRootSubjects?(): void;
    onTerminated?(): void;
  }) {
    if (!options.taskExecutionIdentity ||
        typeof options.taskExecutionIdentity.agentRuns?.allocateForAgentDefinition !== "function" ||
        typeof options.taskExecutionIdentity.taskTeams?.create !== "function") {
      throw new Error("RootTeamRun task execution identity capabilities are required.");
    }
    this.tree = options.tree;
    this.tasks = options.tasks;
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
    this.taskDelegation = new TaskDelegationService({
      rootTeamRunId: this.teamRunId,
      config: options.config,
      initialTasks: options.tasks,
      getTree: () => this.tree,
      getIndex: () => this.index,
      isRootOpen: () => this.isAdmitting(),
      authorize: (identity) => this.authorizeIdentity(identity),
      requireTeamRun: (teamRunId) => this.requireTeamRun(teamRunId),
      teamRunResolver: this.teamRunResolver,
      commitTaskMutation: (command) => options.persistence.commitTaskMutation(command),
      commitTaskSettlement: (command) => options.persistence.commitTaskSettlement(command),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
      replaceState: (state) => this.replaceTaskState(state),
      publish: (event) => options.publisher.publish(event),
      deliverSystemMessage: (agentRunId, message) => this.deliverSystemMessage(agentRunId, message),
      taskExecutionIdentity: options.taskExecutionIdentity,
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
    this.unsubscribeTaskSettlementEvents = options.publisher.subscribe(({ event }) => {
      this.taskDelegation.onRootEvent(event);
    });
    this.assertRootCorrelation();
  }

  get teamRunId(): string { return this.tree.rootTeam.teamRunId; }
  isActive(): boolean { return this.lifecycle === "active" && this.options.rootRun.isActive(); }
  hasOpenExecutionWork(): boolean {
    return this.taskDelegation.hasOpenWork() || this.options.rootRun.hasOpenExecutionWork();
  }
  getExecutionCheckpoint(): TeamRunExecutionCheckpoint {
    return Object.freeze({
      rootTeamRunId: this.teamRunId,
      changeSequence: this.options.publisher.getCurrentChangeSequence(),
      hasOpenExecutionWork: this.hasOpenExecutionWork(),
    });
  }
  getLeafAgentStatusSnapshots(): readonly TeamAgentStatusSnapshot[] {
    return this.options.rootRun.getLeafAgentStatusSnapshots();
  }
  getExecutionTreeSnapshot(): TeamRunExecutionTreeSnapshot { return this.tree; }
  getTaskRecordsSnapshot(): TaskDelegationRecordsSnapshot { return this.tasks; }
  getCommunicationSnapshot(): TeamCommunicationMessagesSnapshot { return this.messages; }

  async adoptAgentPlatformBinding(binding: TeamAgentPlatformBinding): Promise<void> {
    this.assertAdmitting();
    let liveCommitStarted = false;
    let result: Awaited<ReturnType<TeamRunPersistenceCoordinator["commitExecutionTreeMutation"]>>;
    try {
      result = await this.options.persistence.commitExecutionTreeMutation({
        prepareAgainstCurrent: () => {
          const mutation = adoptAgentPlatformBindingInTree({ tree: this.tree, binding });
          return {
            nextTree: mutation.tree,
            requiresWrite: mutation.outcome === "adopted",
            cancelBeforeDurability: () => undefined,
            commitAfterDurability: () => {
              liveCommitStarted = true;
              this.tree = mutation.tree;
              this.index = new TeamExecutionIndex(mutation.tree);
              this.assertRootCorrelation();
            },
          };
        },
      });
    } catch (error) {
      if (error instanceof TeamAgentPlatformBindingError) throw error;
      if (liveCommitStarted) {
        this.enterLifecycleFailStop();
        throw new TeamAgentPlatformBindingError(
          "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
          "The team provider binding committed durably but live finalization failed.",
          { cause: error, indeterminate: true },
        );
      }
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
        "The team provider binding did not commit.",
        { cause: error },
      );
    }
    if (result.outcome === "committed") return;
    if (result.outcome === "finalization_indeterminate") {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
        "The team provider binding commit is indeterminate.",
        { indeterminate: true },
      );
    }
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED",
      "The team provider binding did not commit.",
      { cause: result.cause },
    );
  }

  getAgentExecution(agentRunId: string): Readonly<{
    identity: TeamMemberExecutionIdentity;
    containingTeamRunId: string;
    ancestorTeamRunIds: readonly string[];
    launchConfiguration: AgentLaunchConfiguration | null;
  }> | null {
    const execution = this.index.getAgent(agentRunId.trim());
    if (!execution) return null;
    return Object.freeze({
      identity: createTeamMemberExecutionIdentity({
        rootTeamRunId: this.teamRunId,
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
    const team = this.index.requireTeam(teamRunId);
    const configuredPlacement = this.index.getConfiguredPlacement(team.address);
    const coordinatorAddress = "coordinatorAddress" in team.source
      ? team.source.coordinatorAddress
      : configuredPlacement && "teamRunId" in configuredPlacement
        ? configuredPlacement.coordinatorAddress
        : null;
    if (!coordinatorAddress) throw new Error(`TeamRun '${teamRunId}' has no configured coordinator address.`);
    const coordinator = this.index.listDirectAgentExecutions(teamRunId)
      .find((agent) => agent.address === coordinatorAddress);
    if (!coordinator) throw new Error(`TeamRun '${teamRunId}' has no concrete coordinator AgentRun.`);
    return coordinator.agentRunId;
  }

  postMessage(message: AgentInputUserMessage, agentRunId: string | null = null): Promise<AgentOperationResult> {
    const targetAgentRunId = agentRunId?.trim() || this.getCoordinatorAgentRunId();
    return this.executeAgentCommand(targetAgentRunId, { kind: "post_message", message });
  }

  resolveRecipient(recipientAddress: string): ResolvedTeamRecipient {
    this.assertAdmitting();
    return this.recipientResolver.resolve(this.index, recipientAddress);
  }

  authorizeIdentity(identity: TeamMemberExecutionIdentity): void {
    this.assertAdmitting();
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
      const placement = this.resolveRecipient(input.recipient_address);
      if (placement.kind === "agent" && placement.address === context.identity.memberAddress) {
        throw new CollaborationContractError(
          "COLLABORATION_SELF_TARGET_REJECTED",
          "An Agent cannot delegate a task to its own logical placement.",
        );
      }
      return this.taskDelegation.delegateTask(context, input, placement);
    });
  }

  submitTaskResult(context: TaskDelegationContext, input: SubmitTaskResultInput): Promise<SubmitTaskResultResult> {
    return this.materializationGate.run(() => this.taskDelegation.submitTaskResult(context, input));
  }

  reviewTaskResult(context: TaskDelegationContext, input: ReviewTaskResultInput): Promise<ReviewTaskResultResult> {
    return this.materializationGate.run(() => this.taskDelegation.reviewTaskResult(context, input));
  }

  async deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => {
      if (intent.rootTeamRunId !== this.teamRunId) {
        return { accepted: false, code: "COLLABORATION_ROOT_MISMATCH", message: "Message root does not match the selected RootTeamRun." };
      }
      this.authorizeIdentity(intent.sender.participant.identity);
      const placement = this.resolveRecipient(intent.recipientAddress);
      const receiver = this.resolveConfiguredRecipientIdentity(placement);
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
    referenceFiles?: string[] | null;
  }): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => {
      this.authorizeIdentity(input.sender.identity);
      const execution = this.index.getAgent(input.targetAgentRunId.trim());
      if (!execution || !this.index.isLiveAgent(execution.agentRunId)) {
        return { accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE", message: `Exact AgentRun target '${input.targetAgentRunId}' is not active in root '${this.teamRunId}'.` };
      }
      const receiver = createTeamMemberExecutionIdentity({
        rootTeamRunId: this.teamRunId,
        memberAddress: execution.address,
        agentRunId: execution.agentRunId,
      });
      return this.communication.deliver({
        intent: {
          rootTeamRunId: this.teamRunId,
          sender: buildDeliveryEndpointForParticipant(input.sender),
          recipientAddress: execution.address,
          content: input.content,
          messageType: input.messageType,
          referenceFiles: input.referenceFiles,
        },
        receiverIdentity: receiver,
        receiverDisplayName: getAgentTeamAddressBasename(receiver.memberAddress) ?? receiver.agentRunId,
      });
    });
  }

  async executeAgentCommand(
    agentRunId: string,
    command: TeamMemberExecutionCommand,
  ): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => {
      const execution = this.index.getAgent(agentRunId);
      if (!execution || !this.index.isLiveAgent(agentRunId)) {
        return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not active in root '${this.teamRunId}'.` };
      }
      const run = await this.requireContainingTeamRun(agentRunId);
      return run.executeDirectAgentCommand(agentRunId, command);
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
        tasks: this.tasks,
        messages: this.messages,
        statuses: Object.freeze([...this.options.rootRun.getLeafAgentStatusSnapshots()]),
      })),
    );
  }

  enterPersistenceFailStop(): void {
    this.enterFailStop();
  }

  enterLifecycleFailStop(): void {
    this.enterFailStop();
  }

  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.failStopped) return;
    this.failStopped = true;
    this.lifecycle = "persistence_fail_stop";
    this.options.persistence.enterRootFailStop();
    this.taskDelegation.enterRootFailStop();
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
    this.taskDelegation.closeExternalAdmission();
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
    await this.taskDelegation.drain();
    await this.options.persistence.drain();
    this.teamRunResolver.closeRegistration();
    this.frozenTerminationScope ??= this.options.rootRun.freezeForRootTermination();
    const interrupted = await this.frozenTerminationScope.interruptActiveTurns();
    if (!interrupted.accepted) return interrupted;
    await this.frozenTerminationScope.prepareMemberRuns();
    if (!this.failStopped) {
      try {
        await this.taskDelegation.shutdownAndSettle("Root TeamRun terminated.");
      } catch (error) {
        if (!this.failStopped) throw error;
      }
    }
    const result = await this.frozenTerminationScope.finish();
    if (!result.accepted) return result;
    this.teamRunResolver.clear();
    this.unsubscribeTaskSettlementEvents();
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

  private isCurrentAgent(identity: TeamMemberExecutionIdentity): boolean {
    if (identity.rootTeamRunId !== this.teamRunId) return false;
    const execution = this.index.getAgent(identity.agentRunId);
    return !!execution && execution.address === identity.memberAddress && this.index.isLiveAgent(identity.agentRunId);
  }

  private async requireTeamRun(teamRunId: string): Promise<TeamRun> {
    const indexed = this.index.requireTeam(teamRunId);
    const active = this.teamRunResolver.getActive(teamRunId);
    if (active) return active;
    if (indexed.executionKind !== "configured") {
      throw new Error(`Task TeamRun '${teamRunId}' is not active.`);
    }
    return this.teamRunResolver.requireConfigured(teamRunId);
  }

  private async requireContainingTeamRun(agentRunId: string): Promise<TeamRun> {
    const execution = this.index.requireAgent(agentRunId);
    return this.requireTeamRun(execution.containingTeamRunId);
  }

  private resolveConfiguredRecipientIdentity(placement: ResolvedTeamRecipient): TeamMemberExecutionIdentity {
    const targetAddress = placement.kind === "agent" ? placement.address : placement.coordinatorAddress;
    const target = this.index.getConfiguredPlacement(targetAddress);
    if (!target || !("agentRunId" in target) || !this.index.isLiveAgent(target.agentRunId)) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Collaboration recipient '${placement.address}' has no live configured Agent ingress.`,
      );
    }
    return createTeamMemberExecutionIdentity({
      rootTeamRunId: this.teamRunId,
      memberAddress: target.address,
      agentRunId: target.agentRunId,
    });
  }

  private async deliverSystemMessage(agentRunId: string, message: AgentInputUserMessage): Promise<AgentOperationResult> {
    const run = await this.requireContainingTeamRun(agentRunId);
    return run.postMessage(message, agentRunId);
  }

  private replaceTaskState(input: {
    tree?: TeamRunExecutionTreeSnapshot;
    tasks: TaskDelegationRecordsSnapshot;
  }): void {
    if (input.tree) {
      this.tree = input.tree;
      this.index = new TeamExecutionIndex(input.tree);
    }
    this.tasks = input.tasks;
    this.assertRootCorrelation();
  }

  private replaceMessages(messages: TeamCommunicationMessagesSnapshot): void {
    this.messages = messages;
    this.assertRootCorrelation();
  }

  private assertRootCorrelation(): void {
    if (
      this.options.rootRun.teamRunId !== this.tree.rootTeam.teamRunId ||
      this.tasks.rootTeamRunId !== this.tree.rootTeam.teamRunId ||
      this.messages.rootTeamRunId !== this.tree.rootTeam.teamRunId
    ) throw new Error("RootTeamRun subject identities do not agree.");
  }
}
