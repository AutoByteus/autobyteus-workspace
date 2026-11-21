import { describe, expect, it } from "vitest";
import { ChildRowsFeed } from "../../../../src/agent-collaboration/delegation/child-rows-feed.js";
import type { ChildRowsChange } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { SubtreeRow } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { SequencedRootEvent } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { testViewStreams } from "../../../helpers/view-streams.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgentRunIds } from "../../../helpers/run-agents-reader.js";
import { RunStatusService } from "../../../../src/agent-collaboration/execution/run-status-service.js";
import type { RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { RunTreeView, type RunTreeChangedEvent } from "../../../../src/agent-collaboration/delegation/run-tree-view.js";
import { agentChildRow } from "../../../helpers/child-rows-feed.js";

/**
 * autobyteus-461 SR-084: the feed tells a run that its tree changed, at the change itself: `run_tree_changed`, numbered
 * in the run's one view sequence (its open views read the tree again), and `/ws/run-status` (its listed views do).
 */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const TEAM: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "squad" };
const row = (agentRunId: string, parent: RootExecutionIdentity = M): SubtreeRow => ({ run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "manager",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}`, parent });

const harness = () => {
  let report: (change: ChildRowsChange) => void = () => undefined;
  const streams = testViewStreams();
  const changed: string[] = [];
  const feed = new ChildRowsFeed({ streams, tree: { chainOf: (run: RootExecutionIdentity) => [run] }, rowsChanged: (run) => changed.push(run.rootRunId) });
  feed.follow({ subscribeChildRows: (listener) => { report = listener; return () => undefined; } });
  const events = (run: RootExecutionIdentity) => {
    const seen: SequencedRootEvent<RunTreeChangedEvent>[] = [];
    streams.streamOf<RunTreeChangedEvent>(run).subscribe((event) => seen.push(event));
    return seen;
  };
  return { changed, report: (change: ChildRowsChange) => report(change), events };
};

describe("ChildRowsFeed", () => {
  it("a run's rows changed (a row came, or left): its stream is told once, numbered, and its listed views on /ws/run-status", () => {
    const h = harness();
    const seen = h.events(M);
    h.report({ run: M, added: [row("writer")], removed: [] });
    h.report({ run: M, added: [], removed: [{ agentRunId: "writer" }] });
    expect(seen).toEqual([{ changeSequence: 1, event: { kind: "run_tree_changed" } }, { changeSequence: 2, event: { kind: "run_tree_changed" } }]);
    expect(h.changed).toEqual(["manager", "manager"]);
  });

  it("each run has its own sequence: a change to another run's rows is not in this run's stream", () => {
    const h = harness();
    const seen = h.events(M);
    h.report({ run: { rootSubjectKind: "agent", rootRunId: "other" }, added: [row("helper")], removed: [] });
    expect(seen).toEqual([]);
  });

  it("SR-086 G-B1, G-B2: a row's content changed: every tree that holds it (its run's own, and each run above it) is told, open and listed", () => {
    const changed: string[] = [];
    const streams = testViewStreams();
    const worker = { rootSubjectKind: "agent", rootRunId: "worker" } as RootExecutionIdentity;
    const feed = new ChildRowsFeed({ streams, rowsChanged: (run) => changed.push(run.rootRunId),
      tree: { chainOf: (run: RootExecutionIdentity) => [run, M] } });
    const seen = (run: RootExecutionIdentity) => { const events: unknown[] = []; streams.streamOf(run).subscribe(({ event }) => events.push(event)); return events; };
    const atWorker = seen(worker);
    const atManager = seen(M);
    feed.rowChanged(worker);
    expect(atWorker).toEqual([{ kind: "run_tree_changed" }]);
    expect(atManager).toEqual([{ kind: "run_tree_changed" }]);
    expect(changed).toEqual(["worker", "manager"]);
  });

  it("CR-461-040: over the real tree, a row two hops down (a Team's task agent's helper) tells the Team's stream live, and is in its tree", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (r) => r.rootRunId === "squad" ? ["lead"] : [r.rootRunId]));
    tree.build();
    tasks.setEntriesListener(tree);
    const streams = testViewStreams();
    const feed = new ChildRowsFeed({ streams, tree, rowsChanged: () => undefined });
    feed.follow(tree);
    const seen: SequencedRootEvent<RunTreeChangedEvent>[] = [];
    streams.streamOf<RunTreeChangedEvent>(TEAM).subscribe((event) => seen.push(event));
    tasks.addTask("T1");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: TEAM, delegatorAgentRunId: "lead" }, execution: { agentRunId: "worker" } });
    await tasks.markStarted({ agentRunId: "worker" });
    await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/helper", delegatedFrom: { delegatingRun: { rootSubjectKind: "agent", rootRunId: "worker" }, delegatorAgentRunId: "worker" }, execution: { agentRunId: "helper" } });
    expect(tree.collaborationTreeOf(TEAM).rows().map((placed) => placed.run)).toEqual([{ agentRunId: "worker" }, { agentRunId: "helper" }]);
    expect(seen.map(({ changeSequence, event }) => [changeSequence, event.kind])).toEqual([[1, "run_tree_changed"], [2, "run_tree_changed"]]);
  });

  it("AR-028 (SR-083, SR-084): a listed, expanded, not-open run is told its tree changed, at any depth, and its re-read tree gains the new row and loses the closed one, without a reload", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (r) => [r.rootRunId]));
    tree.build();
    tasks.setEntriesListener(tree);
    const runStatus = new RunStatusService({ agents: () => ({}) as never, peerRunOf: () => null, agentsOf: async () => [],
      peerNodeName: async (nodeId) => nodeId, peerSummary: async () => null, summaryChanged: () => undefined,
      registrations: { resolve: () => null, onRegistrationChanged: () => () => undefined } });
    const feed = new ChildRowsFeed({ streams: testViewStreams(), tree, rowsChanged: (run) => runStatus.treeChanged(run) });
    feed.follow(tree);
    // What the client reads again on each notice (`runTree(run)`).
    const runTree = new RunTreeView({ tree, ownTreeOf: async () => ({ kind: "agent", agentRunId: "manager", address: "/manager" }),
      projection: { rowOf: async (child) => "agentRunId" in child.run ? agentChildRow(child.run.agentRunId) : null }, isLiveTeamRun: () => true });
    const reRead = async () => (await runTree.rowsOf(M)).map((r) => [r.key, r.parentKey]);
    expect(await reRead()).toEqual([["agent:manager", null]]);
    // The manager's row in the list is expanded but not open: only its status connection follows it.
    const sent: RunStatusServerMessage[] = [];
    const connection = runStatus.connect((message) => sent.push(message));
    await connection.subscribe([{ kind: "agent", runId: "manager" }]);
    const treeNotices = () => sent.filter((message) => message.type === "RUN_TREE_CHANGED").length;
    tasks.addTask("T1");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { agentRunId: "worker" } });
    await tasks.markStarted({ agentRunId: "worker" });
    expect(treeNotices()).toBeGreaterThan(0);
    expect(await reRead()).toEqual([["agent:manager", null], ["agent:worker", "agent:manager"]]);
    // Two hops down: the worker's own sub-work is a row of the manager's too.
    const beforeHelper = treeNotices();
    await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/helper", delegatedFrom: { delegatingRun: { rootSubjectKind: "agent", rootRunId: "worker" }, delegatorAgentRunId: "worker" }, execution: { agentRunId: "helper" } });
    expect(treeNotices()).toBeGreaterThan(beforeHelper);
    expect(await reRead()).toEqual([["agent:manager", null], ["agent:worker", "agent:manager"], ["agent:helper", "agent:worker"]]);
    // Its Task closes: its rows leave the manager's view.
    const beforeClose = treeNotices();
    tasks.close("T1");
    expect(treeNotices()).toBeGreaterThan(beforeClose);
    expect(await reRead()).toEqual([["agent:manager", null]]);
    expect(sent.filter((message) => message.type === "RUN_TREE_CHANGED").every((message) => message.payload.runId === "manager")).toBe(true);
    connection.close();
  });
});
