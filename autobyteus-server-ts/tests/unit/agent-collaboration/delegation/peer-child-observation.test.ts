import { describe, expect, it, vi } from "vitest";
import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { PeerChildObservation } from "../../../../src/agent-collaboration/delegation/peer-child-observation.js";
import { createPeerRunOf } from "../../../../src/agent-collaboration/execution/remote/peer-runs.js";
import type { RemoteRunChannel, RemoteRunObserver } from "../../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { createAgentRootExecutionIdentity, rootExecutionIdentityKey, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-066 (REQ-013; ARCH-REV-040 note 1): the open views' peer rows, observed without any root. One
 * observation per peer run, shared by every open view that shows it (a row shows in its delegator's view and in each
 * ancestor's), each view numbering the frames in its own stream; base's AR-402 / AR-403 rules (autobyteus-278).
 */
const DOCKER = "srv_docker_000000000000000000000000000";
const OFFICE = "srv_office_000000000000000000000000000";
const top = createAgentRootExecutionIdentity("top-run");
const delegator = createAgentRootExecutionIdentity("manager-run");
const status = (value: "running" | "idle"): AgentPresentationMessage => ({ type: "AGENT_STATUS", payload: {
  status: value, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
} } as AgentPresentationMessage);

const child = (run: Record<string, string>, nodeId: string, recipientAddress: string, members?: { address: string; agentRunId: string }[]) => ({
  run, taskId: "t1", delegatorAgentRunId: "manager-run", entryAgentRunId: members?.[0]?.agentRunId ?? Object.values(run)[0]!, started: true,
  linkedAt: "2026-10-23T08:00:00.000Z", recipientAddress, nodeId, open: true, ...(members ? { members } : {}), parent: delegator,
});
const researcher = child({ agentRunId: "researcher-run" }, DOCKER, "/market_researcher");
const marketing = child({ teamRunId: "marketing-run" }, DOCKER, "/marketing_team",
  [{ address: "/marketing_team/lead", agentRunId: "lead-run" }, { address: "/marketing_team/writer", agentRunId: "writer-run" }]);
const analyst = child({ agentRunId: "analyst-run" }, OFFICE, "/analyst");

const harness = () => {
  const peers = [researcher, marketing, analyst];
  const rowsOf = new Map<string, unknown[]>([[rootExecutionIdentityKey(delegator), peers], [rootExecutionIdentityKey(top), peers]]);
  const rowListeners = new Set<(change: { run: RootExecutionIdentity }) => void>();
  const tree = {
    collaborationTreeOf: (run: RootExecutionIdentity) => ({ rows: () => rowsOf.get(rootExecutionIdentityKey(run)) ?? [] }),
    subscribeChildRows: (listener: (change: { run: RootExecutionIdentity }) => void) => { rowListeners.add(listener); return () => rowListeners.delete(listener); },
    peerChildrenOf: () => peers,
    peerRunNamed: (id: string) => peers.find((row) => Object.values(row.run)[0] === id || row.members?.some((member) => member.agentRunId === id))?.run ?? null,
    parentOf: () => ({ delegatingRun: delegator, delegatorAgentRunId: "manager-run" }),
  };
  const observers = new Map<string, RemoteRunObserver>();
  const closed: string[] = [];
  const channel = {
    runSummaries: vi.fn(async (nodeId: string, runs: readonly { kind: string; runId: string }[]) => nodeId === OFFICE
      ? { accepted: false as const, code: "PEER_UNREACHABLE", message: "office-mac did not answer in time." }
      : { accepted: true as const, runs: runs.map((run) => ({ ...run, title: `Title of ${run.runId}`, statuses: [{ agentRunId: run.runId, status: "running" as const }], launches: [] })) }),
    observeRun: vi.fn((_nodeId: string, root: { runId: string }, observer: RemoteRunObserver) => {
      observers.set(root.runId, observer);
      return { close: () => closed.push(root.runId) };
    }),
  };
  const published = new Map<string, unknown[]>();
  const streams = { streamOf: (run: RootExecutionIdentity) => ({ publish: (event: unknown) => {
    const key = rootExecutionIdentityKey(run);
    published.set(key, [...published.get(key) ?? [], event]);
  } }) };
  const current = () => channel as unknown as RemoteRunChannel;
  const observation = new PeerChildObservation({ tree: tree as never, streams: streams as never, peerRunOf: createPeerRunOf(tree as never, current), channel: current });
  const eventsOf = (run: RootExecutionIdentity) => (published.get(rootExecutionIdentityKey(run)) ?? []) as Array<{ kind: string; summary?: unknown }>;
  const flush = async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); };
  const changeRows = (run: RootExecutionIdentity, rows: unknown[]) => {
    rowsOf.set(rootExecutionIdentityKey(run), rows);
    rowListeners.forEach((listener) => listener({ run }));
  };
  return { channel, observers, closed, observation, eventsOf, flush, changeRows };
};

describe("PeerChildObservation", () => {
  it("one observation per peer run, shared by the delegator's view and its ancestor's; the last view to close closes it", () => {
    const f = harness();
    const closeDelegator = f.observation.follow(delegator);
    const closeTop = f.observation.follow(top);
    const closeAgain = f.observation.follow(delegator);
    expect(f.channel.observeRun.mock.calls.map(([nodeId, root]) => [nodeId, root])).toEqual([
      [DOCKER, { kind: "agent", runId: "researcher-run" }],
      [DOCKER, { kind: "agent_team", runId: "marketing-run" }],
      [OFFICE, { kind: "agent", runId: "analyst-run" }],
    ]);
    closeDelegator(); closeAgain();
    expect(f.closed).toEqual([]);
    closeTop();
    expect(f.closed).toEqual(["researcher-run", "marketing-run", "analyst-run"]);
  });

  it("AR-402: a frame goes to every view showing the run, at its address under its delegator; another agent is dropped", () => {
    const f = harness();
    f.observation.follow(delegator);
    f.observation.follow(top);
    f.observers.get("marketing-run")!.onFrame("writer-run", status("running"));
    f.observers.get("marketing-run")!.onFrame("b-local-copy-run", status("running"));
    const expected = [{ kind: "remote_agent_presentation", nodeId: DOCKER, agentRunId: "writer-run", memberAddress: "/marketing_team/writer", message: status("running") }];
    expect(f.eventsOf(delegator).filter((event) => event.kind === "remote_agent_presentation")).toEqual(expected);
    expect(f.eventsOf(top).filter((event) => event.kind === "remote_agent_presentation")).toEqual(expected);
  });

  it("summaries: one request per node; an unanswered node is unreachable; a later view gets the cached ones, then fresh ones", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    expect(f.channel.runSummaries.mock.calls).toEqual([
      [DOCKER, [{ kind: "agent", runId: "researcher-run" }, { kind: "agent_team", runId: "marketing-run" }]],
      [OFFICE, [{ kind: "agent", runId: "analyst-run" }]],
    ]);
    expect(f.eventsOf(delegator).map((event) => event.summary)).toEqual([
      expect.objectContaining({ runId: "researcher-run", reachable: true, title: "Title of researcher-run" }),
      expect.objectContaining({ runId: "marketing-run", reachable: true }),
      expect.objectContaining({ runId: "analyst-run", reachable: false, statuses: [] }),
    ]);
    expect(f.observation.cachedSummaries(delegator)).toHaveLength(3);
    // A view that opens later (after its snapshot) gets the cached summaries at once, as frames of its own sequence.
    f.observation.follow(top);
    expect(f.eventsOf(top).filter((event) => event.kind === "remote_task_execution_summary")).toHaveLength(3);
  });

  it("AR-403: an end nobody asked for fetches that run's summary; Retry observes it again", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    const before = f.channel.runSummaries.mock.calls.length;
    f.observers.get("researcher-run")!.onEnd();
    await f.flush();
    expect(f.channel.runSummaries.mock.calls.length).toBe(before + 1);
    expect(f.channel.observeRun).toHaveBeenCalledTimes(3);
    await f.observation.refresh(delegator);
    expect(f.channel.observeRun).toHaveBeenCalledTimes(4);
  });

  it("a peer row that comes is observed while its view is open; one that goes is left, and closed when no view shows it", async () => {
    const f = harness();
    f.observation.follow(delegator);
    f.changeRows(delegator, [researcher]);
    expect(f.closed).toEqual(["marketing-run", "analyst-run"]);
    f.changeRows(delegator, [researcher, analyst]);
    expect(f.channel.observeRun.mock.calls.map(([, root]) => root.runId)).toEqual(["researcher-run", "marketing-run", "analyst-run", "analyst-run"]);
  });
});
