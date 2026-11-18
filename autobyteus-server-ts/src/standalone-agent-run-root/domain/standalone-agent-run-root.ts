import type { RunMessagesFeed } from "../../agent-collaboration/delegation/run-messages-feed.js";
import { acceptWorkPacketIfAllowed } from "../../agent-collaboration/execution/task/task-delegation.js";
import type { ClosedTaskFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE, type TaskExecutionOwner, type RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { runOwnTaskOf } from "../../agent-collaboration/delegation/run-own-task.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { StandaloneHostTerminationResult, StandaloneRunPostInput, StandaloneRunPostResult } from "../../agent-execution/services/standalone-run-ports.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { DelegationSource } from "../../agent-collaboration/execution/task/member-task-capability.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import type { WorkPacket } from "../../agent-collaboration/execution/task/task-delegation.js";
import { RootCommunicationEngine, type RunSendInput } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { CrossRunAcceptInput } from "../../agent-collaboration/communication/cross-run-accept-input.js";
import type { ActiveRootMessageBoundary, ExactAgentMessageInput, PeerRunMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RunViewStream, RootSnapshotConnection } from "../../agent-collaboration/delegation/run-view-stream.js";
import { OWN_RUN_LOG, OTHER_RUN_LOG } from "../../run-history/store/message-log-owners.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorAdmission, CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { RootOperationGate } from "../../agent-collaboration/execution/services/root-operation-gate.js";
import type { StandaloneRootHost, StandaloneRootMessagesFile } from "./standalone-root-host.js";
import type { StandaloneRootEvent } from "./standalone-root-event.js";
import type { StandaloneHostAgentHandle } from "./standalone-host-agent-handle.js";
import { StandaloneRootIndex } from "../services/standalone-root-index.js";
import { StandaloneRootCollaborators } from "../services/standalone-root-collaborators.js";
import { createStandaloneRootCommunicationPort } from "../services/standalone-root-communication-port.js";
import type { StandaloneRootPersistenceCoordinator } from "../services/standalone-root-persistence-coordinator.js";
import { StandaloneRootRecipientResolver } from "../services/standalone-root-recipient-resolver.js";
import { StandaloneRootMessageDelivery } from "../services/standalone-root-message-delivery.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import { RemoteRunLinks, type RemoteInboundMessage, type RemoteInboundWorkPacket } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";
import { peerDelegatedFromOf, type DelegatedFrom } from "../../run-history/store/agent-run-metadata-types.js";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { DelegatedRunIdleShutdown } from "../services/delegated-run-idle-shutdown.js";
import { TaskWorkerStatusNotice } from "../../agent-collaboration/execution/task/task-worker-status-notice.js";

/** What a view of the run opens with: its own agent (the runs it delegated are its tree's rows, SR-084). */
export type StandaloneRootPackageSnapshot = Readonly<{
  host: StandaloneRootHost;
  /** When the run started (its view tree's `createdAt`). */
  createdAt: string;
}>;

/**
 * The single owner of one standalone Agent run (root kind `agent`, autobyteus-461): its one agent (through its
 * handle), its own message log, its gate, its peer endpoints and its own Stop. A run it delegates to is a run of its
 * own, related by its Task entry (contract P1, P2); nothing is hosted here. It lives from first use until a Stop, a
 * history delete or archive, or server shutdown; its agent's crash does not end it (the next use makes it ready).
 */
export class StandaloneAgentRunRoot implements ActiveRootMessageBoundary {
  private lifecycle: "activating" | "active" | "terminating" | "terminated" | "fail_stop" = "activating";
  private readonly index: StandaloneRootIndex;
  private readonly communication: RootCommunicationEngine;
  private readonly operationGate: RootOperationGate;
  private readonly collaborators: StandaloneRootCollaborators;
  private readonly delivery: StandaloneRootMessageDelivery;
  private readonly remoteLinks: RemoteRunLinks;
  /** autobyteus-278: the live facts of the runs this run delegated to other nodes (its stream viewers drive it). */
  private readonly delegatedIdle: DelegatedRunIdleShutdown | null;
  private readonly workerStatus: TaskWorkerStatusNotice | null;
  private readonly hostReadyListeners = new Set<(run: AgentRun) => void>();
  private termination: Promise<AgentOperationResult> | null = null;
  private inheritedLaunch: AgentLaunchConfiguration;

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    host: StandaloneRootHost;
    createdAt: string;
    messages: StandaloneRootMessagesFile;
    hostHandle: StandaloneHostAgentHandle;
    rootLaunchConfiguration: AgentLaunchConfiguration;
    persistence: StandaloneRootPersistenceCoordinator;
    publisher: RunViewStream<StandaloneRootEvent>;
    /** The node's message feed (SR-072): its committed messages into the views of its runs and the runs above them. */
    messageFeed: Pick<RunMessagesFeed, "publish">;
    taskRecords: RunTaskRecords;
    /** The relationships between runs (the Task entries): its peer children and its own Task (SR-047). */
    /** The relationships between runs: its peer children, its own Task, and its collaboration tree (step 2's reach, SR-060). */
    delegationIndex: Pick<DelegationIndex, "peerChildrenOf" | "currentTaskOf" | "collaborationTreeOf">;
    /** The closed-Task input fence, from the tree and the Task records (DS-15, SR-070). */
    closedTasks: Pick<ClosedTaskFence, "refusal">;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorAdmission;
    /** The run's own origin (a delegated run, from its Task entry's delegator; a run a peer started, its back-link). */
    delegatedFrom?: DelegatedFrom | null;
    remoteRunChannel?: () => RemoteRunChannel | null;
    agentRunManager?: Pick<AgentRunManager, "tryPrepareAgentRunTerminationIfQuiescent">;
    onTerminated?(): void;
  }>) {
    const { root, host } = options;
    if (root.rootSubjectKind !== "agent" || root.rootRunId !== host.agentRunId || options.messages.hostRunId !== host.agentRunId
      || options.hostHandle.hostRunId !== host.agentRunId) {
      throw new Error("Agent root authorities do not correlate to one exact run.");
    }
    this.inheritedLaunch = options.rootLaunchConfiguration;
    this.index = new StandaloneRootIndex(host);
    this.operationGate = new RootOperationGate({ rootLabel: `Agent root '${this.hostRunId}'`, canEnter: () => this.isAdmitting() });
    this.remoteLinks = new RemoteRunLinks({ peerRuns: () => peerRunLinksOf(root, options.delegationIndex),
      backLink: ((peer) => peer ? { pairedAgentRunIds: () => [this.hostRunId], delegatedFrom: peer } : null)(peerDelegatedFromOf({ delegatedFrom: options.delegatedFrom })), // AR-016
      channel: options.remoteRunChannel });
    // DS-7: a delegated run shuts down when quiet; its next message restores it.
    this.delegatedIdle = options.delegatedFrom && options.agentRunManager ? new DelegatedRunIdleShutdown({
      hostRunId: this.hostRunId, agentRunManager: options.agentRunManager,
      runInGate: (operation) => this.operationGate.run(operation), ...options.taskExecutionIdleShutdown,
    }) : null;
    this.workerStatus = options.delegatedFrom ? new TaskWorkerStatusNotice({ agentRunId: this.hostRunId }, options.taskRecords) : null;
    this.collaborators = new StandaloneRootCollaborators({ admission: options.collaboratorAdmission, inheritedLaunch: () => this.inheritedLaunch, host,
      reached: async () => [...(await options.delegationIndex.collaborationTreeOf(root).stepTwo())?.values() ?? []],
      reachedPlacementAt: (address) => options.delegationIndex.collaborationTreeOf(root).delegationPlacementAt(address) });
    this.delivery = new StandaloneRootMessageDelivery({
      hostRunId: this.hostRunId, root, getIndex: () => this.index,
      recipients: new StandaloneRootRecipientResolver({ getIndex: () => this.index, collaborators: this.collaborators }),
      collaborators: this.collaborators, getCommunication: () => this.communication, host: options.hostHandle,
      remoteLinks: this.remoteLinks, remoteSend: new RemoteMessageSend({ engine: () => this.communication, links: this.remoteLinks }),
      onHostReady: (run) => { this.delegatedIdle?.watch(run); this.workerStatus?.watch(run); this.hostReadyListeners.forEach((listener) => listener(run)); },
      authorizeIdentity: (identity) => this.authorizeIdentity(identity),
    });
    this.communication = new RootCommunicationEngine(createStandaloneRootCommunicationPort({
      root, initial: options.messages, persistence: options.persistence, isOpen: () => this.isAdmitting(),
      // AR-020: a message to or from a peer run whose Task entry is closed is refused (its node keeps the run).
      assertDeliveryAllowed: (sender, receiver) => this.assertPeerEntryOpen(this.index.isHost(sender) ? receiver : sender),
      isCurrentAgent: (identity) => this.isCurrentAgent(identity),
      // The run's own log; every other agent (another run, or a peer's) keeps its own.
      messageLogOwnerOf: (agentRunId) => this.index.isHost(agentRunId) ? OWN_RUN_LOG : OTHER_RUN_LOG,
      reserveRecipientInput: (agentRunId, message) => this.delivery.reserveAgentInput(agentRunId, message),
      messageFeed: options.messageFeed,
      presentCommittedMessage: (message) => this.delivery.presentCommittedCommunication(message),
    }));
  }

  get hostRunId(): string { return this.options.host.agentRunId; }
  get hostAddress(): AgentTeamAddress { return this.options.host.address; }
  get rootIdentity(): RootExecutionIdentity { return this.options.root; }
  isActive(): boolean { return this.lifecycle === "active"; }
  activate(): void {
    if (this.lifecycle !== "activating") throw new Error(`Agent root '${this.hostRunId}' is not activatable.`);
    this.lifecycle = "active";
  }
  getCommunicationSnapshot(): StandaloneRootMessagesFile {
    return Object.freeze({ schemaVersion: 1, subjectKind: "agent", hostRunId: this.hostRunId, messages: this.communication.getMessages() });
  }
  /** Run-ID membership: the run's own agent and its peer endpoints. */
  hasAgentExecution(agentRunId: string): boolean {
    const runId = agentRunId.trim();
    return this.index.isHost(runId) || this.remoteLinks.has(runId);
  }

  /** The run's agent's real live state (the view's `isActive`). */
  isHostLive(): boolean { return this.options.hostHandle.readiness === "live"; }
  /** The live agent, without making it ready. */
  activeHostRun(): AgentRun | null { return this.options.hostHandle.getActiveRun(); }
  /** autobyteus-278: each time the agent is made ready (one restored after idle shutdown is a new AgentRun). */
  onHostReady(listener: (run: AgentRun) => void): () => void {
    this.hostReadyListeners.add(listener);
    return () => { this.hostReadyListeners.delete(listener); };
  }
  /** Makes the run's agent ready (activated, restored, or the live run). */
  ensureHostReady(): Promise<AgentRun> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.readyHost(); });
  }
  /**
   * A user's (or a peer owner's) message for the run's agent. At the gate head, the closed-Task fence (DS-15): a closed
   * run, or a delegated one while Task data cannot be read (CR-461-051), is refused before it is made ready. Then ready;
   * mentions resolved, nothing added; then posted.
   */
  postHostUserMessage(input: Omit<StandaloneRunPostInput, "runId">): Promise<StandaloneRunPostResult> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      const refusal = this.options.closedTasks.refusal(this.options.root, Boolean(this.options.delegatedFrom));
      return refusal ? { kind: "refused", refusal } : this.delivery.postToHost(input);
    });
  }
  resolveCollaboratorMentions(input: Readonly<{ focusedAgentRunId: string; mentions: readonly CollaboratorMention[] }>): Promise<RootCollaboratorAdmissionResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.resolveMentions(input); });
  }
  /** `list_available_agents` (DS-001): read-only, so it takes no gate. */
  listAvailableAgents(sender: CollaborationMemberExecutionIdentity): Promise<readonly AvailableCollaborator[]> { return this.delivery.listAvailableAgents(sender); }
  collaboratorPortFor(viewerAgentRunId: string): CollaboratorRootPort { return this.collaborators.portFor(viewerAgentRunId); }

  /** What this run answers when its agent delegates, in its gate (SR-049); the delegation is the tool path's. */
  delegationSource(context: TaskDelegationContext): Promise<DelegationSource> {
    return this.operationGate.run(async () => {
      const own = this.delivery.delegationSource(context);
      return Object.freeze({ ...own,
        resolvePlacement: (address: string, work: Parameters<DelegationSource["resolvePlacement"]>[1], folder: string | null) =>
          this.operationGate.run(() => own.resolvePlacement(address, work, folder)),
      });
    });
  }
  /** The Task this run works on (`get_project_task`'s read scope): its own entries, by its own identity; else null. */
  ownedTaskOf(_context: TaskDelegationContext): TaskExecutionOwner | null {
    return runOwnTaskOf({ agentRunId: this.hostRunId }, this.options.delegationIndex);
  }

  /** `send_message_to(address)` in this run (contract §2.3). */
  deliverLogicalMessage(sender: CollaborationMemberExecutionIdentity, input: MemberLogicalMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.delivery.deliverToAddress(sender, input));
  }
  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.delivery.deliverExact(input));
  }
  /** autobyteus-492 DS-004: to an agent of a peer node by its run ID. */
  deliverToPeerRun(input: PeerRunMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.delivery.deliverToPeerRun(input));
  }
  /** A message from a linked run on a peer node, admitted by its peer gateway. */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptRemoteMessage(input); });
  }
  /** autobyteus-492 DS-004: a peer agent's message by run ID only, while this run's agent runs (never woken). */
  acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptPeerRunMessage(input); });
  }
  /** The work packet of a local delegation that created this run (DS-1): its first input, in the gate. */
  acceptWorkPacket(packet: WorkPacket): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return acceptWorkPacketIfAllowed(packet, () => this.delivery.acceptWorkPacket(packet)); });
  }
  /** DS-2: a message from another run of this node (the receiver's gate; this run's own log). */
  acceptFromRun(input: CrossRunAcceptInput): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptFromRun(input); });
  }
  prepareSendToRun(input: RunSendInput) { return this.communication.prepareSendToRun(input); }
  commitSentToRun(message: Parameters<RootCommunicationEngine["commitSentToRun"]>[0]) { return this.communication.commitSentToRun(message); }
  /** The work packet of the peer's delegation that started this run (N-6). */
  acceptRemoteWorkPacket(input: RemoteInboundWorkPacket): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptRemoteWorkPacket(input); });
  }

  /** The run's own agent presents on its own Agent stream; nothing else of this run presents here. */
  onAgentExecutionEvent(identity: CollaborationMemberExecutionIdentity): void {
    if (!sameRootExecutionIdentity(identity.root, this.options.root)) throw new Error("Agent-root event belongs to another root.");
  }
  subscribeToEvents(listener: Parameters<RunViewStream<StandaloneRootEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }
  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<StandaloneRootPackageSnapshot, StandaloneRootEvent>> {
    return this.openViewSnapshotConnection(() => undefined, (own) => own);
  }

  /**
   * The run's view snapshot (SR-063): in the view stream's snapshot connection, `atBase` runs in the same synchronous
   * step as the base (the view's tree, in memory); then `read` completes it with the root's own parts.
   */
  openViewSnapshotConnection<TAtBase, TSnapshot>(
    atBase: () => TAtBase,
    read: (own: StandaloneRootPackageSnapshot, atBase: TAtBase) => Promise<TSnapshot> | TSnapshot,
  ): Promise<RootSnapshotConnection<TSnapshot, StandaloneRootEvent>> {
    return this.options.publisher.openSnapshotConnection(() => {
      const rows = atBase();
      return read(Object.freeze({ host: this.options.host, createdAt: this.options.createdAt }), rows);
    });
  }

  /** The run's agent's saved launch changed (a stopped-run edit): runs delegated from now on inherit it. */
  setInheritedLaunch(launch: AgentLaunchConfiguration): void { this.inheritedLaunch = launch; }
  enterPersistenceFailStop(): void { this.enterFailStop(); }

  /** Stop, history delete or archive: this run's own agent only (DS-4, TC-1). */
  /**
   * A closed Task's stop (CR-461-001): `stillClosed` is asked right before the gate closes (`stop` closes it before its
   * first await), so a reopen committed while the stop waited keeps the run: `null`, nothing stopped.
   */
  stopForTaskClosure(stillClosed: () => boolean): Promise<StandaloneHostTerminationResult> | null {
    return stillClosed() ? this.stop() : null;
  }

  async stop(): Promise<StandaloneHostTerminationResult> {
    const ended = await this.terminate();
    if (!ended.accepted) throw new Error(ended.message ?? `Agent root '${this.hostRunId}' did not finish stopping.`);
    try { return await this.options.hostHandle.terminate(); } finally { this.workerStatus?.stopped(); }
  }

  /** Closes the gate and the log, then unregisters (server shutdown and fail-stop end here; the agent is untouched). */
  terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    this.lifecycle = "terminating";
    this.delegatedIdle?.dispose();
    this.communication.closeAdmission();
    this.termination = (async () => {
      await this.operationGate.closeAndDrain();
      await this.options.persistence.drain();
      this.lifecycle = "terminated";
      this.options.publisher.publish({ kind: "lifecycle", isActive: false });
      // The run's view stream outlives its root (SR-062): its views stay subscribed.
      this.options.onTerminated?.();
      return { accepted: true };
    })();
    return this.termination;
  }

  private assertPeerEntryOpen(agentRunId: string): void {
    const endpoint = this.remoteLinks.endpointFor(agentRunId);
    if (!endpoint || endpoint.kind === "delegator") return;
    const execution = endpoint.kind === "delegated_run" ? { agentRunId: endpoint.link.agentRunId } : { teamRunId: endpoint.link.teamRunId };
    if (!this.options.taskRecords.isOpen(execution)) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    }
  }
  private authorizeIdentity(identity: CollaborationMemberExecutionIdentity): void {
    this.assertAdmitting();
    if (!this.isCurrentAgent(identity)) {
      throw new Error(`AgentRun '${identity.agentRunId}' is not a live execution at '${identity.memberAddress}' in Agent root '${this.hostRunId}'.`);
    }
  }
  private isCurrentAgent(identity: CollaborationMemberExecutionIdentity): boolean {
    return sameRootExecutionIdentity(identity.root, this.options.root) && this.index.isHost(identity.agentRunId)
      && identity.memberAddress === this.hostAddress && Boolean(this.options.hostHandle.getActiveRun()?.isActive());
  }
  private isAdmitting(): boolean { return this.lifecycle === "active"; }
  private assertAdmitting(): void {
    if (!this.isAdmitting()) throw new Error(`Agent root '${this.hostRunId}' is not accepting commands.`);
  }
  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.lifecycle === "fail_stop") return;
    this.lifecycle = "fail_stop";
    this.options.persistence.enterRootFailStop();
    this.communication.closeAdmission();
    queueMicrotask(() => { void this.terminate(); });
  }
}
