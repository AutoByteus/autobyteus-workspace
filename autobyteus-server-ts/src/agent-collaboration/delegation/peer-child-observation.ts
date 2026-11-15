import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { peerRunIdOf, peerRunLinksOf, type PeerRunLink } from "../execution/remote/peer-run-link.js";
import { peerAgentAddressOf, peerStatuses, type PeerChannel } from "../execution/remote/peer-run-calls.js";
import type { PeerRun, PeerRunOf } from "../execution/remote/peer-runs.js";
import type { RemoteRunObservationStream } from "../execution/remote/remote-run-channel.js";
import type { RemoteRunRootEvent, RemoteRunSummaryEvent } from "../execution/remote/remote-run-observation.js";
import type { DelegationIndex } from "./delegation-index.js";
import type { RunViewStreams } from "./run-view-stream.js";
import { RUN_TREE_CHANGED_EVENT, type RunTreeChangedEvent } from "./run-tree-view.js";

type Publish = (event: RemoteRunRootEvent | RunTreeChangedEvent) => void;

/** One peer run's output observation and summary, shared by every open view that shows it (ARCH-REV-040 note 1). */
type Observed = { peer: PeerRun; stream: RemoteRunObservationStream | null; views: Map<string, Publish>; lastSummary: RemoteRunSummaryEvent | null };

/** One open view's following: its viewers, and the peer runs it shows. */
type Viewed = { viewers: number; peers: Set<string>; stopRows: () => void };

/**
 * The peer runs in the open views (autobyteus-461 SR-066; DS-8, AC-802: a peer run has no stream of its own on this
 * node): their live output, observed while a view shows them and numbered in each view's stream, and their summaries
 * (title, reachability, launches), asked of their nodes when a view opens and on Retry (`refresh`). One node-level owner,
 * keyed by peer run: the first open view that shows a peer run opens its `observe`, the last to close it closes it. A
 * view shows its open peer rows at every depth (`collaborationTreeOf(run).rows()`), followed as rows come and go. Each
 * peer run's last summary is kept in memory and published again to a view that attaches, after its snapshot (SR-063). A
 * peer run's status is its own, read by its run ID through its handle (`RunStatusService`, SR-083): status frames are
 * not the view's. Phase 1 (DEC-807): an observation never reconnects; Retry observes again.
 */
export class PeerChildObservation {
  private readonly observed = new Map<string, Observed>();
  private readonly viewed = new Map<string, Viewed>();

  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "collaborationTreeOf" | "subscribeChildRows" | "peerChildrenOf">;
    streams: Pick<RunViewStreams, "streamOf">;
    peerRunOf: PeerRunOf;
    channel: PeerChannel;
    /** Retry's other half: the peer runs' statuses (`RunStatusService`) observe again where they ended. */
    /** These peer runs' ended status observations again, and every other on their nodes (CR-461-094). */
    retryStatuses(peerRunIds: readonly string[], nodeIds: readonly string[]): void;
  }>) {}

  /**
   * A view of `run` opens, after its snapshot: its peer rows get their summaries in its stream (the
   * cached one now, a fresh one when its node answers). The returned function closes the view.
   */
  follow(run: RootExecutionIdentity): () => void {
    const key = rootExecutionIdentityKey(run);
    let view = this.viewed.get(key);
    if (!view) {
      const created: Viewed = { viewers: 0, peers: new Set(), stopRows: () => undefined };
      created.stopRows = this.dependencies.tree.subscribeChildRows((change) => {
        if (rootExecutionIdentityKey(change.run) === key) this.sync(run, created);
      });
      this.viewed.set(key, created);
      view = created;
      this.sync(run, view);
    }
    const current = view;
    current.viewers += 1;
    this.republish(key, current);
    void this.fetchSummaries(current);
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      if (--current.viewers > 0) return;
      current.stopRows();
      current.peers.forEach((peerRunId) => this.leave(peerRunId, key));
      if (this.viewed.get(key) === current) this.viewed.delete(key);
    };
  }

  /** Retry (`REFRESH_REMOTE_TASK_EXECUTIONS`): the view's peer rows' ended observations (output and status) again, and fresh summaries. */
  refresh(run: RootExecutionIdentity): Promise<void> {
    const view = this.viewed.get(rootExecutionIdentityKey(run));
    if (!view) return Promise.resolve();
    view.peers.forEach((peerRunId) => { const entry = this.observed.get(peerRunId); if (entry && !entry.stream) this.open(entry); });
    this.dependencies.retryStatuses([...view.peers], this.nodesOf([...view.peers]));
    return this.fetchSummaries(view);
  }

  /** A peer run's status observation ended unasked (AR-403): one summary for the views showing it sets its row. */
  ended(peerRunId: string): void {
    const entry = this.observed.get(peerRunId);
    // Never observed again from here: an observation its node keeps refusing would end, and be asked again, in a loop.
    if (entry) void this.fetchFor([entry], false);
  }

  /** The last summaries of the view's peer rows, in memory. */
  cachedSummaries(run: RootExecutionIdentity): readonly RemoteRunSummaryEvent[] {
    const view = this.viewed.get(rootExecutionIdentityKey(run));
    return view ? [...view.peers].flatMap((peerRunId) => this.observed.get(peerRunId)?.lastSummary ?? []) : [];
  }

  /** The view's peer rows now: newly shown ones are joined, ones no longer shown are left. */
  private sync(run: RootExecutionIdentity, view: Viewed): void {
    const key = rootExecutionIdentityKey(run);
    const shown = new Map<string, PeerRunLink>();
    for (const row of this.dependencies.tree.collaborationTreeOf(run).rows()) {
      if (row.nodeId === undefined) continue;
      const runId = "agentRunId" in row.run ? row.run.agentRunId : row.run.teamRunId;
      const link = peerRunLinksOf(row.parent, this.dependencies.tree).find((candidate) => peerRunIdOf(candidate) === runId);
      if (link) shown.set(runId, link);
    }
    for (const peerRunId of [...view.peers]) if (!shown.has(peerRunId)) { view.peers.delete(peerRunId); this.leave(peerRunId, key); }
    const publish: Publish = (event) => this.dependencies.streams.streamOf<RemoteRunRootEvent | RunTreeChangedEvent>(run).publish(event);
    for (const [peerRunId] of shown) {
      if (view.peers.has(peerRunId)) continue;
      const entry = this.join(peerRunId, key, publish);
      if (!entry) continue;
      view.peers.add(peerRunId);
      if (view.viewers > 0) void this.fetchSummaries(view, [peerRunId]);
    }
  }

  private join(peerRunId: string, viewKey: string, publish: Publish): Observed | null {
    let entry = this.observed.get(peerRunId);
    if (!entry) {
      const peer = this.dependencies.peerRunOf(peerRunId);
      if (!peer) return null;
      entry = { peer, stream: null, views: new Map(), lastSummary: null };
      this.observed.set(peerRunId, entry);
      this.open(entry);
    }
    entry.views.set(viewKey, publish);
    return entry;
  }

  private leave(peerRunId: string, viewKey: string): void {
    const entry = this.observed.get(peerRunId);
    if (!entry) return;
    entry.views.delete(viewKey);
    if (entry.views.size > 0) return;
    this.observed.delete(peerRunId);
    const stream = entry.stream;
    entry.stream = null;
    stream?.close();
  }

  /**
   * The peer run's live output into every view showing it (AR-402: only its own agents, at their addresses under its
   * delegator). Its status frames are not the view's (SR-083). An end leaves it ended until Retry; the summary an unasked
   * end needs comes from the status side (`ended`, AR-403), so it is asked once.
   */
  private open(entry: Observed): void {
    let current: RemoteRunObservationStream | null = null;
    let endedEarly = false;
    current = entry.peer.observe({
      onFrame: (agentRunId, message) => {
        const memberAddress = peerAgentAddressOf(entry.peer.link, agentRunId);
        if (!memberAddress || message.type === "AGENT_STATUS") return;
        this.publish(entry, { kind: "remote_agent_presentation", nodeId: entry.peer.link.nodeId, agentRunId, memberAddress, message });
      },
      onEnd: () => { if (!current) { endedEarly = true; return; } if (entry.stream === current) entry.stream = null; },
    });
    if (!endedEarly) entry.stream = current;
  }

  private publish(entry: Observed, event: RemoteRunRootEvent): void {
    for (const publish of [...entry.views.values()]) {
      try { publish(event); } catch (error) { console.warn(`A peer run's frame was not published: ${String(error)}`); }
    }
  }

  /** The cached summaries of the view's peer rows, published again to its stream (a viewer attached after its snapshot). */
  private republish(viewKey: string, view: Viewed): void {
    for (const peerRunId of view.peers) {
      const entry = this.observed.get(peerRunId);
      const publish = entry?.views.get(viewKey);
      if (entry?.lastSummary && publish) publish({ kind: "remote_task_execution_summary", summary: entry.lastSummary });
    }
  }

  private fetchSummaries(view: Viewed, only?: readonly string[]): Promise<void> {
    return this.fetchFor((only ?? [...view.peers]).flatMap((peerRunId) => this.observed.get(peerRunId) ?? []));
  }

  /**
   * One request per node; each answer is cached and published to every view showing the run. A node that answers is back
   * (CR-461-094): the ended status observations of its runs are observed again (`reobserve`; a view's open, its rows'
   * change and Retry), and an output observation of a run shown here that ended is opened again.
   */
  private async fetchFor(entries: readonly Observed[], reobserve = true): Promise<void> {
    if (!entries.length) return;
    const statuses = await peerStatuses(entries.map((entry) => entry.peer.link), this.dependencies.channel);
    const answered: string[] = [];
    const trees = new Map<string, Publish>();
    for (const entry of entries) {
      const summary = statuses.find((status) => status.nodeId === entry.peer.link.nodeId && status.runId === entry.peer.runId);
      if (!summary || this.observed.get(entry.peer.runId) !== entry) continue;
      entry.lastSummary = Object.freeze({ ...summary });
      this.publish(entry, { kind: "remote_task_execution_summary", summary: entry.lastSummary });
      for (const [viewKey, publish] of entry.views) trees.set(viewKey, publish);
      if (!reobserve || !summary.reachable) continue;
      answered.push(entry.peer.runId);
      if (!entry.stream) this.open(entry);
    }
    // The answers are in the peer rows of each view's tree (title, reachability, launches, SR-084): one notice per view.
    for (const publish of trees.values()) {
      try { publish(RUN_TREE_CHANGED_EVENT); } catch (error) { console.warn(`A view's tree notice was not published: ${String(error)}`); }
    }
    if (answered.length) this.dependencies.retryStatuses(answered, this.nodesOf(answered));
  }

  private nodesOf(peerRunIds: readonly string[]): string[] {
    return [...new Set(peerRunIds.flatMap((peerRunId) => this.observed.get(peerRunId)?.peer.link.nodeId ?? []))];
  }
}
