import type { AgentPresentationMessage, RemoteAgentStatus } from "@autobyteus/agent-presentation-contracts";
import {
  remoteTaskExecutionRunId,
  type RemoteTaskExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import {
  resolveRemoteRunChannel,
  type RemoteRunChannel,
  type RemoteRunObservationStream,
  type RemoteTargetRoot,
} from "./remote-run-channel.js";

/** A remote link with this owner's label for its node, as a root view lists it. */
export type RemoteTaskExecutionView = RemoteTaskExecution & Readonly<{ nodeName: string }>;

/** What a remote run's node answered about it; `reachable: false` when it did not answer (no title, no status). */
export type RemoteRunSummaryEvent = Readonly<{
  nodeId: string;
  runId: string;
  reachable: boolean;
  title: string | null;
  statuses: readonly Readonly<{ agentRunId: string; status: RemoteAgentStatus }>[];
}>;

/**
 * The root events a root's remote children produce (autobyteus-278). Each root publishes them on its own event
 * stream; only its DTO projector reads them, and `remote_agent_presentation` becomes the stream's
 * `agent_presentation` there and nowhere else (N-402): no server consumer treats a peer's output as a local agent's.
 */
export type RemoteRunRootEvent =
  | Readonly<{ kind: "remote_task_execution_started"; execution: RemoteTaskExecutionView }>
  | Readonly<{ kind: "remote_task_execution_summary"; summary: RemoteRunSummaryEvent }>
  | Readonly<{
      kind: "remote_agent_presentation";
      nodeId: string;
      agentRunId: string;
      /** The agent's address under this root, from the stored link (AR-402). */
      memberAddress: string;
      message: AgentPresentationMessage;
    }>;

/** The root a remote link names on its node: the Agent run, or the Team run. */
export const remoteTargetRootOf = (link: RemoteTaskExecution): RemoteTargetRoot =>
  Object.freeze({ kind: link.kind, runId: remoteTaskExecutionRunId(link) });

/** The agent's address under this root, by its run ID on the link (the Agent run, or a Team member); `null` otherwise. */
export const remoteAgentAddressOf = (link: RemoteTaskExecution, agentRunId: string): string | null => link.kind === "agent"
  ? (link.agentRunId === agentRunId ? link.address : null)
  : link.members.find((member) => member.agentRunId === agentRunId)?.address ?? null;

/** The remote link that has this agent run (an Agent run, or a Team member); `null` for a local agent. */
export const remoteChildLinkOf = (links: readonly RemoteTaskExecution[], agentRunId: string): RemoteTaskExecution | null =>
  links.find((link) => remoteAgentAddressOf(link, agentRunId) !== null) ?? null;

/** A root's remote links with their node names, in delegation order (the root views list them). */
export const describeRemoteTaskExecutions = async (
  links: readonly RemoteTaskExecution[],
  channel: RemoteRunChannel | null,
): Promise<readonly RemoteTaskExecutionView[]> => {
  const names = new Map<string, string>();
  for (const nodeId of new Set(links.map((link) => link.nodeId))) {
    names.set(nodeId, (await channel?.peerName(nodeId).catch(() => null)) ?? nodeId);
  }
  return Object.freeze(links.map((link) => Object.freeze({ ...link, nodeName: names.get(link.nodeId)! })));
};

/**
 * The one owner of a root's remote children's live facts (autobyteus-278, DS-001/002/005), shared by the
 * standalone, Team and Org roots: it counts the root's stream viewers, holds one observation stream per remote link
 * while there is a viewer, fetches the links' summaries (one request per node) and turns frames and answers into
 * the root's events. Phase 1 (DEC-807): no reconnect; a stream that ends without being closed here runs one summary
 * fetch, whose answer sets the row (AR-403); Retry (`refresh`) asks again and observes again.
 */
export class RemoteRunObservation {
  private viewers = 0;
  private disposed = false;
  private readonly streams = new Map<string, RemoteRunObservationStream>();

  constructor(private readonly options: Readonly<{
    /** The root's remote links, read at call time. */
    links(): readonly RemoteTaskExecution[];
    publish(event: RemoteRunRootEvent): void;
    channel?(): RemoteRunChannel | null;
  }>) {}

  /** A stream viewer of the root connected: 0 → 1 opens the streams; every viewer gets fresh summaries. */
  viewerAttached(): void {
    if (this.disposed) return;
    this.viewers += 1;
    if (this.viewers === 1) this.options.links().forEach((link) => this.open(link));
    void this.fetchSummaries(this.options.links());
  }

  /** A stream viewer left: 1 → 0 closes every stream. */
  viewerDetached(): void {
    if (this.viewers === 0) return;
    this.viewers -= 1;
    if (this.viewers === 0) this.closeStreams();
  }

  /** Retry (`REFRESH_REMOTE_TASK_EXECUTIONS`): the summaries again and, while viewed, every ended stream again. */
  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.viewers > 0) this.options.links().forEach((link) => this.open(link));
    return this.fetchSummaries(this.options.links());
  }

  /** A delegation recorded a new remote link: the root's viewers learn it, and it is observed while viewed. */
  linkCommitted(link: RemoteTaskExecution): void {
    if (this.disposed) return;
    void describeRemoteTaskExecutions([link], this.channel()).then(([execution]) => {
      if (!this.disposed && execution) this.options.publish({ kind: "remote_task_execution_started", execution });
      if (this.viewers > 0) {
        this.open(link);
        void this.fetchSummaries([link]);
      }
    });
  }

  /** The root ended: every stream closes and nothing is published any more. */
  dispose(): void {
    this.disposed = true;
    this.viewers = 0;
    this.closeStreams();
  }

  private open(link: RemoteTaskExecution): void {
    const key = remoteTaskExecutionRunId(link);
    const channel = this.channel();
    if (this.disposed || !channel || this.streams.has(key)) return;
    let current: RemoteRunObservationStream | null = null;
    let endedEarly = false;
    current = channel.observeRun(link.nodeId, remoteTargetRootOf(link), {
      onFrame: (agentRunId, message) => this.frame(link, agentRunId, message),
      onEnd: () => {
        if (!current) { endedEarly = true; return; }
        if (this.streams.get(key) === current) this.streams.delete(key);
        // AR-403: an end this root did not ask for shows plainly: one summary fetch sets the row.
        void this.fetchSummaries([link]);
      },
    });
    if (endedEarly) { void this.fetchSummaries([link]); return; }
    this.streams.set(key, current);
  }

  private frame(link: RemoteTaskExecution, agentRunId: string, message: AgentPresentationMessage): void {
    const memberAddress = remoteAgentAddressOf(link, agentRunId);
    if (!memberAddress) {
      // AR-402: the node sends its run's own agents only; anything else is not in this root's tree.
      console.debug(`A frame for agent run '${agentRunId}' is not of remote run '${remoteTaskExecutionRunId(link)}'; it was dropped.`);
      return;
    }
    if (!this.disposed) this.options.publish({ kind: "remote_agent_presentation", nodeId: link.nodeId, agentRunId, memberAddress, message });
  }

  private async fetchSummaries(links: readonly RemoteTaskExecution[]): Promise<void> {
    const channel = this.channel();
    if (!channel) return;
    const byNode = new Map<string, RemoteTaskExecution[]>();
    links.forEach((link) => byNode.set(link.nodeId, [...byNode.get(link.nodeId) ?? [], link]));
    await Promise.all([...byNode].map(async ([nodeId, nodeLinks]) => {
      const answer = await channel.runSummaries(nodeId, nodeLinks.map(remoteTargetRootOf).map((root) => ({ kind: root.kind as "agent" | "agent_team", runId: root.runId })))
        .catch(() => null);
      for (const link of nodeLinks) {
        const runId = remoteTaskExecutionRunId(link);
        const run = answer?.accepted ? answer.runs.find((entry) => entry.kind === link.kind && entry.runId === runId) : undefined;
        const summary: RemoteRunSummaryEvent = !answer?.accepted
          ? { nodeId, runId, reachable: false, title: null, statuses: [] }
          : { nodeId, runId, reachable: true, title: run?.title ?? null, statuses: run?.statuses ?? [] };
        if (!this.disposed) this.options.publish({ kind: "remote_task_execution_summary", summary: Object.freeze(summary) });
      }
    }));
  }

  private closeStreams(): void {
    const streams = [...this.streams.values()];
    this.streams.clear();
    streams.forEach((stream) => stream.close());
  }

  private channel(): RemoteRunChannel | null {
    return resolveRemoteRunChannel(this.options.channel);
  }
}
