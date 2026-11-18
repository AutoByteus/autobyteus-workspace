import { TaskDelegationError } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { OTHER_RUN_LOG, OWN_RUN_LOG } from "../../run-history/store/message-log-owners.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import { RemoteRunLinks, type RemoteInboundMessage } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import { RemoteMessageSend } from "../../agent-collaboration/execution/remote/remote-message-send.js";
import type { AgentOrgIndexedAgentExecution } from "../services/agent-org-execution-index.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { createCollaborationMemberExecutionIdentity, sameCollaborationMemberExecutionIdentity, sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberLogicalMessageInput } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { TaskDelegationContext } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { DelegationSource } from "../../agent-collaboration/execution/task/member-task-capability.js";
import { RootCommunicationEngine } from "../../agent-collaboration/execution/communication/root-communication-engine.js";
import type { ActiveRootMessageBoundary, ExactAgentMessageInput, PeerRunMessageInput } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RunViewStream } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { CollaborationAgentPlatformBindingChange } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import { type CollaborationAgentExecutionEvent } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "./agent-org-run-execution-tree.js";
import type { AgentOrgRunEvent } from "./agent-org-run-event.js";
import type { AgentOrgCommunicationMessagesFile } from "../persistence/agent-org-communication-messages.js";
import { AgentOrgExecutionIndex } from "../services/agent-org-execution-index.js";
import { createAgentOrgCommunicationPort } from "../services/agent-org-communication-port.js";
import {
  adoptAgentOrgPlatformBinding,
  commitAgentOrgRuntimeSwitch,
  replaceAgentOrgPlatformBindingWithoutConversation,
} from "../services/agent-org-run-execution-tree-mutator.js";
import { AgentOrgRecipientResolver } from "../services/agent-org-recipient-resolver.js";
import { AgentOrgRunCollaborators } from "../services/agent-org-run-collaborators.js";
import { AgentOrgRunMessageDelivery } from "../services/agent-org-run-message-delivery.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { CollaboratorMention, RootCollaboratorAdmissionResult } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import type { AvailableCollaborator } from "../../agent-collaboration/collaborators/collaborator-candidate-policy.js";
import type { RootSnapshotConnection } from "../../agent-collaboration/delegation/run-view-stream.js";
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
  statuses: readonly CollaborationAgentStatusSnapshot[];
  inputStates: readonly import("../../agent-collaboration/execution/domain/live-agent-input-snapshot.js").LiveAgentInputSnapshot[];
}>;

/** Native coordinator-free AgentOrg aggregate and sole live owner of its scope. */
export class AgentOrgRun implements ActiveRootMessageBoundary {
  private lifecycle: "activating" | "active" | "terminating" | "terminated" | "fail_stop" = "activating";
  private tree: AgentOrgRunExecutionTreeSnapshot;
  private index: AgentOrgExecutionIndex;
  private readonly communication: RootCommunicationEngine;
  private readonly presentation: CollaborationAgentPresentationEventAdapter;
  private readonly operationGate: RootOperationGate;
  private readonly delivery: AgentOrgRunMessageDelivery;
  private readonly remoteLinks: RemoteRunLinks;
  /** autobyteus-278: the live facts of the runs this Org delegated to other nodes (its stream viewers drive it). */
  private readonly collaborators: AgentOrgRunCollaborators;
  private termination: Promise<AgentOperationResult> | null = null;
  /** Fail-stop origin outlives a failed termination attempt, so a retry keeps the fail-stop settlement. */
  private failStopped = false;
  private frozenTerminationScope: FrozenRootTerminationScope | null = null;

  constructor(private readonly options: import("./agent-org-run-options.js").AgentOrgRunOptions) {
    this.tree = options.tree;
    this.index = new AgentOrgExecutionIndex(this.tree);
    this.assertCorrelation();
    this.operationGate = new RootOperationGate({
      rootLabel: `AgentOrg '${this.orgRunId}'`,
      canEnter: () => this.isAdmitting(),
    });
    this.presentation = new CollaborationAgentPresentationEventAdapter((agentRunId) => {
      const agent = this.index.getAgent(agentRunId);
      return agent ? this.identityFor(agent.agentRunId, agent.address) : null;
    });
    this.remoteLinks = new RemoteRunLinks({ peerRuns: () => peerRunLinksOf(options.root, options.delegationIndex) });
    this.collaborators = new AgentOrgRunCollaborators({
      admission: options.collaboratorAdmission,
      getTree: () => this.tree,
    });
    const recipients = new AgentOrgRecipientResolver({ getIndex: () => this.index, collaborators: this.collaborators });
    this.delivery = new AgentOrgRunMessageDelivery({
      orgRunId: this.orgRunId,
      root: options.root,
      getIndex: () => this.index,
      recipients,
      collaborators: this.collaborators,
      getCommunication: () => this.communication,
      rootAgents: options.rootAgents,
      teams: options.teams,
      publisher: options.publisher,
      remoteLinks: this.remoteLinks,
      remoteSend: new RemoteMessageSend({ engine: () => this.communication, links: this.remoteLinks }),
      authorizeIdentity: (identity) => this.authorizeIdentity(identity),
    });
    this.communication = new RootCommunicationEngine(createAgentOrgCommunicationPort({
      root: options.root,
      initial: options.messages,
      persistence: options.persistence,
      isOpen: () => this.isAdmitting(),
      // AR-020: a message to or from a peer run whose Task entry is closed is refused (its node keeps the run).
      assertDeliveryAllowed: (sender, receiver) => { this.assertPeerEntryOpen(sender); this.assertPeerEntryOpen(receiver); },
      isCurrentAgent: (identity) => this.isPublishedAgent(identity),
      messageLogOwnerOf: (agentRunId) => this.remoteLinks.has(agentRunId) || !this.index.getAgent(agentRunId) ? OTHER_RUN_LOG : OWN_RUN_LOG,
      reserveRecipientInput: (agentRunId, message) => this.delivery.reserveAgentInput(agentRunId, message),
      messageFeed: options.messageFeed,
      presentCommittedMessage: (message, receiverInput) => this.delivery.presentCommittedCommunication(message, receiverInput),
    }));
  }

  /** An org agent takes input while the org run is active; nothing hosted is fenced here (autobyteus-461). */
  assertExecutionInputAllowed(_agentRunId: string): void { this.assertAdmitting(); }

  /** The user's Stop of a peer child, by its node (DEC-804). A run delegated on this node is stopped as itself. */

  get orgRunId(): string { return this.tree.rootOrg.orgRunId; }
  get rootIdentity(): RootExecutionIdentity { return this.options.root; }
  isActive(): boolean { return this.lifecycle === "active"; }
  activate(): void {
    if (this.lifecycle !== "activating") throw new Error(`AgentOrg '${this.orgRunId}' is not activatable.`);
    this.lifecycle = "active";
  }
  getExecutionTreeSnapshot(): AgentOrgRunExecutionTreeSnapshot { return this.tree; }
  getCommunicationSnapshot(): AgentOrgCommunicationMessagesFile {
    return Object.freeze({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: this.orgRunId, messages: this.communication.getMessages() });
  }
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
  /** Same-root membership for run-ID routing: every agent of the Org (and its copies) and every remote endpoint. */
  hasAgentExecution(agentRunId: string): boolean {
    return this.index.getAgent(agentRunId.trim()) !== null || this.remoteLinks.has(agentRunId.trim());
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
    return this.operationGate.run(() => this.delivery.deliverToAddress(sender, input));
  }

  deliverExactAgentMessage(input: ExactAgentMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.delivery.deliverExact(input));
  }

  /** A message from a linked run on a peer node, admitted by its peer gateway (DS-003). */
  /** DS-2: a message from, and to, another run of this node (CrossRunMessageDelivery: receiver in the gate, sender's own log). */
  acceptFromRun(input: import("../../agent-collaboration/communication/cross-run-accept-input.js").CrossRunAcceptInput): Promise<AgentOperationResult> { return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptFromRun(input); }); }
  prepareSendToRun(input: import("../../agent-collaboration/execution/communication/root-communication-engine.js").RunSendInput) { return this.communication.prepareSendToRun(input); }
  commitSentToRun(message: Parameters<RootCommunicationEngine["commitSentToRun"]>[0]) { return this.communication.commitSentToRun(message); }
  acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptRemoteMessage(input); });
  }
  /** autobyteus-492 DS-004: a peer agent's message by run ID only, while that agent runs (never woken). */
  acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> {
    return this.operationGate.run(async () => { this.assertAdmitting(); return this.delivery.acceptPeerRunMessage(input); });
  }
  /** autobyteus-492 DS-004: to an agent of a peer node by its run ID. */
  deliverToPeerRun(input: PeerRunMessageInput): Promise<AgentOperationResult> {
    return this.operationGate.run(() => this.delivery.deliverToPeerRun(input));
  }

  /** What this Org answers when one of its agents delegates, in its gate (SR-049); the delegation is the tool path's. */
  delegationSource(context: TaskDelegationContext): Promise<DelegationSource> {
    return this.operationGate.run(async () => {
      const own = this.delivery.delegationSource(context);
      return Object.freeze({ ...own,
        resolvePlacement: (address: string, work: Parameters<DelegationSource["resolvePlacement"]>[1], folder: string | null) =>
          this.operationGate.run(() => own.resolvePlacement(address, work, folder)),
      });
    });
  }
  /** The coordinator of a peer team run this org delegated to (`send_message_to` guidance); else null. */
  teamCoordinatorOf(teamRunId: string): string | null {
    const peer = this.remoteLinks.teamLinkFor(teamRunId);
    return peer ? peer.members.find((member) => member.address === peer.coordinatorAddress)?.agentRunId ?? null : null;
  }
  /** An org run works on no Task (it is never delegated): its agents read any Task. */
  ownedTaskOf(_context: TaskDelegationContext) { return null; }

  async commitAgentPlatformBindingChange(change: CollaborationAgentPlatformBindingChange): Promise<void> {
    return this.operationGate.run(async () => {
      this.assertAdmitting();
      await this.options.persistence.commitTreeMutation({
        prepareAgainstCurrent: () => {
          this.assertAdmitting();
          const tree = change.kind === "adopt_or_retain"
            ? adoptAgentOrgPlatformBinding({ tree: this.tree, binding: change.binding }).tree
            : change.kind === "runtime_switch"
              ? commitAgentOrgRuntimeSwitch({ tree: this.tree, commit: change })
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
    const adapted = this.presentation.adapt(identity, event);
    if (adapted.kind === "rejected") {
      this.enterFailStop();
      throw new Error(adapted.message);
    }
    if (adapted.kind === "publish") {
      this.options.publisher.publish({ kind: "agent_presentation", execution: identity, message: adapted.message });
    }
  }

  subscribeToEvents(listener: Parameters<RunViewStream<AgentOrgRunEvent>["subscribe"]>[0]) {
    return this.options.publisher.subscribe(listener);
  }

  openPackageSnapshotConnection(): Promise<RootSnapshotConnection<AgentOrgRunPackageSnapshot, AgentOrgRunEvent>> {
    return this.openViewSnapshotConnection(() => undefined, (own) => own);
  }

  /**
   * The run's view snapshot (SR-063): in the view stream's snapshot connection, `atBase` runs in the same synchronous
   * step as the base (the view's rows and statuses, in memory); then `read` completes it with the root's own parts.
   */
  openViewSnapshotConnection<TAtBase, TSnapshot>(
    atBase: () => TAtBase,
    read: (own: AgentOrgRunPackageSnapshot, atBase: TAtBase) => Promise<TSnapshot> | TSnapshot,
  ): Promise<RootSnapshotConnection<TSnapshot, AgentOrgRunEvent>> {
    return this.options.publisher.openSnapshotConnection(() => {
      const rows = atBase();
      return read(Object.freeze({
        tree: this.tree,
        statuses: this.getAgentStatusSnapshots(),
        inputStates: [...new Map([...this.options.rootAgents.getInputStateSnapshots(),
          ...this.options.teams.list().flatMap(team => team.getInputStateSnapshots())]
          .map(input => [input.agent_run_id, input])).values()],
      }), rows);
    });
  }

  enterPersistenceFailStop(): void { this.enterFailStop(); }
  enterLifecycleFailStop(): void { this.enterFailStop(); }

  terminate(): Promise<AgentOperationResult> {
    if (this.lifecycle === "terminated") return Promise.resolve({ accepted: true });
    if (this.termination) return this.termination;
    this.lifecycle = "terminating";
    this.communication.closeAdmission();
    void this.operationGate.closeAndDrain();
    // Stopping the org's own agents and mounted teams is runtime-only (the runs it delegated to are runs of their own),
    // so a fail-stopped attempt drains the same way.
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
    await this.options.persistence.drain();
    const local = await this.frozenTerminationScope.finish();
    if (!local.accepted) return { accepted: false, code: "AGENT_ORG_TERMINATION_FAILED",
      message: local.message ?? local.code ?? "AgentOrg local termination failed" };
    this.lifecycle = "terminated";
    this.options.publisher.publish({ kind: "lifecycle", isActive: false });
    // The run's view stream outlives its root (SR-062): its views stay subscribed.
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
  private assertPeerEntryOpen(agentRunId: string): void {
    const endpoint = this.remoteLinks.endpointFor(agentRunId);
    if (!endpoint || endpoint.kind === "delegator") return;
    const execution = endpoint.kind === "delegated_run" ? { agentRunId: endpoint.link.agentRunId } : { teamRunId: endpoint.link.teamRunId };
    if (!this.options.taskRecords.isOpen(execution)) {
      throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
    }
  }

  private isAdmitting(): boolean { return this.lifecycle === "active"; }
  private assertAdmitting(): void {
    if (!this.isAdmitting()) throw new Error(`AgentOrg '${this.orgRunId}' is not accepting commands.`);
  }
  private assertCorrelation(): void {
    if (this.options.root.rootSubjectKind !== "agent_org"
      || this.options.root.rootRunId !== this.tree.rootOrg.orgRunId
      || this.options.messages.orgRunId !== this.orgRunId) {
      throw new Error("AgentOrg aggregate authorities do not correlate to one exact root.");
    }
  }
  private enterFailStop(): void {
    if (this.lifecycle === "terminated" || this.failStopped) return;
    this.failStopped = true;
    this.lifecycle = "fail_stop";
    this.options.persistence.enterRootFailStop();
    this.communication.closeAdmission();
    queueMicrotask(() => { void this.terminate(); });
  }
}
