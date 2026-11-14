import { describe, expect, it, vi } from "vitest";
import type { RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { RunStatusService, type RunStatusSources } from "../../../../src/agent-collaboration/execution/run-status-service.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-082, SR-083 (FU-026, AC-017): each run's statuses by run ID, from the run itself; one connection serves
 * many runs; a subscription is exact; an answer and a peer observation are held while subscribed, by count.
 */
type Presentation = (agentRunId: string, message: { type: string; payload: unknown }) => void;
const frame = (status: string) => ({ type: "AGENT_STATUS", payload: { status } });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const harness = (input: Readonly<{ agents?: Record<string, string[]>; live?: Record<string, Record<string, string>>; peer?: string[] }> = {}) => {
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
    observePairedAgents: observe,
    pairedAgentStatuses: (runId: string) => Object.entries(live.get(runId) ?? {}).map(([agentRunId, status]) => ({ agentRunId, status })),
  };
  const peerClose = vi.fn();
  let peerObserver: { onFrame(agentRunId: string, message: unknown): void; onEnd(): void } | null = null;
  const peerObserve = vi.fn((observer: typeof peerObserver) => { peerObserver = observer; return { close: peerClose }; });
  const peerEnded = vi.fn();
  const sources: RunStatusSources = {
    peerEnded,
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
    peerRunOf: (id) => (input.peer?.includes(id)
      ? ({ link: { kind: "agent_team", teamRunId: id, members: [{ agentRunId: `${id}-lead` }] }, observe: peerObserve } as never) : null),
  };
  const service = new RunStatusService(sources);
  const client = () => {
    const sent: RunStatusServerMessage[] = [];
    return { sent, connection: service.connect((message) => sent.push(message)) };
  };
  const register = (runId: string, registered: boolean) => { for (const listener of registration.get(runId) ?? []) listener(registered); };
  return { service, client, listeners, ended, live, register, observe, peerEnded, peer: { close: peerClose, observe: peerObserve, observer: () => peerObserver } };
};

describe("RunStatusService (SR-082, SR-083)", () => {
  it("a local run's own status, and offline when it is not running; one connection serves many runs", async () => {
    const h = harness({ agents: { team: ["lead", "mate"] }, live: { copy: { copy: "idle" } } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent", runId: "copy" }, { kind: "agent_team", runId: "team" }]);
    expect(sent).toEqual([{ type: "RUN_STATUS_SNAPSHOT", payload: { runs: [
      { kind: "agent", runId: "copy", agents: [{ agentRunId: "copy", status: "idle" }] },
      { kind: "agent_team", runId: "team", agents: [{ agentRunId: "lead", status: "offline" }, { agentRunId: "mate", status: "offline" }] },
    ] } }]);
    h.listeners.get("copy")!("copy", frame("running"));
    expect(sent.at(-1)).toEqual({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "copy", agentRunId: "copy", status: "running" } });
    // The team starts later: its own root is observed then; it stops: its agents read offline.
    h.live.set("team", { lead: "idle" });
    h.register("team", true);
    await flush();
    expect(sent.at(-1)).toEqual({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent_team", runId: "team", agentRunId: "lead", status: "idle" } });
    h.register("team", false);
    expect(sent.at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "lead", status: "offline" } });
  });

  it("a run's end sets its agents offline; a status the run's delegator would show is never read (no delegator here at all)", async () => {
    const h = harness({ live: { copy: { copy: "running" } } });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent", runId: "copy" }]);
    h.ended.get("copy")!();
    expect(sent.at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "copy", status: "offline" } });
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
      { type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent", runId: "copy", agents: [{ agentRunId: "copy", status: "running" }] }] } },
      { type: "RUN_STATUS_CHANGED", payload: { kind: "agent", runId: "copy", agentRunId: "copy", status: "idle" } },
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
    expect(b.sent.at(-1)).toEqual({ type: "RUN_STATUS_CHANGED", payload: { kind: "agent_team", runId: "peer-team", agentRunId: "peer-team-lead", status: "running" } });
    expect(a.sent.filter((message) => message.type === "RUN_STATUS_CHANGED")).toHaveLength(1);
    a.connection.close();
    expect(h.peer.close).not.toHaveBeenCalled();
    b.connection.unsubscribe([{ kind: "agent_team", runId: "peer-team" }]);
    expect(h.peer.close).toHaveBeenCalledTimes(1);
    expect(h.service.heldRuns).toBe(0);
  });

  it("CR-461-085: a peer run whose link ended reads offline and asks its views for a summary; Retry observes it again and its status follows", async () => {
    const h = harness({ peer: ["peer-team"] });
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_team", runId: "peer-team" }]);
    h.peer.observer()!.onFrame("peer-team-lead", frame("running"));
    h.peer.observer()!.onEnd();
    expect(sent.at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "peer-team-lead", status: "offline" } });
    expect(h.peerEnded).toHaveBeenCalledWith("peer-team");
    // A frame of the ended link changes nothing; Retry observes the run again, and its status follows.
    h.service.retryPeers(["peer-team"]);
    expect(h.peer.observe).toHaveBeenCalledTimes(2);
    h.peer.observer()!.onFrame("peer-team-lead", frame("idle"));
    expect(sent.at(-1)).toMatchObject({ type: "RUN_STATUS_CHANGED", payload: { agentRunId: "peer-team-lead", status: "idle" } });
    // A live observation is not opened twice.
    h.service.retryPeers(["peer-team"]);
    expect(h.peer.observe).toHaveBeenCalledTimes(2);
    connection.close();
  });

  it("RUN_TREE_CHANGED reaches the run's subscribers only; an org run is held for it with no agents", async () => {
    const h = harness();
    const { sent, connection } = h.client();
    await connection.subscribe([{ kind: "agent_org", runId: "org" }]);
    expect(sent).toEqual([{ type: "RUN_STATUS_SNAPSHOT", payload: { runs: [{ kind: "agent_org", runId: "org", agents: [] }] } }]);
    h.service.treeChanged({ rootSubjectKind: "agent_org", rootRunId: "org" } as RootExecutionIdentity);
    h.service.treeChanged({ rootSubjectKind: "agent", rootRunId: "other" } as RootExecutionIdentity);
    expect(sent.slice(1)).toEqual([{ type: "RUN_TREE_CHANGED", payload: { kind: "agent_org", runId: "org" } }]);
    connection.close();
    h.service.treeChanged({ rootSubjectKind: "agent_org", rootRunId: "org" } as RootExecutionIdentity);
    expect(sent).toHaveLength(2);
  });
});
