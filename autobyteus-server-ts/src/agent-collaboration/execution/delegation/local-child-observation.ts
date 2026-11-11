import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import type { DelegatedChild, DelegationTree } from "../../delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { PairedAgentAccess, PairedAgentObservation } from "../remote/paired-agent-access.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";

/**
 * A view's facts about the runs on this node its run delegated to (design DS-8: "a local child's status and live output
 * reach the view the way a remote child's do"). The view projectors turn them into the streams' existing messages: a new
 * row (`task_execution_started`), rows that left (`task_executions_closed`), and a child agent's output
 * (`agent_presentation`, the N-402 path of a remote child).
 */
export type LocalChildRootEvent =
  | Readonly<{ kind: "local_child_started"; row: CollaborationTaskExecutionDto }>
  | Readonly<{ kind: "local_children_closed"; runs: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "local_child_presentation"; agentRunId: string; memberAddress: string; message: AgentPresentationMessage }>;

/** What a view needs of its local children; bound once by the composition (`composeTaskDelegation`). */
export type LocalChildPorts = Readonly<{
  tree(): Pick<DelegationTree, "openChildrenOf" | "subscribe"> | null;
  /** A child's row, from its own file; `null` when its file cannot be read. */
  rowOf(child: DelegatedChild): Promise<CollaborationTaskExecutionDto | null>;
  /** A run's own agents' output and live statuses (an agent run's agent; a team run's members). */
  agents(kind: "agent" | "agent_team"): Pick<PairedAgentAccess, "observePairedAgents" | "pairedAgentStatuses">;
}>;

let bound: LocalChildPorts | null = null;
export const bindLocalChildPorts = (ports: LocalChildPorts): void => { bound = ports; };
export const unbindLocalChildPorts = (ports: LocalChildPorts): void => { if (bound === ports) bound = null; };

const keyOf = (run: TaskExecutionReference): string => "agentRunId" in run ? `agent:${run.agentRunId}` : `team:${run.teamRunId}`;
const statusFrame = (status: string): AgentPresentationMessage => ({ type: "AGENT_STATUS", payload: {
  status, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
} } as AgentPresentationMessage);

type Followed = { child: DelegatedChild; observation: PairedAgentObservation | null; closed: boolean };

/**
 * One run's view of its local children while someone views it (as `RemoteRunObservation` for its peer children): the
 * first viewer follows each open child (its agents' current statuses, then their live output); a delegation or a
 * Task change re-reads the run's children from the `DelegationTree` and announces new rows and rows that left; the last
 * viewer stops following. Nothing is started, woken or stored.
 */
export class LocalChildObservation {
  private viewers = 0;
  private disposed = false;
  private readonly followed = new Map<string, Followed>();
  private unsubscribeTree: (() => void) | null = null;

  constructor(private readonly options: Readonly<{
    run: RootExecutionIdentity;
    publish(event: LocalChildRootEvent): void;
    ports?: () => LocalChildPorts | null;
  }>) {}

  viewerAttached(): void {
    if (this.disposed || ++this.viewers > 1) return;
    this.unsubscribeTree = this.ports()?.tree()?.subscribe(() => { queueMicrotask(() => { void this.refresh(true); }); }) ?? null;
    void this.refresh(false);
  }

  viewerDetached(): void {
    if (this.disposed || this.viewers === 0 || --this.viewers > 0) return;
    this.stopFollowing();
  }

  dispose(): void {
    this.disposed = true;
    this.viewers = 0;
    this.stopFollowing();
  }

  /** Follows the run's open local children; with `announce`, a new one is published as a row and a gone one as closed. */
  private async refresh(announce: boolean): Promise<void> {
    const ports = this.ports();
    if (!ports || this.disposed || this.viewers === 0) return;
    const current = (ports.tree()?.openChildrenOf(this.options.run) ?? []).filter((child) => child.nodeId === undefined);
    const keys = new Set(current.map((child) => keyOf(child.run)));
    const gone = [...this.followed.entries()].filter(([key]) => !keys.has(key));
    for (const [key, entry] of gone) { this.close(entry); this.followed.delete(key); }
    if (announce && gone.length) this.options.publish({ kind: "local_children_closed", runs: gone.map(([, entry]) => entry.child.run) });
    for (const child of current) {
      const key = keyOf(child.run);
      if (this.followed.has(key)) continue;
      const entry: Followed = { child, observation: null, closed: false };
      this.followed.set(key, entry);
      await this.follow(ports, entry, announce);
    }
  }

  private async follow(ports: LocalChildPorts, entry: Followed, announce: boolean): Promise<void> {
    const { child } = entry;
    let row: CollaborationTaskExecutionDto | null = null;
    try { row = await ports.rowOf(child); } catch (error) { console.warn(`A delegated run's row could not be read: ${String(error)}`); }
    if (!row || entry.closed) return;
    if (announce) this.options.publish({ kind: "local_child_started", row });
    const addresses = new Map<string, string>("agentRunId" in row
      ? [[row.agentRunId, row.address]] : row.members.map((member) => [member.agentRunId, member.address] as [string, string]));
    const kind = "agentRunId" in child.run ? "agent" : "agent_team";
    const runId = "agentRunId" in child.run ? child.run.agentRunId : child.run.teamRunId;
    const access = ports.agents(kind);
    const present = (agentRunId: string, message: AgentPresentationMessage): void => {
      const memberAddress = addresses.get(agentRunId);
      if (memberAddress && !entry.closed && !this.disposed) this.options.publish({ kind: "local_child_presentation", agentRunId, memberAddress, message });
    };
    for (const live of access.pairedAgentStatuses(runId)) present(live.agentRunId, statusFrame(live.status));
    try {
      const observation = await access.observePairedAgents(runId, present, () => { entry.observation = null; });
      if (entry.closed) observation?.close();
      else entry.observation = observation;
    } catch (error) {
      console.warn(`A delegated run's output could not be followed: ${String(error)}`);
    }
  }

  private close(entry: Followed): void {
    entry.closed = true;
    entry.observation?.close();
    entry.observation = null;
  }

  private stopFollowing(): void {
    this.unsubscribeTree?.();
    this.unsubscribeTree = null;
    for (const entry of this.followed.values()) this.close(entry);
    this.followed.clear();
  }

  private ports(): LocalChildPorts | null {
    return this.options.ports ? this.options.ports() : bound;
  }
}
