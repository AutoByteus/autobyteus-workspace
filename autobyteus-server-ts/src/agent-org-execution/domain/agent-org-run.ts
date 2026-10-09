import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";
import type { TaskExecutionResourcePort, TaskExecutionStopResult } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { taskScopedMessageRecipient } from "../../agent-collaboration/collaborators/task-scoped-message-recipient.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { AgentOrgIndexedAgentExecution } from "../services/agent-org-execution-index.js";
import type { PreparedCollaboratorHandles } from "../../agent-collaboration/execution/backends/collaborator-handle-preparation.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createCollaborationMemberExecutionIdentity, sameCollaborationMemberExecutionIdentity, sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { RootTaskExecutionLifecycle } from "../../agent-collaboration/execution/task/root-task-execution-lifecycle.js";
import type { DelegateTaskInput, DelegateTaskResult, TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { RootedAgentMemoryLocator } from "../../agent-collaboration/execution/services/rooted-agent-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import { parseBackgroundTaskUpdatedPayload } from "../../agent-execution/domain/agent-background-task.js";
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
import { AgentOrgTaskEventRetirement } from "../services/agent-org-task-event-retirement.js";
import { AgentOrgRecipientResolver } from "../services/agent-org-recipient-resolver.js";
import { AgentOrgRunCollaborators } from "../services/agent-org-run-collaborators.js";
import { AgentOrgRunMessageDelivery } from "../services/agent-org-run-message-delivery.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorAdmission, CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { TaskExecutionIdentityCapabilities } from "../../agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { FlatTeamExecutionCallbacks } from "../../agent-team-execution/local/flat-team-execution-callbacks.js";
import type { RootSnapshotConnection } from "../../agent-collaboration/execution/services/root-event-publisher.js";
import type { CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { RootOperationGate } from "../../agent-collaboration/execution/services/root-operation-gate.js";
import {
  createFrozenRootTerminationScope,
  type FrozenRootTerminationScope,
} from "../../agent-collaboration/execution/backends/frozen-root-termination-scope.js";
import { projectAgentOrgAgentStatusSnapshots } from "../services/agent-org-agent-status-snapshot-projector.js";

export type AgentOrgRunPackageSnapshot = Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  /** Task executions of `tree` whose Task is DONE or CANCELLED (read at the same point as the tree). */
  closedTaskExecutions: readonly TaskExecutionReference[];
  messages: AgentOrgCommunicationMessagesFileV1;
  statuses: readonly CollaborationAgentStatusSnapshot[];
  inputStates: readonly import("../../agent-collaboration/execution/domain/live-agent-input-snapshot.js").LiveAgentInputSnapshot[];
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
  private readonly operationGate: RootOperationGate;
  private readonly delivery: AgentOrgRunMessageDelivery;
  private readonly collaborators: AgentOrgRunCollaborators;
  private readonly eventRetirement: AgentOrgTaskEventRetirement;
  private termination: Promise<AgentOperationResult> | null = null;
  /** Fail-stop origin outlives a failed termination attempt, so a retry keeps the fail-stop settlement. */
  private failStopped = false;
  private frozenTerminationScope: FrozenRootTerminationScope | null = null;

  constructor(private readonly options: import("./agent-org-run-options.js").AgentOrgRunOptions) {
    this.tree = options.tree;
    this.messages = options.messages;
    this.index = new AgentOrgExecutionIndex(this.tree);
    this.assertCorrelation();
    this.operationGate = new RootOperationGate({
      rootLabel: `AgentOrg '${this.orgRunId}'`,
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
      publishTaskExecutionsClosed: (taskExecutions) => options.publisher.publish({ kind: "task_executions_closed", taskExecutions }),
      publishTaskExecutionsReopened: (taskExecutions) => options.publisher.publish({ kind: "task_executions_reopened", taskExecutions }),
      publishAgentOffline: (identity) => this.onAgentExecutionEvent(identity, {
        kind: "status_overlay",
        snapshot: createCollaborationAgentStatusSnapshot({ execution: identity, status: "offline" }),
      }),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
      memoryLocator: options.memoryLocator,
      activityInspector: options.activityInspector,
    }), { ...options.taskExecutionIdleShutdown, taskExecutionResources: options.taskExecutionResources });
    this.collaborators = new AgentOrgRunCollaborators({
      admission: options.collaboratorAdmission,
      identities: options.taskExecutionIdentity,
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      prepareHandles: (entries) => options.prepareCollaboratorHandles(entries),
      replaceTree: (tree) => this.replaceTree(tree),
      publish: (event) => options.publisher.publish(event),
    });
    const recipients: AgentOrgRecipientResolver = new AgentOrgRecipientResolver({ getIndex: () => this.index, collaborators: this.collaborators,
      taskScope: sender => taskScopedMessageRecipient({ sender, lifecycle: this.taskExecutions,
        resolvePlacement: address => recipients.resolveDelegationPlacement(sender, address),
        getAgent: id => this.index.requireAgent(id),
      }),
    });
    this.delivery = new AgentOrgRunMessageDelivery({
      orgRunId: this.orgRunId,
      root: options.root,
      getIndex: () => this.index,
      recipients,
      collaborators: this.collaborators,
      taskExecutions: this.taskExecutions,
      getCommunication: () => this.communication,
      rootAgents: options.rootAgents,
      teams: options.teams,
      publisher: options.publisher,
      authorizeIdentity: (identity) => this.authorizeIdentity(identity),
    });
    this.communication = new RootCommunicationEngine(new AgentOrgCommunicationAdapter({
      root: options.root,
      initial: options.messages,
      persistence: options.persistence,
      isOpen: () => this.isAdmitting(),
      assertDeliveryAllowed: (sender, receiver) => this.taskExecutions.assertMessageScope(sender.agentRunId, receiver.agentRunId),
      isCurrentAgent: (identity) => this.isPublishedAgent(identity),
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
  releaseTaskExecutions(executions: readonly TaskExecutionReference[]): Promise<readonly TaskExecutionStopResult[]> {
    return this.taskExecutions.releaseTaskExecutions(executions);
  }
  /** A task execution's own live status for the Task side (`offline` once this root stops admitting). */
  taskExecutionStatus(execution: TaskExecutionReference): AgentExecutionStatus {
    return this.taskExecutions.taskExecutionStatus(execution);
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

  /** `@`: resolves the mentioned definitions for the focused agent in one gate (adds nothing); the caller composes the note. */
  resolveCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      return this.delivery.resolveMentions(input);
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
    if (!this.isCurrentAgent(identity)) throw new Error(`AgentRun '${identity.agentRunId}' is not a live execution at '${identity.memberAddress}' in AgentOrg '${this.orgRunId}'.`);
  }

  /** `send_message_to(address)`; a first message to a catalog address brings it in under this gate. */
  deliverLogicalMessage(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.taskExecutions.withLiveLease(sender.agentRunId, () => this.delivery.deliverToAddress(sender, input)));
  }

  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.taskExecutions.deliverToExactTarget(input.sender.identity.agentRunId, input.targetAgentRunId,
      () => this.delivery.deliverToRunId(input)));
  }

  delegateTask(context: TaskDelegationContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.operationGate.run(() => this.delivery.delegateTask(context, input));
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
    } else if (event.kind === "agent_run" && event.event.eventType === "BACKGROUND_TASK_UPDATED"
      && parseBackgroundTaskUpdatedPayload(event.event.payload).status !== "running") {
      this.taskExecutions.onAgentBackgroundTaskEnded(identity.agentRunId);
    }
  }

  subscribeToEvents(listener: Parameters<RootEventPublisher<AgentOrgRunEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<AgentOrgRunPackageSnapshot, AgentOrgRunEvent>> {
    return this.options.publisher.openSnapshotConnection(() => Object.freeze({
      tree: this.tree,
      closedTaskExecutions: this.taskExecutions.closedTaskExecutions(),
      messages: this.messages,
      statuses: this.getAgentStatusSnapshots(),
      inputStates: [...new Map([...this.options.rootAgents.getInputStateSnapshots(),
        ...this.options.teams.list().flatMap(team => team.getInputStateSnapshots())]
        .map(input => [input.agent_run_id, input])).values()],
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
    await this.operationGate.closeAndDrain();
    this.frozenTerminationScope ??= createFrozenRootTerminationScope({
      agentHandles: this.options.rootAgents.freezeForRootTermination(),
      teamScopes: this.options.teams.freezeForRootTermination(),
    });
    const fenced = await this.frozenTerminationScope.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    // Live children are terminated by the frozen scope; shut-down children own no runtime.
    await this.taskExecutions.drain();
    await this.options.persistence.drain();
    const local = await this.frozenTerminationScope.finish();
    if (!local.accepted) return { accepted: false, code: "AGENT_ORG_TERMINATION_FAILED",
      message: local.message ?? local.code ?? "AgentOrg local termination failed" };
    this.lifecycle = "terminated";
    this.options.publisher.publish({ kind: "lifecycle", isActive: false });
    this.options.publisher.clear();
    this.options.onTerminated?.();
    return { accepted: true };
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
      return this.delivery.executeAgentCommand(agentRunId, command);
    });
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
    return Boolean(agent && hostIsActive && agent.address === identity.memberAddress && this.delivery.isLiveAgent(identity.agentRunId)
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
