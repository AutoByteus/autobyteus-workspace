import type { RemoteTaskExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";
import type { TaskAgentCoordinatingRun } from "../../../run-history/store/agent-run-metadata-types.js";
import { assertAgentTeamAddress } from "../../domain/agent-team-address.js";
import type { RemoteAgentPlacement } from "../../collaborators/catalog-delegation.js";
import type { DelegationWork } from "../../../model-routing/domain/model-routing-types.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type {
  TaskExecutionActivationCommitResult,
  TaskExecutionActivationOperation,
  TaskExecutionActivationPlan,
  TaskExecutionActivationPreparation,
} from "../task/root-task-execution-adapter.js";
import type { SpawnTaskInput, TaskDelegationOutcome } from "../task/task-delegation-command.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import {
  resolveRemoteRunChannel, type RemoteAgentLaunch, type RemoteRunChannel, type RemoteStartedRun, type RemoteTargetRoot,
} from "./remote-run-channel.js";
import { launchNotesOf } from "../../collaborators/launch-configuration-notes.js";
import { getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import { beginRemoteTaskActivation } from "./remote-task-activation.js";

/** Notes for a peer's launches: one line per agent the peer's Model Router chose for, one per skipped layer. */
const remoteLaunchNotes = (launches: readonly RemoteAgentLaunch[]): string[] => launchNotesOf(launches.map((launch) => ({
  name: getAgentTeamAddressBasename(launch.address) ?? launch.address,
  subject: "agent" as const,
  launch: { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier },
  source: launch.source,
})));

/** A remote placement before its work is prepared: the peer and the address there. */
export type RemotePlacementTarget = Omit<RemoteAgentPlacement, "work">;

/** The remote placement for `target` with the prepared work. */
export const remotePlacementWith = (target: RemotePlacementTarget, work: DelegationWork): RemoteAgentPlacement =>
  Object.freeze({ ...target, work });

/** A refusal before the Task link (by this node's channel or by the peer): nothing is left on this node. */
export class RemoteDelegationRefusedError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "RemoteDelegationRefusedError";
  }
}

/**
 * A root's remote delegations (DS-001): placement, planning and activation, apart from messaging. Each root
 * holds one; its task adapter's `planActivation` / `beginActivation` hand a remote placement to it, so it is
 * the one caller of `startDelegatedRun` (N-13). The root's unchanged `RootTaskExecutionLifecycle` runs it.
 */
export class RemoteDelegation {
  /** A started Team's answer, from planning (its run ID is the plan's target) until its activation records the link. */
  private readonly startedTeams = new Map<string, Extract<RemoteStartedRun, { kind: "agent_team" }>>();
  /** The launches the peer resolved, by the run ID it started, from planning until the link records them (REQ-009). */
  private readonly startedLaunches = new Map<string, readonly RemoteAgentLaunch[]>();

  constructor(private readonly options: Readonly<{
    root: RootExecutionIdentity;
    channel?(): RemoteRunChannel | null;
  }>) {}

  /**
   * `delegate_task` with `node` (DEC-111): refuses a saved Task or files before anything is sent (REQ-110),
   * resolves the peer by this owner's label, and returns the remote placement for the root's lifecycle.
   */
  async delegationPlacement(input: SpawnTaskInput & Readonly<{ node: string }>): Promise<RemotePlacementTarget | TaskDelegationOutcome> {
    if (input.task_id !== undefined) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.savedTask };
    if (input.reference_files?.some((file) => file.trim())) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.attachments };
    const channel = this.channel();
    if (!channel) return { delegated: false, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const peer = await channel.findPeer(input.node);
    if ("accepted" in peer) return { delegated: false, message: peer.message };
    let address;
    try { address = assertAgentTeamAddress(input.recipient_address.trim()); }
    catch { return { delegated: false, message: `"${input.recipient_address}" is not an address: an Agent's address begins with '/'.` }; }
    return Object.freeze({ kind: "remote_agent", address, peer, description: input.description });
  }

  /**
   * `delegate_task` with `node`: the peer and address, then the root's lifecycle with the input without `node` (it
   * prepares the work and dispatches the remote placement with it). A delegated result names the peer (CM-11).
   */
  async delegate(
    input: SpawnTaskInput & Readonly<{ node: string }>,
    delegateWith: (input: SpawnTaskInput, target: RemotePlacementTarget) => Promise<TaskDelegationOutcome>,
  ): Promise<TaskDelegationOutcome> {
    const placement = await this.delegationPlacement(input);
    if (!("kind" in placement)) return placement;
    const { node: _node, ...local } = input;
    const outcome = await delegateWith(local as SpawnTaskInput, placement);
    if (!outcome.delegated) return outcome;
    // The peer's launches (REQ-009): a line per routed agent and per skipped layer, as for a copy on this node.
    const runId = outcome.copy.kind === "agent" ? outcome.copy.agentRunId : outcome.copy.teamRunId;
    const notes = remoteLaunchNotes(this.startedLaunches.get(runId) ?? []);
    this.startedLaunches.delete(runId);
    return { ...outcome, node: placement.peer.name, ...(notes.length ? { launchNotes: notes } : {}) };
  }

  /**
   * Planning asks the peer to create the run, without work (SR-014): the peer's run ID becomes the plan's
   * target before the lifecycle links the Task. A refusal throws, so nothing is left on this node.
   */
  async planActivation<TPlacement>(input: TaskExecutionActivationPreparation<TPlacement>, placement: RemoteAgentPlacement): Promise<TaskExecutionActivationPlan<TPlacement>> {
    const channel = this.channel();
    if (!channel) throw new RemoteDelegationRefusedError(REMOTE_REFUSAL.OFF, REMOTE_ROOT_REFUSAL_TEXT.off);
    const started = await channel.startDelegatedRun({
      nodeId: placement.peer.nodeId,
      address: placement.address,
      delegatorAgentRunId: input.identity.agentRunId,
      coordinatingRun: this.coordinatingRun(),
      work: placement.work,
    });
    if (!started.accepted) throw new RemoteDelegationRefusedError(started.code, started.message);
    this.startedLaunches.set(started.kind === "agent" ? started.agentRunId : started.teamRunId, started.launches);
    const plan = (execution: TaskExecutionReference, ingressAgentRunId: string): TaskExecutionActivationPlan<TPlacement> => Object.freeze({
      ...input, ownedAgentRunIds: Object.freeze([]), recipientAddress: placement.address,
      target: Object.freeze({ root: this.options.root, execution, ingressAgentRunId }),
    });
    if (started.kind === "agent") return plan(Object.freeze({ agentRunId: started.agentRunId }), started.agentRunId);
    // A Team (G-7): the Task's run is the Team, entered through its coordinator; the members are held until activation.
    const coordinator = started.members.find((member) => member.address === started.coordinatorAddress)!;
    this.startedTeams.set(started.teamRunId, started);
    return plan(Object.freeze({ teamRunId: started.teamRunId }), coordinator.agentRunId);
  }

  /** The remote activation of a planned remote delegation; `commitLink` is the root's one atomic tree write. */
  beginActivation<TPlacement>(
    plan: TaskExecutionActivationPlan<TPlacement>,
    placement: RemoteAgentPlacement,
    commitLink: (link: RemoteTaskExecution) => Promise<TaskExecutionActivationCommitResult>,
  ): TaskExecutionActivationOperation {
    const link = this.linkOf(plan, placement);
    // The work packet goes to the Agent run, or to the Team run's coordinator, named with its root (G-2).
    const targetRoot: RemoteTargetRoot = link.kind === "agent"
      ? Object.freeze({ kind: "agent", runId: link.agentRunId })
      : Object.freeze({ kind: "agent_team", runId: link.teamRunId });
    return beginRemoteTaskActivation({
      link,
      ingressAgentRunId: plan.target.ingressAgentRunId,
      commitLink,
      sendWorkPacket: async () => {
        const channel = this.channel();
        if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
        return channel.deliverMessage({
          nodeId: link.nodeId, kind: "work_packet", senderAgentRunId: link.delegatorAgentRunId,
          targetRoot, targetAgentRunId: plan.target.ingressAgentRunId,
          content: placement.description, messageType: "task_work_packet", createdAt: plan.startedAt,
        });
      },
    });
  }

  /** The link the activation records: an Agent link, or a Team link with the coordinator and members planning got. */
  private linkOf<TPlacement>(plan: TaskExecutionActivationPlan<TPlacement>, placement: RemoteAgentPlacement): RemoteTaskExecution {
    const launches = this.startedLaunches.get("agentRunId" in plan.target.execution ? plan.target.execution.agentRunId : plan.target.execution.teamRunId);
    const common = { address: placement.address, nodeId: placement.peer.nodeId, delegatorAgentRunId: plan.identity.agentRunId, startedAt: plan.startedAt,
      ...(launches?.length ? { launches } : {}) };
    const execution = plan.target.execution;
    if ("agentRunId" in execution) return Object.freeze({ kind: "agent", ...common, agentRunId: execution.agentRunId });
    const started = this.startedTeams.get(execution.teamRunId);
    if (!started) throw new Error(`Remote Team run '${execution.teamRunId}' was not planned by this node.`);
    this.startedTeams.delete(execution.teamRunId);
    return Object.freeze({
      kind: "agent_team", ...common, teamRunId: started.teamRunId,
      coordinatorAddress: assertAgentTeamAddress(started.coordinatorAddress),
      members: Object.freeze(started.members.map((member) => Object.freeze({ address: assertAgentTeamAddress(member.address), agentRunId: member.agentRunId }))),
    });
  }

  /** This root as the coordinating run a peer names on its side of a link (CM-7). */
  private coordinatingRun(): TaskAgentCoordinatingRun {
    return Object.freeze({ kind: this.options.root.rootSubjectKind, runId: this.options.root.rootRunId });
  }

  private channel(): RemoteRunChannel | null {
    return resolveRemoteRunChannel(this.options.channel);
  }
}
