import type { DelegatorCatalog } from "./delegator-catalog.js";
import type { RunOwnDelegation, RunOwnDelegations } from "./run-own-delegation.js";
import { taskExecutionConversationUnavailable, type RunConversationAvailability } from "./run-conversation-availability.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { DelegationPlacement, RemoteAgentPlacement } from "../../collaborators/catalog-delegation.js";
import type { RemoteAgentLaunch, RemoteRunChannel } from "../remote/remote-run-channel.js";
import type { OutgoingFiles } from "../remote/outgoing-files.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../remote/remote-refusal-codes.js";
import type { DelegationIndex } from "../../delegation/delegation-index.js";
import { ownTeamDelegationRefusedMessage, selfDelegationRefusedMessage } from "../../collaborators/collaborator-errors.js";
import { CollaborationContractError } from "../../domain/collaboration-contract-error.js";
import { DelegatedRunStartError, type DelegatedRunStarter } from "../delegation/delegated-run-starter.js";
import { sameRootExecutionIdentity, type CollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { findRoutingDecisionRecorder } from "../../../model-routing/domain/routing-decision-recorder-binding.js";
import { decisionRecordsOf, type DelegationWork } from "../../../model-routing/domain/model-routing-types.js";
import { getAgentTeamAddressBasename, type AgentTeamAddress } from "../../domain/agent-team-address.js";
import { runIdentityOf, runReferenceOf, taskExecutionResourceRejectionCode, type TaskExecutionResourcePort } from "./task-execution-resource-port.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import { TaskDelegationError, type AssignToExistingDelegatedRunInput, type DelegatedRun, type SpawnTaskInput, type TaskDelegationOutcome } from "./task-delegation-command.js";
import {
  TASK_ASSIGNMENT_MESSAGE_TYPE, buildExistingDelegatedRunTaskMessage, requireTaskString, validateTaskReferenceFiles, type DelegatedProjectTask,
} from "./task-execution-input.js";
/** The refusal for an ID that is not a run this sender's run delegated to (unknown, or another run's). */
const notADelegatedRunOfThisRun = (run: TaskExecutionReference): TaskDelegationError => new TaskDelegationError("TASK_DELEGATED_RUN_NOT_ASSIGNABLE",
  `${"agentRunId" in run ? run.agentRunId : run.teamRunId} is not one of your task agents. Use a run id that delegate_task returned to you, `
  + "or delegate to a new task agent with recipient_address.");

/** The work packet a new run starts with (its first input), as the delegated run's own root posts it. */
export type WorkPacket = Readonly<{
  delegator: CollaborationMemberExecutionIdentity;
  /** The delegator's own address when it reaches exactly that agent, for the run's reply; null otherwise. */
  delegatorAddress: AgentTeamAddress | null;
  description: string;
  comments: readonly string[];
  task?: DelegatedProjectTask;
  referenceFiles: readonly string[];
  /** The gate-head re-check from the Task side (CR-461-003, design race table row 5): throws when the Task closed meanwhile. */
  assertAllowed(): void;
}>;

/** The text a delegation answers when its Task closed while the new run was starting. */
const CLOSED_DURING_START = "The Task was marked DONE or CANCELLED; its new work was not started.";

/**
 * A run's acceptance of its work packet, in its own gate (CR-461-003): the Task side is asked first, so a closure that
 * committed while the run was starting refuses the packet (`TASK_AGENT_RESOURCE_CLOSED`) and nothing starts.
 */
export const acceptWorkPacketIfAllowed = (packet: WorkPacket, accept: () => Promise<AgentOperationResult>): Promise<AgentOperationResult> => {
  try { packet.assertAllowed(); } catch (error) {
    if (error instanceof TaskDelegationError) return Promise.resolve({ accepted: false, code: error.code, message: error.message });
    throw error;
  }
  return accept();
};

/** A local placement: an agent or a team on this node. */
export type LocalDelegationPlacement = Extract<DelegationPlacement, { kind: "agent" | "agent_team" }>;
/** A placement without `node` is a local one (a peer placement needs `node`). */
export const localPlacement = (placement: DelegationPlacement): LocalDelegationPlacement => {
  if (placement.kind === "remote_agent") throw new Error("A delegation without a node resolved to a peer.");
  return placement;
};

type Join = Readonly<{ role: "assigned"; taskId: string } | { role: "assigned"; adHocTask: { description: string; referenceFiles: readonly string[] } } | { role: "subWork" }>;
type NewRunWork = Readonly<{ description: string; comments: readonly string[]; referenceFiles: readonly string[]; task?: DelegatedProjectTask; join: Join; delegation: DelegationWork }>;

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
/** Base's Task record code for any failed dispatch of a new run (`root-task-dispatch.ts` at 827f1e68dc). */
const TASK_DISPATCH_FAILED = "TASK_DISPATCH_FAILED";

/**
 * CM-1 for a delegated run (CR-461-050): the address it was delegated to (its Task entry's `recipientAddress`), or one
 * inside it, is itself, as base's hosted copy at that address was; refused before any placement. `null` otherwise.
 */
const ownNameRefusal = (senderRun: RootExecutionIdentity, ownName: string | undefined, address: string): CollaborationContractError | null => {
  const target = address.trim();
  if (!ownName || (target !== ownName && !target.startsWith(`${ownName}/`))) return null;
  return new CollaborationContractError("COLLABORATION_SELF_TARGET_REJECTED",
    senderRun.rootSubjectKind === "agent_team" ? ownTeamDelegationRefusedMessage(target) : selfDelegationRefusedMessage(target));
};
const firstLineOf = (description: string): string => description.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
const workText = (description: string, comments: readonly string[]): string =>
  comments.length ? [description, "", "Comments:", ...comments.map((comment) => `- ${comment}`)].join("\n") : description;
/**
 * A new run's refusal the agent reads as `{ delegated: false, message }`: a delegation refusal or the Task side's
 * rejection, as base (`asTaskDelegationError`). Any other error is thrown, so the tool answers base's
 * `{ error: { code, message } }`, e.g. TASK_DELEGATION_ERROR for an unknown Task key by `recipient_address` (CR-461-059).
 */
const asRefusal = (error: unknown): TaskDelegationOutcome | null =>
  error instanceof TaskDelegationError || taskExecutionResourceRejectionCode(error) ? { delegated: false, message: message(error) } : null;
/**
 * A run-ID assignment's refusal: any coded error, as base's `assignToExistingDelegatedRun` (`refusalCode`), e.g. an unknown
 * Task key is `{ delegated: false, message }` on this path (CR-461-059, F-47). An uncoded error is thrown.
 */
const asRunIdRefusal = (error: unknown): TaskDelegationOutcome | null =>
  error instanceof TaskDelegationError || (error instanceof Error && typeof (error as { code?: unknown }).code === "string")
    ? { delegated: false, message: message(error) } : null;

/**
 * `delegate_task`'s order for a new run (design DS-1, `TaskDelegation`), root-neutral: the standalone, team and org roots
 * all delegate through it. Nothing hosts the new run: it is an ordinary run whose relationship is its Task entry and its
 * own `delegatedFrom` (contract P1, P2).
 *
 * 1. The work and its Task: a sender whose run works on an open Task delegates sub-work of its newest open Task (CM-6),
 *    and may not name `task_id`; any other sender assigns a saved Task, or a new Task with no Project.
 * 2. The placement, resolved by the sender's root (refusals keep today's texts and order).
 * 3. The run is created inert by `DelegatedRunStarter` (a prepared agent run, a team run not started), as the peer
 *    path creates it before the link: its ID is known before the Task entry is written.
 * 4. The Task entry (`starting`), whose `delegatedFrom` names the sender's run and the sender; the tree follows.
 * 5. The work packet, posted by the new run's own root (its first input starts it). 6. `markStarted`.
 * A failure after creation ends the new run; after the link it is also `markFailed`.
 */
export class TaskDelegation {
  constructor(private readonly dependencies: Readonly<{
    tasks(): TaskExecutionResourcePort;
    tree(): Pick<DelegationIndex, "currentTaskOf" | "tasksOf" | "runOfAgent" | "topOf">;
    /** A message to another run (DS-2, `CrossRunMessageDelivery`): stored in both runs' logs, the receiver woken. */
    deliverToRun(input: Readonly<{ sender: CollaborationMemberExecutionIdentity; senderDisplayName: string; targetAgentRunId: string; content: string;
      messageType: string; referenceFiles: readonly string[] }>): Promise<AgentOperationResult | null>;
    starter: Pick<DelegatedRunStarter, "startAgent" | "startTeam">;
    /** The new run's own root posts its work packet (it starts the agent, or the team's coordinator). */
    deliverWorkPacket(run: RootExecutionIdentity, packet: WorkPacket): Promise<AgentOperationResult>;
    /** Ends a run created for a delegation that did not go through (cancels a prepared agent run, ends a team run). */
    discard(run: TaskExecutionReference): Promise<void>;
    /** The peer channel; `null` where remote collaboration is not composed (the application host). */
    channel(): RemoteRunChannel | null;
    /** autobyteus-587: a peer delegation's reference files, uploaded to that node before its run starts (DS-001). */
    outgoing: Pick<OutgoingFiles, "send">;
    /** An agent run that delegates collaborates: its own address is fixed and its history row says so (contract §3.3). */
    recordCollaborating(agentRunId: string, address: AgentTeamAddress): Promise<void>;
    /**
     * The sender's address as the new run may use it (contract §2.5, the receiver's collaboration tree, `reachingAddressOf`): the
     * one owner of the work packet's sender address for every delegator kind (CR-461-031); `null`: run ID only.
     */
    reachingAddress(sender: CollaborationMemberExecutionIdentity, receiverRun: RootExecutionIdentity): Promise<string | null>;
    /** Whether an existing run can take a follow-up Task: its entry agent live, or its saved conversation readable (CR-461-043). */
    conversationOf(execution: TaskExecutionReference, entry: Readonly<{ agentRunId: string; address: string }>): Promise<RunConversationAvailability>;
    /** A delegated run's start from its delegator's catalog at an address its own catalog does not offer: its delegator's (CR-461-041). */
    delegatorCatalog: Pick<DelegatorCatalog, "placementAt">;
    /** A run no Task names any more: its delegation as its own file records it (SR-072 F-24). */
    ownDelegations: Pick<RunOwnDelegations, "of">;
  }>) {}

  /**
   * `delegate_task` with `node` (DEC-111, CM-10): the run is created by the peer, which owns it; this node keeps its
   * Task entry, with the peer's node, the team's members and the address (contract §2.1, E3; no tree link). The order
   * is `toNewRun`'s: work, its files (uploaded to the peer, autobyteus-587 DS-001: a refusal there starts nothing), run
   * (on the peer), Task entry, work packet (through the channel, naming the files), `markStarted`. The result names the
   * peer and the files sent, and the launches the peer resolved are returned for the root's notes (REQ-009).
   */
  async toPeerRun(input: Readonly<{
    sender: CollaborationMemberExecutionIdentity;
    senderRun: RootExecutionIdentity;
    spawn: SpawnTaskInput;
    placement: Omit<RemoteAgentPlacement, "work">;
  }>): Promise<Readonly<{ outcome: TaskDelegationOutcome; launches: readonly RemoteAgentLaunch[] }>> {
    const refused = (text: string) => ({ outcome: { delegated: false as const, message: text }, launches: [] });
    const channel = this.dependencies.channel();
    if (!channel) return refused(REMOTE_ROOT_REFUSAL_TEXT.off);
    const tasks = this.dependencies.tasks();
    let work: NewRunWork;
    try { work = await this.prepareWork(input.senderRun, input.spawn); }
    catch (error) { const refusal = asRefusal(error); if (refusal && !refusal.delegated) return refused(refusal.message); throw error; }
    const { placement } = input;
    const sent = await this.dependencies.outgoing.send({ senderAgentRunId: input.sender.agentRunId, nodeId: placement.peer.nodeId,
      peerName: placement.peer.name, referenceFiles: work.referenceFiles });
    if (!sent.ok) return refused(sent.refusal.message);
    const started = await channel.startDelegatedRun({ nodeId: placement.peer.nodeId, address: placement.address, delegatorAgentRunId: input.sender.agentRunId,
      delegatingRun: { kind: input.senderRun.rootSubjectKind, runId: input.senderRun.rootRunId }, work: work.delegation });
    if (!started.accepted) return refused(started.message);
    const team = started.kind === "agent_team";
    const coordinator = team ? started.members.find((member) => member.address === started.coordinatorAddress) : null;
    if (team && !coordinator) return refused(`The team on ${placement.peer.name} named no coordinator among its members.`);
    const execution: TaskExecutionReference = team ? { teamRunId: started.teamRunId } : { agentRunId: started.agentRunId };
    const entryAgentRunId = team ? coordinator!.agentRunId : (execution as { agentRunId: string }).agentRunId;
    let link: { taskId: string };
    try {
      link = await tasks.linkNewTaskExecution({
        ...(work.join.role === "subWork" ? { role: "subWork" as const } : "taskId" in work.join
          ? { role: "assigned" as const, taskId: work.join.taskId } : { role: "assigned" as const, adHocTask: work.join.adHocTask }),
        recipientAddress: placement.address,
        delegatedFrom: { delegatingRun: input.senderRun, delegatorAgentRunId: input.sender.agentRunId }, execution,
        nodeId: placement.peer.nodeId,
        ...(team ? { teamCoordinatorAgentRunId: entryAgentRunId, members: started.members.map((member) => ({ address: member.address, agentRunId: member.agentRunId })) } : {}),
      } as Parameters<TaskExecutionResourcePort["linkNewTaskExecution"]>[0]);
    } catch (error) {
      // The peer's run, never given work, ends on its node (its idle shutdown, or the prepared run's expiry).
      const refusal = asRefusal(error);
      if (refusal && !refusal.delegated) return refused(refusal.message);
      throw error;
    }
    await this.recordCollaborating(input);
    const delivered = await channel.deliverMessage({ nodeId: placement.peer.nodeId, kind: "work_packet", senderAgentRunId: input.sender.agentRunId, senderAddress: input.sender.memberAddress,
      targetRoot: team ? { kind: "agent_team", runId: started.teamRunId } : { kind: "agent", runId: entryAgentRunId }, targetAgentRunId: entryAgentRunId,
      content: placement.description, messageType: "task_work_packet", createdAt: new Date().toISOString(), files: sent.files })
      .catch((error: unknown) => ({ accepted: false as const, code: REMOTE_REFUSAL.PEER_UNREACHABLE, message: message(error) }));
    if (!delivered.accepted) {
      // As base, any failed dispatch of a new run is recorded as TASK_DISPATCH_FAILED with its message (CR-461-052, REQ-005).
      await tasks.markFailed(execution, { code: TASK_DISPATCH_FAILED, message: delivered.message ?? "The work was not delivered." });
      return refused(delivered.message ?? "The work was not delivered.");
    }
    await tasks.markStarted(execution);
    const delegatedRun: DelegatedRun = team ? { kind: "team", teamRunId: started.teamRunId, teamCoordinatorAgentRunId: entryAgentRunId } : { kind: "agent", agentRunId: entryAgentRunId };
    const createdTaskId = work.join.role === "assigned" && "adHocTask" in work.join ? link.taskId : null;
    return { outcome: { delegated: true, delegatedRun, node: placement.peer.name, ...(createdTaskId ? { taskId: createdTaskId } : {}),
      ...(sent.files.length ? { filesSent: sent.files.length } : {}) }, launches: started.launches };
  }

  /**
   * `delegate_task` with an address to a local agent or team. `senderRun` is the sender's own run (a standalone run, the
   * team run of a member, the org run of an org's agent). `resolvePlacement` is the sender root's resolution.
   */
  async toNewRun(input: Readonly<{
    sender: CollaborationMemberExecutionIdentity;
    senderRun: RootExecutionIdentity;
    spawn: SpawnTaskInput;
    resolvePlacement(work: DelegationWork, folder: string | null): Promise<LocalDelegationPlacement>;
  }>): Promise<TaskDelegationOutcome> {
    const tasks = this.dependencies.tasks();
    let work: NewRunWork, placement: LocalDelegationPlacement;
    let folder: string | null;
    try {
      work = await this.prepareWork(input.senderRun, input.spawn);
      folder = work.task ? await tasks.projectFolderForNewDelegatedRun(work.task.projectId) : null;
    } catch (error) {
      const refusal = asRefusal(error);
      if (refusal) return refusal;
      throw error;
    }
    const senderReference = runReferenceOf(input.senderRun);
    const ownName = senderReference ? this.dependencies.tree().currentTaskOf(senderReference)?.recipientAddress : undefined;
    const ownNameRefused = ownNameRefusal(input.senderRun, ownName, input.spawn.recipient_address);
    if (ownNameRefused) throw ownNameRefused;
    try {
      placement = await input.resolvePlacement(work.delegation, folder);
    } catch (error) {
      // Today's refusal of the placement step: nothing at the address the sender can delegate to; anything else throws.
      if ((error as { code?: unknown } | null)?.code !== "COLLABORATION_TARGET_NOT_FOUND") throw error;
      // A delegated run's member gets its delegator's catalog copy at that address, as base's hosted copy did (CR-461-041).
      let fromDelegator: LocalDelegationPlacement | null;
      try {
        fromDelegator = await this.dependencies.delegatorCatalog.placementAt({ senderRun: input.senderRun, senderAgentRunId: input.sender.agentRunId,
          address: input.spawn.recipient_address, work: work.delegation, folder });
      } catch (cause) {
        if ((cause as { code?: unknown } | null)?.code === "COLLABORATION_TARGET_NOT_FOUND") return { delegated: false, message: message(cause) };
        throw cause;
      }
      if (!fromDelegator) return { delegated: false, message: message(error) };
      placement = fromDelegator;
    }
    const delegatedFrom = { delegatingRun: input.senderRun, delegatorAgentRunId: input.sender.agentRunId };
    const runOrigin = { delegatingRun: { kind: input.senderRun.rootSubjectKind, runId: input.senderRun.rootRunId }, delegatorAgentRunId: input.sender.agentRunId };
    // 3. The run, inert.
    let delegatedRun: DelegatedRun, execution: TaskExecutionReference;
    try {
      if (placement.kind === "agent") {
        const started = await this.dependencies.starter.startAgent({ source: placement.source, address: placement.address, delegatedFrom: runOrigin });
        delegatedRun = { kind: "agent", agentRunId: started.agentRunId };
        execution = { agentRunId: started.agentRunId };
      } else {
        const started = await this.dependencies.starter.startTeam({ source: placement.source, address: placement.address, delegatedFrom: runOrigin });
        delegatedRun = { kind: "team", teamRunId: started.teamRunId, teamCoordinatorAgentRunId: started.coordinatorAgentRunId };
        execution = { teamRunId: started.teamRunId };
      }
    } catch (error) {
      if (error instanceof DelegatedRunStartError) return { delegated: false, message: error.message };
      throw error;
    }
    // 4. The Task entry: the one record of the delegation on this node.
    let link: { taskId: string };
    try {
      link = await tasks.linkNewTaskExecution({
        ...(work.join.role === "subWork" ? { role: "subWork" as const } : "taskId" in work.join
          ? { role: "assigned" as const, taskId: work.join.taskId } : { role: "assigned" as const, adHocTask: work.join.adHocTask }),
        recipientAddress: placement.address,
        delegatedFrom, execution,
        ...(delegatedRun.kind === "team" ? { teamCoordinatorAgentRunId: delegatedRun.teamCoordinatorAgentRunId } : {}),
      } as Parameters<TaskExecutionResourcePort["linkNewTaskExecution"]>[0]);
    } catch (error) {
      await this.dependencies.discard(execution).catch((discardError) => console.warn("DELEGATED_RUN_DISCARD_FAILED", { execution, error: message(discardError) }));
      const refusal = asRefusal(error);
      if (refusal) return refusal;
      throw error;
    }
    await this.recordCollaborating(input);
    // A Task closed during the start (design "Ordering Without A Shared Queue"): the new run is not started.
    if (!tasks.isOpen(execution)) {
      await this.dependencies.discard(execution).catch((error) => console.warn("DELEGATED_RUN_DISCARD_FAILED", { execution, error: message(error) }));
      return { delegated: false, message: CLOSED_DURING_START };
    }
    // 5. The work packet starts the run in its own root. Its sender address is the one the new run can reach the sender
    // by (§2.5), read once its Task entry and the sender's own address are recorded.
    const run = delegatedRun.kind === "agent" ? { rootSubjectKind: "agent" as const, rootRunId: delegatedRun.agentRunId } : { rootSubjectKind: "agent_team" as const, rootRunId: delegatedRun.teamRunId };
    let delivered: AgentOperationResult;
    try {
      const delegatorAddress = await this.dependencies.reachingAddress(input.sender, run) as AgentTeamAddress | null;
      delivered = await this.dependencies.deliverWorkPacket(run, { delegator: input.sender, delegatorAddress,
        description: work.description, comments: work.comments, ...(work.task ? { task: work.task } : {}), referenceFiles: work.referenceFiles,
        assertAllowed: () => { if (!tasks.isOpen(execution)) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", CLOSED_DURING_START); } });
    } catch (error) {
      delivered = { accepted: false, code: "TASK_WORK_NOT_DELIVERED", message: message(error) };
    }
    // A closure that committed after the check above, seen at the head of the new run's gate: nothing started.
    if (!delivered.accepted && delivered.code === "TASK_AGENT_RESOURCE_CLOSED") {
      await this.dependencies.discard(execution).catch((error) => console.warn("DELEGATED_RUN_DISCARD_FAILED", { execution, error: message(error) }));
      return { delegated: false, message: CLOSED_DURING_START };
    }
    if (!delivered.accepted) {
      const reason = delivered.message ?? delivered.code ?? "The work was not delivered.";
      await tasks.markFailed(execution, { code: TASK_DISPATCH_FAILED, message: reason });
      await this.dependencies.discard(execution).catch((error) => console.warn("DELEGATED_RUN_DISCARD_FAILED", { execution, error: message(error) }));
      return { delegated: false, message: reason };
    }
    await tasks.markStarted(execution);
    if (placement.routingDecision) await this.recordRoutingDecision(placement, input.sender, { ...work.delegation.task, taskId: work.delegation.task.taskId ?? link.taskId });
    const createdTaskId = work.join.role === "assigned" && "adHocTask" in work.join ? link.taskId : null;
    return { delegated: true, delegatedRun, ...(createdTaskId ? { taskId: createdTaskId } : {}),
      ...(placement.launchNotes?.length ? { launchNotes: placement.launchNotes } : {}) };
  }

  private async recordCollaborating(input: Readonly<{ sender: CollaborationMemberExecutionIdentity; senderRun: RootExecutionIdentity }>): Promise<void> {
    if (input.senderRun.rootSubjectKind === "agent") await this.dependencies.recordCollaborating(input.senderRun.rootRunId, input.sender.memberAddress);
  }

  /**
   * An ID of the other kind names the field to use, and a team run's coordinator names the team's run ID (base's
   * refusals, REQ-009); `null` otherwise, a team's member included, which gets base's "not one of your task agents" (SR-071).
   */
  private async wrongRunId(execution: TaskExecutionReference): Promise<TaskDelegationError | null> {
    const tree = this.dependencies.tree();
    const refuse = (text: string) => new TaskDelegationError("TASK_DELEGATED_RUN_NOT_ASSIGNABLE", text);
    if ("teamRunId" in execution) {
      const id = execution.teamRunId;
      return tree.tasksOf({ agentRunId: id }).length ? refuse(`${id} is a task agent's run id; use target_agent_run_id "${id}".`) : null;
    }
    const id = execution.agentRunId;
    if (tree.tasksOf({ teamRunId: id }).length) return refuse(`${id} is a task agent team's run id; use target_team_run_id "${id}".`);
    const run = await tree.runOfAgent(id);
    if (run?.rootSubjectKind !== "agent_team") return null;
    const entries = tree.tasksOf({ teamRunId: run.rootRunId });
    if (!entries.length) return null;
    return entries.some((entry) => entry.entryAgentRunId === id)
      ? refuse(`${id} is the coordinator of task agent team ${run.rootRunId}; use target_team_run_id "${run.rootRunId}".`)
      : null;
  }

  /**
   * A run no Task names, given a new Task by run ID (SR-072 F-24): the delegation its own file records, when the sender
   * is that delegator; base's refusals otherwise (an ID of the other kind, or "not one of your task agents").
   */
  private async ownDelegationFor(execution: TaskExecutionReference, senderAgentRunId: string): Promise<RunOwnDelegation> {
    const wrong = await this.wrongRunId(execution);
    if (wrong) throw wrong;
    const own = await this.dependencies.ownDelegations.of(execution);
    if (!own || own.delegatedFrom.delegatorAgentRunId !== senderAgentRunId) throw notADelegatedRunOfThisRun(execution);
    return own;
  }

  /**
   * `delegate_task` with a run's own ID and `task_id` (DS-6, `model.py` `delegate_existing`): a follow-up Task for a run
   * the sender assigned. The saved Task first (its refusals come before the run's), then the run: one this node's Task
   * records name (a peer's run takes no saved Task); the Task side checks the sender is its last assigner and the
   * conditions, and appends the run's new `assigned` entry (the same `delegatedFrom` and address). The Task's work is
   * then delivered as a `task_assignment` message between the two runs (both logs; the run woken or restored).
   */
  async toExistingRun(input: Readonly<{ sender: CollaborationMemberExecutionIdentity; senderRun: RootExecutionIdentity; assign: AssignToExistingDelegatedRunInput }>): Promise<TaskDelegationOutcome> {
    const tasks = this.dependencies.tasks();
    const senderReference = runReferenceOf(input.senderRun);
    let taskId: string, content: string, referenceFiles: readonly string[], entryAgentRunId: string, taskReference: string;
    const execution = input.assign.delegatedRun;
    try {
      if (senderReference && this.dependencies.tree().currentTaskOf(senderReference)) {
        throw new TaskDelegationError("TASK_AGENT_RESOURCE_OWNED_SENDER", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.");
      }
      const saved = await tasks.resolveAssignment(requireTaskString(input.assign.taskId, "task_id"));
      ({ taskId, taskReference } = saved);
      const entries = this.dependencies.tree().tasksOf(execution);
      if (entries.some((entry) => entry.nodeId !== undefined)) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.savedTask };
      const current = [...entries].sort((a, b) => a.linkedAt.localeCompare(b.linkedAt)).at(-1);
      // A run no Task names any more is its delegator's, by its own file (SR-072 F-24, U11), as base accepted it.
      const own: RunOwnDelegation | null = current ? null : await this.ownDelegationFor(execution, input.sender.agentRunId);
      // A run of another tree was never among the sender's task agents (base hosted it in another root): base's text,
      // before the Task side's assigner check (CR-461-049, SR-071).
      const tree = this.dependencies.tree();
      if (current && !sameRootExecutionIdentity(tree.topOf(runIdentityOf(execution)), tree.topOf(input.senderRun))) throw notADelegatedRunOfThisRun(execution);
      const last = current ?? own!;
      entryAgentRunId = last.entryAgentRunId;
      referenceFiles = await validateTaskReferenceFiles(saved.referenceFiles);
      await tasks.assertAssignable({ execution, requestedBy: input.sender.agentRunId, taskId, ...(own ? { ownDelegatorAgentRunId: own.delegatedFrom.delegatorAgentRunId } : {}) });
      // As base: a run that cannot be restored is refused before anything changes (CR-461-043).
      const conversation = await this.dependencies.conversationOf(execution, { agentRunId: entryAgentRunId, address: last.recipientAddress });
      if (conversation.activity.kind !== "present") {
        throw taskExecutionConversationUnavailable({ execution, address: last.recipientAddress, entryAddress: conversation.entryAddress, activity: conversation.activity });
      }
      const otherOpenTaskReferences = await tasks.openTaskReferencesOf(execution, taskId);
      // The new entry repeats the run's delegation: its last entry's, or its own file's with its own address (U11).
      await tasks.assignExistingTaskExecution({ delegatedFrom: own?.delegatedFrom ?? { delegatingRun: input.senderRun, delegatorAgentRunId: input.sender.agentRunId },
        execution, taskId, ...(own ? { recipientAddress: own.recipientAddress } : {}),
        ...("teamRunId" in execution ? { teamCoordinatorAgentRunId: entryAgentRunId } : {}) });
      content = buildExistingDelegatedRunTaskMessage({ taskReference, projectId: saved.projectId, description: saved.description, comments: saved.comments, otherOpenTaskReferences });
    } catch (error) {
      const refusal = asRunIdRefusal(error);
      if (refusal) return refusal;
      throw error;
    }
    let delivered: AgentOperationResult | null;
    try {
      delivered = await this.dependencies.deliverToRun({ sender: input.sender, senderDisplayName: getAgentTeamAddressBasename(input.sender.memberAddress) ?? input.sender.agentRunId,
        targetAgentRunId: entryAgentRunId, content, messageType: TASK_ASSIGNMENT_MESSAGE_TYPE, referenceFiles });
    } catch (error) {
      delivered = { accepted: false, code: "TASK_WORK_NOT_DELIVERED", message: message(error) };
    }
    if (!delivered?.accepted) {
      const reason = delivered?.message ?? delivered?.code ?? "delivery was not accepted";
      await tasks.markFailed(execution, { code: delivered?.code ?? "TASK_WORK_NOT_DELIVERED", message: reason });
      return { delegated: false, message: `Task ${taskReference} was given to the task agent, but the message with its work was not delivered (${reason}). `
        + `Message the task agent's run id ${entryAgentRunId}, or set Task ${taskReference} to CANCELLED, or delegate it to a new task agent.` };
    }
    await tasks.markStarted(execution);
    return { delegated: true, delegatedRun: "agentRunId" in execution ? { kind: "agent", agentRunId: execution.agentRunId }
      : { kind: "team", teamRunId: execution.teamRunId, teamCoordinatorAgentRunId: entryAgentRunId } };
  }

  /** Step 1 (DS-1): the work and how the new run joins a Task, from the sender's own run's Task work (the tree). */
  private async prepareWork(senderRun: RootExecutionIdentity, spawn: SpawnTaskInput): Promise<NewRunWork> {
    const tasks = this.dependencies.tasks();
    const linked = Object.prototype.hasOwnProperty.call(spawn, "task_id");
    const allowed = linked ? ["recipient_address", "task_id"] : ["recipient_address", "description", "reference_files"];
    if (Object.keys(spawn).some((key) => !allowed.includes(key))) throw new TaskDelegationError("VALIDATION_ERROR", "Delegation accepts exactly one work source.");
    const senderReference = runReferenceOf(senderRun);
    const current = senderReference ? this.dependencies.tree().currentTaskOf(senderReference) : null;
    if (linked) {
      if (current) throw new TaskDelegationError("TASK_AGENT_RESOURCE_OWNED_SENDER", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.");
      const saved = await tasks.resolveAssignment(requireTaskString(spawn.task_id, "task_id"));
      return {
        description: saved.description, comments: saved.comments, task: { taskKey: saved.taskReference, projectId: saved.projectId },
        referenceFiles: await validateTaskReferenceFiles(saved.referenceFiles), join: { role: "assigned", taskId: saved.taskId },
        delegation: { text: workText(saved.description, saved.comments), task: { taskId: saved.taskId, taskKey: saved.taskReference, projectId: saved.projectId, title: saved.title } },
      };
    }
    if (current && !current.open) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "Your Task is DONE or CANCELLED, so you can't start new work.");
    // A run no Task names could not be told apart from an unreadable Task's work: refuse before any planning.
    if (!current) tasks.assertResourceDataReadable();
    const description = requireTaskString(spawn.description, "description");
    const referenceFiles = await validateTaskReferenceFiles(spawn.reference_files ?? []);
    if (current) {
      const identity = await tasks.describeTask(current.taskId);
      return { description, comments: [], referenceFiles, join: { role: "subWork" }, delegation: { text: description, task: { taskId: current.taskId, ...identity } } };
    }
    return { description, comments: [], referenceFiles, join: { role: "assigned", adHocTask: { description, referenceFiles } },
      delegation: { text: description, task: { taskId: null, taskKey: null, projectId: null, title: firstLineOf(description) } } };
  }

  /** The new run's decision records (REQ-012); recording never fails the delegation. */
  private async recordRoutingDecision(placement: LocalDelegationPlacement, sender: CollaborationMemberExecutionIdentity,
    task: DelegationWork["task"] & { taskId: string }): Promise<void> {
    const recorder = findRoutingDecisionRecorder();
    if (!recorder || !placement.routingDecision) return;
    try {
      await recorder.record(decisionRecordsOf(placement.routingDecision, { recordedAt: new Date().toISOString(), task,
        delegatingRunId: sender.agentRunId, delegatingAgentName: getAgentTeamAddressBasename(sender.memberAddress), fromNode: null }));
    } catch (error) {
      console.warn(`Model Routing: the decisions for the run at ${placement.routingDecision.copyAddress} could not be recorded: ${message(error)}`);
    }
  }
}
