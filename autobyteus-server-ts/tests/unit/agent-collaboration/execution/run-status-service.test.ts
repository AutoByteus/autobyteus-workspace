import { describe, expect, it, vi } from "vitest";
import type { RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { RunStatusService, type RunStatusSources } from "../../../../src/agent-collaboration/execution/run-status-service.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-082, SR-083 (FU-026, AC-017): each run's statuses by run ID, from the run itself; one connection serves
 * many runs; a subscription is exact; an answer and a peer observation are held while subscribed, by count.
 */
type Presentation = (agentRunId: string, message: { type: string; payload: unknown }) => void;
const frame = (status: string, backgroundTasksRunning = 0) => ({ type: "AGENT_STATUS", payload: { status, background_tasks_running: backgroundTasksRunning } });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const changes = (sent: readonly RunStatusServerMessage[]) => sent.filter((message) => message.type === "RUN_STATUS_CHANGED");
const states = (sent: readonly RunStatusServerMessage[]) => sent.filter((message) => message.type === "RUN_STATE_CHANGED");
const ok = (status: string, backgroundTasksRunning = 0) => ({ answer: "ok", node: null, status, backgroundTasksRunning });

const harness = (input: Readonly<{ agents?: Record<string, string[]>; live?: Record<string, Record<string, string>>; peer?: string[];
  summary?: (runId: string) => unknown }> = {}) => {
  const listeners = new Map<string, Presentation>();
  const ended = new Map<string, () => void>();
  const live = new Map(Object.entries(input.live ?? {}));
  const registration = new Map<string, Set<(registered: boolean) => void>>();
  const observe = vi.fn(async (runId: string, onPresentation: Presentation, onEnded: () => void) => {
    listeners.set(runId, onPresentation);
    ended.set(runId, onEnded);
    return { close: vi.fn(() => { listeners.delete(runId); }) };
  });
  const access = {
    observeRunAgents: observe,
    runAgentStatuses: (runId: string) => Object.entries(live.get(runId) ?? {}).map(([agentRunId, status]) => ({ agentRunId, status, backgroundTasksRunning: 0 })),
  };
  const peerClose = vi.fn();
  type PeerObserver = { onFrame(agentRunId: string, message: unknown): void; onEnd(): void };
  let peerObserver: PeerObserver | null = null;
  const peerObservers = new Map<string, PeerObserver>();
  const observeOf = (id: string) => vi.fn((observer: PeerObserver) => { peerObserver = observer; peerObservers.set(id, observer); return { close: peerClose }; });
  const peerObserves = new Map<string, ReturnType<typeof observeOf>>();
  const peerObserve = observeOf("peer-team");
  peerObserves.set("peer-team", peerObserve);
  const summaryChanged = vi.fn();
  /** Each ask of a peer run's node, by the run's ID. */
  const peerSummary = vi.fn(async (peer: unknown) => (input.summary?.((peer as { link: { teamRunId: string } }).link.teamRunId) ?? null) as never);
  const sources: RunStatusSources = {
    summaryChanged,
    peerNodeName: async (nodeId) => `${nodeId}-node`,
    peerSummary,
    agents: () => access as never,
    registrations: {
      resolve: (run: RootExecutionIdentity) => (live.has(run.rootRunId) ? ({} as never) : null),
      onRegistrationChanged: (run: RootExecutionIdentity, listener: (registered: boolean) => void) => {
        const set = registration.get(run.rootRunId) ?? new Set();
        set.add(listener);
        registration.set(run.rootRunId, set);
        return () => set.delete(listener);
      },
    },
    agentsOf: async (run) => (input.agents?.[run.rootRunId] ?? [run.rootRunId]).map((agentRunId) => ({ agentRunId })),
    peerRunOf: (id) => {
      if (!input.peer?.includes(id)) return null;
      if (!peerObserves.has(id)) peerObserves.set(id, observeOf(id));
      return { link: { kind: "agent_team", nodeId: id.startsWith("office-") ? "office" : "beta", teamRunId: id, members: [{ agentRunId: `${id}-lead` }] },
        observe: peerObserves.get(id)! } as never;
    },
  };
  const service = new RunStatusService(sources);
  const client = () => {
    const sent: RunStatusServerMessage[] = [];
    return { sent, connection: service.connect((message) => sent.push(message)) };
  };
  const register = (runId: string, registered: boolean) => { for (const listener of registration.get(runId) ?? []) listener(registered); };
  return { service, client, listeners, ended, live, register, observe, peerSummary, summaryChanged, peer: { close: peerClose, observe: peerObserve, observer: () => peerObserver,
    observerOf: (id: string) => peerObservers.get(id)!, observeOf: (id: string) => peerObserves.get(id)! } };
};

describe("RunStatusService (SR-082, SR-083)", () => {
  it("a local run's own status, and offline when it is not running; one connection serves many runs", async () => {
    const h = harness({ agents: { team: ["lead", "mate"] }, live: { copy: { copy: "idle" } } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent", runId: "copy" }, { kind: "agent_team", runId: "team" }]);
    expect(sent).toEqual([{ type: "RUN_STATUS_SNAPSHOT", payload: { runs: [
      { kind: "agent", runId: "copy", ...ok("idle"), agents: [{ agentRunId: "copy", status: "idle", backgroundTasksRunning: 0 }] },
      { kind: "agent_team", runId: "team", ...ok("offline"), agents: [{ agentRunId: "lead", status: "offline", backgroundTasksRunning: 0 }, { agentRunId: "mate", status: "offline", backgroundTasksRunning: 0 }] },
    ] } }]);
    h.listeners.get("copy")!("copy", frame("running"));
    expect(changes(sent).at(-1)).toEqual({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "copy", agentRunId: "copy", status: "running", backgroundTasksRunning: 0 } });
    expect(sent.at(-1)).toEqual({ type: "RUN_STATE_CHANGED", payload: { kind: "agent", runId: "copy", ...ok("running") } });
    // The team starts later: its own root is observed then; it stops: its agents read offline.
    h.live.set("team", { lead: "idle" });
    h.register("team", true);
    await flush();
    expect(changes(sent).at(-1)).toEqual({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent_team", runId: "team", agentRunId: "lead", status: "idle", backgroundTasksRunning: 0 } });
    h.register("team", false);
    expect(changes(sent).at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "lead", status: "offline", backgroundTasksRunning: 0 } });
  });

  it("a run's end sets its agents offline; a status the run's delegator would show is never read (no delegator here at all)", async () => {
    const h = harness({ live: { copy: { copy: "running" } } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent", runId: "copy" }]);
    h.ended.get("copy")!();
    expect(changes(sent).at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "copy", status: "offline", backgroundTasksRunning: 0 } });
  });

  it("a subscription is exact: a change before the synchronous step is in the snapshot, one after it follows it, none is lost or repeated", async () => {
    const h = harness({ live: { copy: { copy: "idle" } } });
    const first = h.client();
    await first.connection.subscribe([{ kind: "agent", runId: "copy" }]);
    const second = h.client();
    const subscribing = second.connection.subscribe([{ kind: "agent", runId: "copy" }]);
    h.listeners.get("copy")!("copy", frame("running")); // before the second connection's synchronous step
    await subscribing;
    h.listeners.get("copy")!("copy", frame("idle")); // after it
    expect(second.sent).toEqual([
      { type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent", runId: "copy", ...ok("running"), agents: [{ agentRunId: "copy", status: "running", backgroundTasksRunning: 0 }] }] } },
      { type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "copy", agentRunId: "copy", status: "idle", backgroundTasksRunning: 0 } },
      { type: "RUN_STATE_CHANGED", payload: { kind: "agent", runId: "copy", ...ok("idle") } },
    ]);
    // One root observation serves both.
    expect(h.observe).toHaveBeenCalledTimes(1);
  });

  it("a peer run's status from its handle; its observation is shared and released with the last subscriber", async () => {
    const h = harness({ peer: ["peer-team"] });
    const a = h.client(), b = h.client();
    await a.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await b.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    expect(h.peer.observe).toHaveBeenCalledTimes(1);
    h.peer.observer()!.onFrame("peer-team-lead", frame("running"));
    h.peer.observer()!.onFrame("someone-else", frame("running")); // not one of the run's own agents: dropped
    expect(changes(b.sent).at(-1)).toEqual({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent_team", runId: "peer-team", agentRunId: "peer-team-lead", status: "running", backgroundTasksRunning: 0 } });
    expect(a.sent.filter((message) => message.type === "RUN_STATUS_CHANGED")).toHaveLength(1);
    a.connection.close();
    expect(h.peer.close).not.toHaveBeenCalled();
    b.connection.unsubscribe([{ kind: "agent_team", runId: "peer-team" }]);
    expect(h.peer.close).toHaveBeenCalledTimes(1);
    expect(h.service.heldRuns).toBe(0);
  });

  it("CR-461-085: a peer run whose link ended reads offline and its node is asked once (AR-403); Retry observes it again, asks again, and its status follows", async () => {
    const h = harness({ peer: ["peer-team"] });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    expect(h.peerSummary).toHaveBeenCalledTimes(1);
    h.peer.observer()!.onFrame("peer-team-lead", frame("running"));
    h.peer.observer()!.onEnd();
    expect(changes(sent).at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "peer-team-lead", status: "offline", backgroundTasksRunning: 0 } });
    expect(h.peerSummary).toHaveBeenCalledTimes(2);
    // Never observed again from there (a node that keeps refusing would loop).
    await flush();
    expect(h.peer.observe).toHaveBeenCalledTimes(1);
    // A frame of the ended link changes nothing; Retry observes the run again and asks its node, and its status follows.
    h.service.retryPeers(["peer-team"]);
    expect(h.peer.observe).toHaveBeenCalledTimes(2);
    expect(h.peerSummary).toHaveBeenCalledTimes(3);
    h.peer.observer()!.onFrame("peer-team-lead", frame("idle"));
    expect(changes(sent).at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "peer-team-lead", status: "idle", backgroundTasksRunning: 0 } });
    // A live observation is not opened twice.
    h.service.retryPeers(["peer-team"]);
    expect(h.peer.observe).toHaveBeenCalledTimes(2);
    connection.close();
  });

  it("CR-461-094: a Retry whose node answers brings that node back: every ended observation on it is observed again (its other runs too); another node's waits", async () => {
    const h = harness({ peer: ["peer-team", "peer-other", "office-team"], summary: (runId) => ({ nodeId: runId.startsWith("office-") ? "office" : "beta",
      runId, reachable: true, title: null, statuses: [], launches: [] }) });
    const { connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "peer-team" }, { kind: "agent_team", runId: "peer-other" }, { kind: "agent_team", runId: "office-team" }]);
    await flush();
    for (const id of ["peer-team", "peer-other", "office-team"]) h.peer.observerOf(id).onEnd();
    await flush();
    // An unasked end's answer does not bring the node back (no loop).
    expect([h.peer.observeOf("peer-team"), h.peer.observeOf("peer-other"), h.peer.observeOf("office-team")].map((observe) => observe.mock.calls.length)).toEqual([1, 1, 1]);
    // A view that shows only "peer-team" asks for its Retry: its node answers, and is back for "peer-other" as well.
    h.service.retryPeers(["peer-team"]);
    await flush();
    expect([h.peer.observeOf("peer-team"), h.peer.observeOf("peer-other"), h.peer.observeOf("office-team")].map((observe) => observe.mock.calls.length)).toEqual([2, 2, 1]);
    connection.close();
  });

  it("SR-090: a Retry for a node that stays down settles: its state is told again, unchanged; concurrent Retries make one call", async () => {
    const h = harness({ peer: ["peer-team"], summary: (runId) => ({ nodeId: "beta", runId, reachable: false, title: null, statuses: [], launches: [] }) });
    const first = h.client();
    const second = h.client();
    await first.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await second.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await flush();
    const told = (sent: readonly RunStatusServerMessage[]) => states(sent).length;
    const before = [told(first.sent), told(second.sent)];
    const asked = h.peerSummary.mock.calls.length;
    // Two clients ask at once: one call to the node; both are told its (unchanged) state once it answered.
    await Promise.all([first.connection.retry(["peer-team"]), second.connection.retry(["peer-team"])]);
    expect(h.peerSummary.mock.calls.length).toBe(asked + 1);
    expect([told(first.sent), told(second.sent)]).toEqual([before[0]! + 1, before[1]! + 1]);
    expect(states(first.sent).at(-1)).toMatchObject({ payload: { runId: "peer-team", answer: "unreachable", node: "beta-node" } });
    // The next Retry is a new call.
    await first.connection.retry(["peer-team"]);
    expect(h.peerSummary.mock.calls.length).toBe(asked + 2);
    first.connection.close();
    second.connection.close();
  });

  it("SR-090: a Retry for a node that comes back settles with its answer; it opens the ended observation again", async () => {
    let reachable = false;
    const h = harness({ peer: ["peer-team"], summary: (runId) => ({ nodeId: "beta", runId, reachable, title: "Studio", statuses: [], launches: [] }) });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    h.peer.observer()!.onEnd();
    await flush();
    reachable = true;
    await connection.retry(["peer-team"]);
    expect(h.peer.observe).toHaveBeenCalledTimes(2);
    expect(states(sent).at(-1)).toMatchObject({ payload: { answer: "ok", node: null } });
    connection.close();
  });

  it("SR-090: a client retries only the peer runs it holds; a run it does not hold is not asked", async () => {
    const h = harness({ peer: ["peer-team"], summary: (runId) => ({ nodeId: "beta", runId, reachable: false, title: null, statuses: [], launches: [] }) });
    const holder = h.client();
    const other = h.client();
    await holder.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await flush();
    const asked = h.peerSummary.mock.calls.length;
    await other.connection.retry(["peer-team"]);
    expect(h.peerSummary.mock.calls.length).toBe(asked);
    holder.connection.close();
  });

  it("CR-461-107: a client that newly shows a peer run whose observation ended asks its node again once; a live observation is not asked", async () => {
    let reachable = true;
    const h = harness({ peer: ["peer-team"], summary: (runId) => ({ nodeId: "beta", runId, reachable, title: "Studio", statuses: [], launches: [] }) });
    const first = h.client();
    await first.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await flush();
    // A second client while the observation is open: nothing is asked.
    const asked = h.peerSummary.mock.calls.length;
    const live = h.client();
    await live.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    expect(h.peerSummary.mock.calls.length).toBe(asked);
    // Its run stopped on its node: the observation ended, answered reachable (never observed again from there).
    h.peer.observer()!.onEnd();
    await flush();
    expect(h.peer.observe).toHaveBeenCalledTimes(1);
    // Its node went away since. A client that now shows the run (a reload) asks once, and learns it.
    reachable = false;
    const before = h.peerSummary.mock.calls.length;
    const reloaded = h.client();
    await reloaded.connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await flush(); await flush();
    expect(h.peerSummary.mock.calls.length).toBe(before + 1);
    expect(h.peer.observe).toHaveBeenCalledTimes(1);
    expect(states(reloaded.sent).at(-1)).toMatchObject({ payload: { answer: "unreachable", node: "beta-node" } });
    for (const client of [first, live, reloaded]) client.connection.close();
  });

  it("RUN_TREE_CHANGED reaches the run's subscribers only", async () => {
    const h = harness({ agents: { org: ["planner"] } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_org", runId: "org" }]);
    expect(sent).toEqual([{ type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent_org", runId: "org", ...ok("offline"), agents: [{ agentRunId: "planner", status: "offline", backgroundTasksRunning: 0 }] }] } }]);
    h.service.treeChanged({ rootSubjectKind: "agent_org", rootRunId: "org" } as RootExecutionIdentity);
    h.service.treeChanged({ rootSubjectKind: "agent", rootRunId: "other" } as RootExecutionIdentity);
    expect(sent.slice(1)).toEqual([{ type: "RUN_TREE_CHANGED", payload: { kind: "agent_org", runId: "org" } }]);
    connection.close();
    h.service.treeChanged({ rootSubjectKind: "agent_org", rootRunId: "org" } as RootExecutionIdentity);
    expect(sent).toHaveLength(2);
  });

  it("SR-086 G-A4: a team's and an org's own status is computed by their root's node from their own agents by the one team rule, never by a client", async () => {
    const h = harness({ agents: { team: ["lead", "mate"], org: ["planner", "writer"] }, live: { team: { lead: "idle" }, org: { planner: "idle" } } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "team" }, { kind: "agent_org", runId: "org" }]);
    expect(sent[0]).toMatchObject({ payload: { runs: [{ runId: "team", ...ok("idle") }, { runId: "org", ...ok("idle") }] } });
    h.listeners.get("team")!("mate", frame("running"));
    h.listeners.get("org")!("writer", frame("error"));
    expect(states(sent)).toEqual([
      { type: "RUN_STATE_CHANGED", payload: { kind: "agent_team", runId: "team", ...ok("running") } },
      { type: "RUN_STATE_CHANGED", payload: { kind: "agent_org", runId: "org", ...ok("error") } },
    ]);
    // A member's change that keeps the team's status tells no state change.
    h.listeners.get("team")!("lead", frame("running"));
    expect(states(sent)).toHaveLength(2);
  });

  it("autobyteus-448: each agent's background task count is answered and followed; a Team's run state sums its own agents' counts", async () => {
    const h = harness({ agents: { team: ["lead", "mate"] }, live: { team: { lead: "idle", mate: "idle" } } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "team" }]);
    h.listeners.get("team")!("mate", frame("idle", 2)); // a member idle with two background tasks: only the count changes
    expect(changes(sent).at(-1)).toEqual({ type: "RUN_STATUS_CHANGED",
      payload: { kind: "agent_team", runId: "team", agentRunId: "mate", status: "idle", backgroundTasksRunning: 2 } });
    expect(states(sent).at(-1)).toEqual({ type: "RUN_STATE_CHANGED", payload: { kind: "agent_team", runId: "team", ...ok("idle", 2) } });
    h.listeners.get("team")!("lead", frame("running", 1));
    expect(states(sent).at(-1)).toEqual({ type: "RUN_STATE_CHANGED", payload: { kind: "agent_team", runId: "team", ...ok("running", 3) } });
    // A repeated answer tells nothing; the run's end makes every agent offline with 0.
    const told = sent.length;
    h.listeners.get("team")!("lead", frame("running", 1));
    expect(sent).toHaveLength(told);
    h.register("team", false);
    expect(states(sent).at(-1)).toEqual({ type: "RUN_STATE_CHANGED", payload: { kind: "agent_team", runId: "team", ...ok("offline", 0) } });
  });

  it("SR-086 G-A2: a run the node does not know is answered not_found, with no status; it is answered when its root registers", async () => {
    const h = harness({ agents: { gone: [] } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent", runId: "gone" }]);
    expect(sent).toEqual([{ type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent", runId: "gone", answer: "not_found", node: null, status: null, backgroundTasksRunning: 0, agents: [] }] } }]);
    h.live.set("gone", { gone: "idle" });
    h.register("gone", true);
    await flush();
    expect(states(sent)[0]).toMatchObject({ payload: { answer: "ok" } });
  });

  it("SR-086 G-A3, G-B2: a peer run's node's answer is kept with its status: unreachable with the node's name; a changed answer tells its trees", async () => {
    let reachable = false;
    const h = harness({ peer: ["peer-team"], summary: (runId) => ({ nodeId: "beta", runId, reachable, title: "Studio", statuses: [], launches: [] }) });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    await flush();
    await flush();
    // Its node's answer comes before or after the snapshot: the latest state the subscriber was told is unreachable.
    const latest = states(sent).at(-1)?.payload ?? (sent[0] as Extract<RunStatusServerMessage, { type: "RUN_STATUS_SNAPSHOT" }>).payload.runs[0];
    expect(latest).toMatchObject({ kind: "agent_team", runId: "peer-team", answer: "unreachable", node: "beta-node", status: null });
    expect(h.service.peerSummaryOf("peer-team")).toMatchObject({ title: "Studio", reachable: false });
    expect(h.summaryChanged).toHaveBeenCalledWith({ rootSubjectKind: "agent_team", rootRunId: "peer-team" });
    // Retry brings the node back: answered, and its trees are told; the same answer again tells nothing.
    reachable = true;
    h.service.retryPeers(["peer-team"]);
    await flush();
    expect(states(sent).at(-1)).toMatchObject({ payload: { answer: "ok", node: null, status: "offline" } });
    expect(h.service.peerSummaryOf("peer-team")).toMatchObject({ reachable: true });
    expect(h.summaryChanged).toHaveBeenCalledTimes(2);
    h.service.retryPeers(["peer-team"]);
    await flush();
    expect(h.summaryChanged).toHaveBeenCalledTimes(2);
    // Released with its last subscriber: its answer is not kept.
    connection.close();
    expect(h.service.peerSummaryOf("peer-team")).toBeNull();
  });
});
