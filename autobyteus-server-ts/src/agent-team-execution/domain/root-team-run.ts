import type { RunMessagesFeed } from "../../agent-collaboration/delegation/run-messages-feed.js";
import type { RemoteRunChannelAccess } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { ClosedTaskFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { acceptWorkPacketIfAllowed } from "../../agent-collaboration/execution/task/task-delegation.js";
import { mentionViewerOf } from "../../agent-collaboration/collaborators/mention-viewer.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE, type RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { runOwnTaskOf } from "../../agent-collaboration/delegation/run-own-task.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import { createTeamCommunicationPort } from "../../services/team-communication/team-communication-port.js";
import type { TeamCommunicationMessagesSnapshot } from "../../services/team-communication/team-communication-messages-file.js";
import type { InterAgentMessageDeliveryIntent } from "./inter-agent-message-delivery.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "./team-agent-status.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity, type CollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamMemberExecutionCommand } from "./team-member-execution-command.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "./team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";
import type { TeamRunEnding } from "./team-run-lifecycle.js";
import type { TeamRun } from "./team-run.js";
import { TeamExecutionIndex } from "../services/team-execution-index.js";
import type { TeamRunPersistenceCoordinator } from "../services/team-run-persistence-coordinator.js";
import { TeamRunResolver } from "../services/team-run-resolver.js";
import type { RootEventListener, RootLivePosition, RootSnapshotConnection } from "../services/team-run-event-publisher.js";
import { TeamRunEventPublisher } from "../services/team-run-event-publisher.js";
import { TeamRunMessageDelivery, type ExactTeamAgentMessageInput } from "../services/team-run-message-delivery.js";
import { TeamRunCollaborators } from "../services/team-run-collaborators.js";
import { localPlacement } from "../../agent-collaboration/execution/task/task-delegation.js";
import type { DelegationSource } from "../../agent-collaboration/execution/task/member-task-capability.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorAdmission, CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import {
  TaskDelegationError,
  type TaskDelegationContext,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskExecutionIdleTimers } from "../../agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { OTHER_RUN_LOG, OWN_RUN_LOG } from "../../run-history/store/message-log-owners.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import { RemoteRunLinks, type RemoteInboundMessage, type RemoteInboundWorkPacket } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { PeerRunMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { teamRunRemoteLinks } from "./team-run-remote-links.js";
import { DelegatedTeamIdleShutdown } from "../services/delegated-team-idle-shutdown.js";
import type { PreparedLocalExecutionTermination } from "../../agent-collaboration/execution/domain/prepared-local-execution-termination.js";
import { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";
import type { AgentRunMemoryLocator } from "../../agent-collaboration/execution/services/agent-run-memory-locator.js";
import type { AgentConversationActivityInspector } from "../../agent-memory/services/agent-conversation-activity-inspector.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { TeamAgentPlatformBindingCommitter } from "../services/team-agent-platform-binding-committer.js";
import type { FrozenTeamRunTerminationScope } from "./frozen-team-run-termination-scope.js";
import { RootTeamRunMaterializationGate } from "./root-team-run-materialization-gate.js";
import { TaskWorkerStatusNotice } from "../../agent-collaboration/execution/task/task-worker-status-notice.js";

export type RootTeamRunPackageSnapshot = Readonly<{
  tree: TeamRunExecutionTreeSnapshot;
  /** Nothing is hosted (autobyteus-461): always empty; a view's children are the runs it delegated to. */
  statuses: readonly TeamAgentStatusSnapshot[];
  inputStates: readonly import("../../agent-collaboration/execution/domain/live-agent-input-snapshot.js").LiveAgentInputSnapshot[];
}>;

export type TeamRunExecutionCheckpoint = Readonly<{
  rootTeamRunId: string;
  changeSequence: number;
  hasOpenExecutionWork: boolean;
}>;

type RootLifecycleState = "active" | "persistence_fail_stop" | "terminating" | "terminated";

/**
 * The sole public operation boundary for one team run (autobyteus-461): its own members, its own log, its gate, its
 * peer endpoints and its own Stop. A run it delegates to is a run of its own; nothing is hosted.
 */
export class RootTeamRun {
  private lifecycle: RootLifecycleState = "active";
  private tree: TeamRunExecutionTreeSnapshot;
  private index: TeamExecutionIndex;
  private readonly teamRunResolver: TeamRunResolver;
  private readonly communication: RootCommunicationEngine;
  private readonly platformBindings: TeamAgentPlatformBindingCommitter;
  private readonly materializationGate: RootTeamRunMaterializationGate;
  private readonly collaborators: TeamRunCollaborators;
  private readonly delivery: TeamRunMessageDelivery;
  private readonly remoteLinks: RemoteRunLinks;
  /** autobyteus-278: the live facts of the runs this Team delegated to other nodes (its stream viewers drive it). */
  private readonly delegatedIdle: DelegatedTeamIdleShutdown | null; // DS-7: on every delegated team run (`isDelegated`: its tree has `delegatedFrom`)
  private readonly workerStatus: TaskWorkerStatusNotice | null; // its Tasks' worker status on the Task side
  private readonly unsubscribeIdleEvents: () => void;
  private termination: Promise<AgentOperationResult> | null = null;
  private frozenTerminationScope: FrozenTeamRunTerminationScope | null = null;
  private failStopped = false;

  constructor(private readonly options: {
    rootRun: TeamRun;
    tree: TeamRunExecutionTreeSnapshot;
    messages: TeamCommunicationMessagesSnapshot;
    persistence: TeamRunPersistenceCoordinator;
    publisher: TeamRunEventPublisher<TeamRunEvent>;
    /** The node's message feed (SR-072): its committed messages into the views of its runs and the runs above them. */
    messageFeed: Pick<RunMessagesFeed, "publish">;
    taskRecords: RunTaskRecords;
    /** The relationships between runs (the Task entries): its peer children and its own Task (SR-047). */
    delegationIndex: Pick<DelegationIndex, "peerChildrenOf" | "currentTaskOf" | "collaborationTreeOf">;
    /** The host's channel to peer nodes (autobyteus-500 FU-011). */
    remoteChannel: RemoteRunChannelAccess;
    /** The closed-Task input fence, from the tree and the Task records (DS-15, SR-070). */
    closedTasks: Pick<ClosedTaskFence, "refusal">;
    memoryLocator?: AgentRunMemoryLocator;
    activityInspector?: AgentConversationActivityInspector;
    taskExecutionIdleShutdown?: Readonly<{ gracePeriodMs?: () => number; timers?: TaskExecutionIdleTimers }>;
    collaboratorAdmission?: CollaboratorAdmission;
    disposeRootSubjects?(): void;
    onTerminated?(ending: TeamRunEnding): void;
  }) {
    this.tree = options.tree;
    this.index = new TeamExecutionIndex(options.tree);
    this.materializationGate = new RootTeamRunMaterializationGate({
      rootTeamRunId: this.teamRunId,
      canEnter: () => this.isAdmitting(),
    });
    this.remoteLinks = new RemoteRunLinks({ ...teamRunRemoteLinks(() => this.tree, options.delegationIndex), channel: options.remoteChannel });
    this.teamRunResolver = new TeamRunResolver({
      rootTeamRun: options.rootRun,
      getIndex: () => this.index,
    });
    this.communication = new RootCommunicationEngine(createTeamCommunicationPort({
      rootTeamRunId: this.teamRunId,
      initial: options.messages,
      // AR-020: a message to or from a peer run whose Task entry is closed is refused (its node keeps the run).
      assertDeliveryAllowed: (sender, receiver) => { this.assertPeerEntryOpen(sender); this.assertPeerEntryOpen(receiver); },
      isCurrentAgent: (identity) => this.isCurrentAgent(identity),
      messageLogOwnerOf: (agentRunId) => this.remoteLinks.has(agentRunId) || !this.index.getAgent(agentRunId) ? OTHER_RUN_LOG : OWN_RUN_LOG,
      requireContainingTeamRun: (agentRunId) => this.requireContainingTeamRun(agentRunId),
      commitMessageAppend: (append) => options.persistence.commitMessageAppend(append),
      publish: (event) => options.publisher.publish(event),
      messageFeed: options.messageFeed,
    }));
    this.collaborators = new TeamRunCollaborators({
      admission: options.collaboratorAdmission,
      getTree: () => this.tree,
      // SR-059, SR-060: what the run reaches by address step 2, from its collaboration tree.
      reached: async () => [...(await options.delegationIndex.collaborationTreeOf(createTeamRootExecutionIdentity(this.teamRunId)).stepTwo())?.values() ?? []],
      reachedPlacementAt: (address) => options.delegationIndex.collaborationTreeOf(createTeamRootExecutionIdentity(this.teamRunId)).delegationPlacementAt(address),
    });
    this.delivery = new TeamRunMessageDelivery({
      rootTeamRunId: this.teamRunId,
      getIndex: () => this.index,
      collaborators: this.collaborators,
      communication: this.communication,
      authorizeIdentity: (identity) => this.authorizeIdentity(identity),
      isLiveAgent: (agentRunId) => this.isLiveAgent(agentRunId),
      remoteLinks: this.remoteLinks,
      remoteSend: new RemoteMessageSend({ engine: () => this.communication, links: this.remoteLinks }),
    });
    this.platformBindings = new TeamAgentPlatformBindingCommitter({
      persistence: options.persistence,
      getTree: () => this.tree,
      assertAdmitting: () => this.assertAdmitting(),
      replaceTree: (tree) => this.replaceTree(tree),
      enterLifecycleFailStop: () => this.enterLifecycleFailStop(),
    });
    this.delegatedIdle = this.tree.delegatedFrom ? new DelegatedTeamIdleShutdown({ teamRunId: this.teamRunId,
      shutDownIfQuiet: () => this.shutDownIfQuiet(), ...options.taskExecutionIdleShutdown }) : null;
    this.workerStatus = this.tree.delegatedFrom ? new TaskWorkerStatusNotice({ teamRunId: this.teamRunId }, options.taskRecords) : null;
    this.unsubscribeIdleEvents = options.publisher.subscribe(({ event }) => { this.delegatedIdle?.onRootEvent(event); this.workerStatus?.onTeamEvent(event); });
    this.assertRootCorrelation();
  }

  /** The user's Stop of a peer child, by its node (DEC-804). A run delegated on this node is stopped as itself. */

  get teamRunId(): string { return this.tree.rootTeam.teamRunId; }
  get rootIdentity(): RootExecutionIdentity { return createTeamRootExecutionIdentity(this.teamRunId); }
  isActive(): boolean { return this.lifecycle === "active" && this.options.rootRun.isActive(); }
  /** Running work only: delegated children count only while initializing or running. */
  hasOpenExecutionWork(): boolean {
    return this.options.rootRun.hasOpenExecutionWork();
  }
  /** The Team's live sequence and change sequence, as its next stream snapshot would report them (autobyteus-358). */
  getLivePosition(): RootLivePosition { return this.options.publisher.getLivePosition(); }
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
        details: createTeamAgentStatusDetails({ status: "offline", backgroundTasksRunning: 0 }),
      }));
    return Object.freeze([...live, ...dormant]);
  }
  getExecutionTreeSnapshot(): TeamRunExecutionTreeSnapshot { return this.tree; }
  /** Run-ID membership: the team's own members and its peer endpoints. */
  hasAgentExecution(agentRunId: string): boolean {
    return this.index.getAgent(agentRunId.trim()) !== null || this.remoteLinks.has(agentRunId.trim());
  }
  getCommunicationSnapshot(): TeamCommunicationMessagesSnapshot {
    return Object.freeze({ schemaVersion: 1, rootTeamRunId: this.teamRunId, messages: this.communication.getMessages() });
  }

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

  /**
   * What this team run answers when one of its agents delegates, in its gate (SR-049): the sender, after its identity
   * check; this run; this run's own placement (its catalog address map and own refusals, in its
   * gate again); its view's notice of a peer run. The delegation itself is the tool path's.
   */
  delegationSource(context: TaskDelegationContext): Promise<DelegationSource> {
    return this.materializationGate.run(async () => {
      this.authorizeIdentity(context.identity);
      return Object.freeze({ sender: context.identity, senderRun: context.identity.root,
        resolvePlacement: (address: string, work: Parameters<DelegationSource["resolvePlacement"]>[1], folder: string | null) => this.materializationGate.run(async () =>
          localPlacement(await this.delivery.resolveDelegationPlacement(context.identity, address, work, folder))),
      });
    });
  }
  /** The coordinator of this team run, or of a peer team run it delegated to (`send_message_to` guidance); else null. */
  teamCoordinatorOf(teamRunId: string): string | null {
    if (teamRunId === this.teamRunId) return this.getCoordinatorAgentRunId();
    const peer = this.remoteLinks.teamLinkFor(teamRunId);
    return peer ? peer.members.find((member) => member.address === peer.coordinatorAddress)?.agentRunId ?? null : null;
  }
  /** The Task this team run works on (`get_project_task`'s read scope), by its own identity; else null. */
  ownedTaskOf(_context: TaskDelegationContext) { return runOwnTaskOf({ teamRunId: this.teamRunId }, this.options.delegationIndex); }

  /** `send_message_to(address)`: delivers to a standing instance; never creates a run. */
  deliverInterAgentMessage(intent: InterAgentMessageDeliveryIntent): Promise<AgentOperationResult> {
    return this.materializationGate.run(() => this.delivery.deliverToAddress(intent));
  }

  deliverExactAgentMessage(input: ExactTeamAgentMessageInput): Promise<AgentOperationResult> {
    return this.materializationGate.run(() => this.delivery.deliverExact(input, () => this.delivery.deliverToRunId(input)));
  }

  /** autobyteus-492 DS-004: to an agent of a peer node by its run ID. */
  deliverToPeerRun(input: PeerRunMessageInput): Promise<AgentOperationResult> {
    return this.materializationGate.run(() => this.delivery.deliverToPeerRun(input));
  }

  /** A message from a linked run on a peer node, admitted by its peer gateway (DS-003). */
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptRemoteMessage(input); });
  }
  /** autobyteus-492 DS-004: a peer agent's message by run ID only, while the member runs (never woken). */
  acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.materializationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptPeerRunMessage(input); });
  }

  /** N-6 for a Team a peer started: the delegator's work packet starts the coordinator with the task notification. */
  /** DS-2: a message from, and to, another run of this node (CrossRunMessageDelivery: receiver in the gate, sender's own log). */
  acceptFromRun(input: import("../../agent-collaboration/communication/cross-run-accept-input.js").CrossRunAcceptInput): Promise<AgentOperationResult> { return this.materializationGate.run(() => this.delivery.acceptFromRun(input)); }
  prepareSendToRun(input: import("../../agent-collaboration/execution/communication/root-communication-engine.js").RunSendInput) { return this.communication.prepareSendToRun(input); }
  commitSentToRun(message: Parameters<RootCommunicationEngine["commitSentToRun"]>[0]) { return this.communication.commitSentToRun(message); }
  acceptWorkPacket(packet: import("../../agent-collaboration/execution/task/task-delegation.js").WorkPacket): Promise<AgentOperationResult> {
    return this.materializationGate.run(() => acceptWorkPacketIfAllowed(packet, // CR-461-003: the Task side first, in the gate
      () => this.delivery.acceptWorkPacket(packet, this.getCoordinatorAgentRunId(), (message, agentRunId) => this.postMessage(message, agentRunId))));
  }
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
      // DS-15: a delegated team run whose Task is closed takes no input (a message or an approval), as base fenced a copy.
      const refusal = command.kind === "interrupt" ? null : this.options.closedTasks.refusal(createTeamRootExecutionIdentity(this.teamRunId), Boolean(this.tree.delegatedFrom));
      if (refusal) return refusal;
      if (command.kind !== "post_message") {
        if (!this.isLiveAgent(agentRunId)) {
          return { accepted: false, code: "RUN_NOT_ACTIVE", message: `AgentRun '${agentRunId}' is shut down in root '${this.teamRunId}'.` };
        }
        return (await this.requireContainingTeamRun(agentRunId)).executeDirectAgentCommand(agentRunId, command);
      }
      return (await this.requireContainingTeamRun(agentRunId)).executeDirectAgentCommand(agentRunId, command);
    });
  }

  subscribeToEvents(listener: RootEventListener<TeamRunEvent>): () => void {
    return this.options.publisher.subscribe(listener);
  }

  /**
   * The run's view snapshot (SR-063): in the view stream's snapshot connection, `atBase` runs in the same synchronous
   * step as the base (the view's rows and statuses, in memory); then the root's own parts are read consistently, as at
   * base, and `read` completes the snapshot.
   */
  openViewSnapshotConnection<TAtBase, TSnapshot>(
    atBase: () => TAtBase,
    read: (own: RootTeamRunPackageSnapshot, atBase: TAtBase) => Promise<TSnapshot> | TSnapshot,
  ): Promise<RootSnapshotConnection<TSnapshot, TeamRunEvent>> {
    this.assertAdmitting();
    return this.options.publisher.openSnapshotConnection(async () => {
      const rows = atBase();
      const own = await this.options.persistence.readConsistent(() => ({
        tree: this.tree,
        statuses: this.getLeafAgentStatusSnapshots(),
        inputStates: this.options.rootRun.getInputStateSnapshots(),
      }));
      return read(own, rows);
    });
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.failStopped) return;
    this.failStopped = true;
    this.lifecycle = "persistence_fail_stop";
    this.options.persistence.enterRootFailStop();
    this.communication.closeAdmission();
    queueMicrotask(() => {
      void this.terminate().catch((error) => {
        console.error(`RootTeamRun '${this.teamRunId}' fail-stop teardown failed:`, error);
      });
    });
  }

  /**
   * DS-7 (every delegated Team, DS-004's peer-started one too): ends quietly, in the gate, when its own all-or-nothing
   * quiescent preparation succeeds, as base's delegated task Team (`tryShutDownRootTaskTeamIfQuiet`): a member starting or
   * running is not quiet; a member whose start failed (`error`) is, as for an agent run (CR-461-061, F-43, DTL-005). It
   * never interrupts a member, and it ends as a Stop ends (the package is kept).
   */
  async shutDownIfQuiet(): Promise<boolean> {
    if (this.termination || !this.isAdmitting()) return false;
    const quiet = await this.materializationGate.run(async () => {
      const prepared = await this.options.rootRun.tryPrepareTerminationIfQuiescent();
      if (prepared) this.lifecycle = "terminating";
      return prepared;
    });
    return quiet ? (await this.terminate(quiet)).accepted : false;
  }

  terminate(quiet: PreparedLocalExecutionTermination | null = null): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) { quiet?.cancel(); return this.termination; }
    this.delegatedIdle?.dispose();
    this.lifecycle = "terminating";
    this.communication.closeAdmission();
    void this.materializationGate.closeAndDrain();
    const termination = this.runTermination(quiet);
    this.termination = termination;
    void termination.then((result) => {
      if (result.accepted) this.workerStatus?.stopped();
      if (!result.accepted && this.termination === termination) this.termination = null;
    }, () => {
      if (this.termination === termination) this.termination = null;
    });
    return termination;
  }

  private async runTermination(quiet: PreparedLocalExecutionTermination | null): Promise<AgentOperationResult> {
    await this.materializationGate.closeAndDrain();
    // A quiet shutdown (DS-004) fences nothing: every member and child already prepared its quiescent termination.
    const committed = quiet?.commit() ?? null;
    if (!committed) this.frozenTerminationScope ??= this.options.rootRun.freezeForRootTermination();
    const fenced = committed ? { accepted: true } : await this.frozenTerminationScope!.fenceAgentRunsForRootShutdown();
    if (!fenced.accepted) return fenced;
    await this.options.persistence.drain();
    const result = committed ? await committed.finish() : await this.frozenTerminationScope!.finish();
    if (!result.accepted) return result;
    this.teamRunResolver.clear();
    this.unsubscribeIdleEvents();
    this.options.disposeRootSubjects?.();
    // The run's view stream outlives its root (SR-062): its views stay subscribed.
    this.lifecycle = "terminated";
    this.options.onTerminated?.(committed ? "idle_shutdown" : "stopped");
    return { accepted: true };
  }

  private assertPeerEntryOpen(agentRunId: string): void {
    const endpoint = this.remoteLinks.endpointFor(agentRunId);
    if (!endpoint || endpoint.kind === "delegator") return;
    const execution = endpoint.kind === "delegated_run" ? { agentRunId: endpoint.link.agentRunId } : { teamRunId: endpoint.link.teamRunId };
    if (!this.options.taskRecords.isOpen(execution)) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    }
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
   * Runtime liveness: a member is live with its active TeamRun (lazy start).
   */
  private isLiveAgent(agentRunId: string): boolean {
    const agent = this.index.getAgent(agentRunId);
    return !!agent && this.teamRunResolver.getActive(agent.containingTeamRunId) !== null;
  }

  private async requireTeamRun(teamRunId: string): Promise<TeamRun> {
    this.index.requireTeam(teamRunId);
    const active = this.teamRunResolver.getActive(teamRunId);
    if (active) return active;
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

  private assertRootCorrelation(): void {
    if (
      this.options.rootRun.teamRunId !== this.tree.rootTeam.teamRunId ||
      this.options.messages.rootTeamRunId !== this.tree.rootTeam.teamRunId
    ) throw new Error("RootTeamRun subject identities do not agree.");
  }
}
