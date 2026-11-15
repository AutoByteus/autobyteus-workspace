import { describe, expect, it, vi } from "vitest";
import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { PeerChildObservation } from "../../../../src/agent-collaboration/delegation/peer-child-observation.js";
import { createPeerRunOf } from "../../../../src/agent-collaboration/execution/remote/peer-runs.js";
import type { RemoteRunChannel, RemoteRunObserver } from "../../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { createAgentRootExecutionIdentity, rootExecutionIdentityKey, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-066 (REQ-013; ARCH-REV-040 note 1), SR-083, CR-461-091: the open views' peer rows' live output and
 * summaries, observed without any root, shared by every open view that shows them (a row shows in its delegator's view
 * and in each ancestor's); base's AR-402 / AR-403 rules (autobyteus-278). A peer run's status is its own, read by its run
 * ID through its handle (`RunStatusService`), never a view frame.
 */
const DOCKER = "srv_docker_000000000000000000000000000";
const OFFICE = "srv_office_000000000000000000000000000";
const top = createAgentRootExecutionIdentity("top-run");
const delegator = createAgentRootExecutionIdentity("manager-run");
const status = (value: "running" | "idle"): AgentPresentationMessage => ({ type: "AGENT_STATUS", payload: {
  status: value, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
} } as AgentPresentationMessage);
const chunk = (delta: string): AgentPresentationMessage => ({ type: "SEGMENT_CONTENT", payload: { segment_id: "s1", turn_id: "t1", segment_type: "text", delta } } as AgentPresentationMessage);

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
  const retried: string[][] = [];
  const retriedNodes: string[][] = [];
  const answered = vi.fn((_summary: { runId: string }) => undefined);
  const observation = new PeerChildObservation({ answered, tree: tree as never, streams: streams as never, peerRunOf: createPeerRunOf(tree as never, current), channel: current,
    retryStatuses: (peerRunIds, nodeIds) => { retried.push([...peerRunIds]); retriedNodes.push([...nodeIds]); } });
  const eventsOf = (run: RootExecutionIdentity) => (published.get(rootExecutionIdentityKey(run)) ?? []) as Array<{ kind: string; summary?: unknown }>;
  const flush = async () => { for (let index = 0; index < 8; index += 1) await Promise.resolve(); };
  const changeRows = (run: RootExecutionIdentity, rows: unknown[]) => {
    rowsOf.set(rootExecutionIdentityKey(run), rows);
    rowListeners.forEach((listener) => listener({ run }));
  };
  return { channel, observers, closed, observation, eventsOf, flush, changeRows, retried, retriedNodes, answered };
};

describe("PeerChildObservation", () => {
  it("CR-461-091: one output observation per peer run, shared by the delegator's view and its ancestor's; the last view to close closes it", () => {
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

  it("AR-402 (CR-461-091): an output frame reaches every view showing the run, at its address under its delegator; another agent is dropped; a status frame is not the view's (SR-083)", () => {
    const f = harness();
    f.observation.follow(delegator);
    f.observation.follow(top);
    f.observers.get("marketing-run")!.onFrame("writer-run", chunk("Drafting the brief."));
    f.observers.get("marketing-run")!.onFrame("b-local-copy-run", chunk("Not one of its own agents."));
    f.observers.get("marketing-run")!.onFrame("writer-run", status("running"));
    const expected = [{ kind: "remote_agent_presentation", nodeId: DOCKER, agentRunId: "writer-run", memberAddress: "/marketing_team/writer", message: chunk("Drafting the brief.") }];
    expect(f.eventsOf(delegator).filter((event) => event.kind === "remote_agent_presentation")).toEqual(expected);
    expect(f.eventsOf(top).filter((event) => event.kind === "remote_agent_presentation")).toEqual(expected);
  });

  it("summaries: one request per node; an unanswered node is unreachable; each answer is kept with its run's status, never a frame of the view (SR-084)", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    expect(f.channel.runSummaries.mock.calls).toEqual([
      [DOCKER, [{ kind: "agent", runId: "researcher-run" }, { kind: "agent_team", runId: "marketing-run" }]],
      [OFFICE, [{ kind: "agent", runId: "analyst-run" }]],
    ]);
    // Each answer is kept with its run's status (SR-086 G-B2), which tells the trees holding its row.
    expect(f.answered.mock.calls.map(([summary]) => summary)).toEqual([
      expect.objectContaining({ runId: "researcher-run", reachable: true, title: "Title of researcher-run" }),
      expect.objectContaining({ runId: "marketing-run", reachable: true }),
      expect.objectContaining({ runId: "analyst-run", reachable: false, statuses: [] }),
    ]);
    expect(f.eventsOf(delegator)).toEqual([]);
  });

  it("Retry (CR-461-085, CR-461-091): the view's peer runs' ended observations again (output and status), and fresh summaries from their nodes", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    const before = f.channel.runSummaries.mock.calls.length;
    // An output observation that ended stays ended (DEC-807 Phase 1) and asks for no summary itself (the status side does).
    f.observers.get("researcher-run")!.onEnd();
    await f.flush();
    expect(f.channel.runSummaries.mock.calls.length).toBe(before);
    await f.observation.refresh(delegator);
    expect(f.channel.observeRun.mock.calls.map(([, root]) => root.runId)).toEqual(["researcher-run", "marketing-run", "analyst-run", "researcher-run"]);
    // Retry asks for the view's peer runs, then its answering node's runs are observed again (the open's answer before it).
    expect(f.retried).toEqual([["researcher-run", "marketing-run"], ["researcher-run", "marketing-run", "analyst-run"], ["researcher-run", "marketing-run"]]);
    expect(f.channel.runSummaries.mock.calls.length).toBe(before + 2);
  });

  it("CR-461-094: a node that answers a view's summaries is back: its runs' ended observations are observed again (an unreachable node's are not)", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    // DOCKER answers (researcher, marketing); OFFICE does not (analyst). The node goes with them: its other runs too.
    expect(f.retried).toEqual([["researcher-run", "marketing-run"]]);
    expect(f.retriedNodes).toEqual([[DOCKER]]);
    // An output observation that ended is opened again when its node answers.
    f.observers.get("marketing-run")!.onEnd();
    f.observation.follow(top);
    await f.flush();
    expect(f.channel.observeRun.mock.calls.map(([, root]) => root.runId).filter((id) => id === "marketing-run")).toHaveLength(2);
  });

  it("AR-403 (CR-461-085): a peer run's status observation that ended unasked fetches that run's summary once, for its views", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    const before = f.channel.runSummaries.mock.calls.length;
    const retriedBefore = f.retried.length;
    f.observation.ended("researcher-run");
    await f.flush();
    // Its node answers, but the end is not observed again from here (a node refusing it would loop).
    expect(f.retried).toHaveLength(retriedBefore);
    expect(f.channel.runSummaries.mock.calls.slice(before)).toEqual([[DOCKER, [{ kind: "agent", runId: "researcher-run" }]]]);
    f.observation.ended("not-shown-run");
    await f.flush();
    expect(f.channel.runSummaries.mock.calls.length).toBe(before + 1);
  });

  it("a peer row that comes is observed and gets its summary while its view is open; one that goes leaves the view, and is closed when no view shows it", async () => {
    const f = harness();
    f.observation.follow(delegator);
    await f.flush();
    f.changeRows(delegator, [researcher]);
    await f.flush();
    expect(f.closed).toEqual(["marketing-run", "analyst-run"]);
    const before = f.channel.runSummaries.mock.calls.length;
    f.changeRows(delegator, [researcher, analyst]);
    await f.flush();
    expect(f.channel.runSummaries.mock.calls.slice(before)).toEqual([[OFFICE, [{ kind: "agent", runId: "analyst-run" }]]]);
    expect(f.channel.observeRun.mock.calls.map(([, root]) => root.runId)).toEqual(["researcher-run", "marketing-run", "analyst-run", "analyst-run"]);
  });
});
