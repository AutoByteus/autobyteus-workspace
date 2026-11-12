import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { DelegatedChild, DelegationIndex } from "../../delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { PairedAgentAccess, PairedAgentObservation } from "../remote/paired-agent-access.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";

/**
 * A view's live facts about the runs on this node its run delegated to (design DS-8: "a local child's status and live
 * output reach the view the way a remote child's do"): a child agent's output, which the view projectors turn into the
 * streams' `agent_presentation` (the N-402 path of a remote child). The rows themselves come from `ChildRowsFeed`.
 */
export type LocalChildRootEvent =
  Readonly<{ kind: "local_child_presentation"; agentRunId: string; memberAddress: string; message: AgentPresentationMessage }>;

/** What a view needs of its local children; created by the composition root (SR-047 step 7). */
export type LocalChildPorts = Readonly<{
  tree: Pick<DelegationIndex, "collaborationTreeOf" | "subscribe" | "agentsOf">;
  /** A run's own agents' output and live statuses (an agent run's agent; a team run's members). */
  agents(kind: "agent" | "agent_team"): Pick<PairedAgentAccess, "observePairedAgents" | "pairedAgentStatuses">;
}>;

/** One agent of a run's local child, as the history poll names it: its address in the view, and its live status. */
export type LocalChildAgentStatus = Readonly<{ agentRunId: string; memberAddress: string; status: string }>;

/**
 * Every agent of a run's open local rows (its open subtree, CR-461-033) with its live status, `offline` when not running (SR-040: the history
 * poll's answer, the same projection as the view's rows). Addresses come from the `DelegationIndex`'s per-run agents
 * (read once from each run's own file), statuses from each child's own root; nothing is started or restored.
 */
export const localChildStatuses = async (run: RootExecutionIdentity, ports: LocalChildPorts): Promise<LocalChildAgentStatus[]> => {
  const tree = ports.tree;
  const statuses: LocalChildAgentStatus[] = [];
  // Every local row under the run, at every depth (CR-461-033).
  for (const child of tree.collaborationTreeOf(run).rows().filter((candidate) => candidate.nodeId === undefined)) {
    const kind = "agentRunId" in child.run ? "agent" : "agent_team";
    const childRun = "agentRunId" in child.run ? { rootSubjectKind: "agent" as const, rootRunId: child.run.agentRunId }
      : { rootSubjectKind: "agent_team" as const, rootRunId: child.run.teamRunId };
    const live = new Map(ports.agents(kind).pairedAgentStatuses(childRun.rootRunId).map((entry) => [entry.agentRunId, entry.status as string]));
    for (const agent of await tree.agentsOf(childRun)) {
      if (agent.address) statuses.push({ agentRunId: agent.agentRunId, memberAddress: agent.address, status: live.get(agent.agentRunId) ?? "offline" });
    }
  }
  return statuses;
};

const keyOf = (run: TaskExecutionReference): string => "agentRunId" in run ? `agent:${run.agentRunId}` : `team:${run.teamRunId}`;
const childRunOf = (run: TaskExecutionReference): RootExecutionIdentity => "agentRunId" in run
  ? { rootSubjectKind: "agent", rootRunId: run.agentRunId } : { rootSubjectKind: "agent_team", rootRunId: run.teamRunId };
const statusFrame = (status: string): AgentPresentationMessage => ({ type: "AGENT_STATUS", payload: {
  status, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
} } as AgentPresentationMessage);

type Followed = { child: DelegatedChild; observation: PairedAgentObservation | null; closed: boolean };

/**
 * One run's view of its local children while someone views it (as `RemoteRunObservation` for its peer children): the
 * first viewer follows each open child (its agents' current statuses, then their live output); a delegation or a
 * Task change re-reads the run's children from the `DelegationIndex`, following new ones and leaving gone ones; the last
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
    ports: LocalChildPorts;
  }>) {}

  viewerAttached(): void {
    if (this.disposed || ++this.viewers > 1) return;
    this.unsubscribeTree = this.options.ports.tree.subscribe(() => { queueMicrotask(() => { void this.refresh(); }); });
    void this.refresh();
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

  /** Follows the run's open local children: a new one is followed, a gone one left. */
  private async refresh(): Promise<void> {
    const ports = this.options.ports;
    const tree = ports.tree;
    if (this.disposed || this.viewers === 0) return;
    const current = tree.collaborationTreeOf(this.options.run).rows().filter((child) => child.nodeId === undefined);
    const keys = new Set(current.map((child) => keyOf(child.run)));
    for (const [key, entry] of [...this.followed.entries()].filter(([candidate]) => !keys.has(candidate))) { this.close(entry); this.followed.delete(key); }
    for (const child of current) {
      const key = keyOf(child.run);
      if (this.followed.has(key)) continue;
      const entry: Followed = { child, observation: null, closed: false };
      this.followed.set(key, entry);
      await this.follow(ports, tree, entry);
    }
  }

  private async follow(ports: LocalChildPorts, tree: LocalChildPorts["tree"], entry: Followed): Promise<void> {
    const childRun = childRunOf(entry.child.run);
    // Each agent's address as the view's row has it (SR-041: the tree's per-run agents, read once).
    const addresses = new Map((await tree.agentsOf(childRun)).flatMap((agent) => agent.address ? [[agent.agentRunId, agent.address] as [string, string]] : []));
    if (entry.closed) return;
    const kind = childRun.rootSubjectKind === "agent" ? "agent" : "agent_team";
    const runId = childRun.rootRunId;
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
}
