import { describe, expect, it } from "vitest";
import { ChildRowsFeed, placementOf, type ChildRowRootEvent } from "../../../../src/agent-collaboration/delegation/child-rows-feed.js";
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
import { RunTreeView } from "../../../../src/agent-collaboration/delegation/run-tree-view.js";
import { agentChildRow } from "../../../helpers/child-rows-feed.js";

/**
 * autobyteus-461 SR-061 … SR-063: the feed publishes base's row events into each affected run's view stream at the change
 * itself, numbered in the run's one sequence: a new row is started (with its placement, as at base), a row whose Tasks
 * closed is closed, a row back after its stream reported it closed is reopened (CR-461-042). SR-084: each change ends
 * with the run's tree notice (`run_tree_changed`), numbered after its row events.
 */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const TEAM: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "squad" };
const row = (agentRunId: string, parent: RootExecutionIdentity = M): SubtreeRow => ({ run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "manager",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}`, parent });
const teamRow = (teamRunId: string, parent: RootExecutionIdentity = M): SubtreeRow => ({ run: { teamRunId }, taskId: "T1", delegatorAgentRunId: "manager",
  entryAgentRunId: `${teamRunId}-lead`, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${teamRunId}`, parent });

const harness = () => {
  let report: (change: ChildRowsChange) => void = () => undefined;
  const rows = new Map<string, SubtreeRow[]>();
  const streams = testViewStreams();
  const tree = {
    collaborationTreeOf: (run: RootExecutionIdentity) => ({ rows: () => rows.get(run.rootRunId) ?? [], closedRows: () => [] }),
  };
  const feed = new ChildRowsFeed({ streams, tree: tree as never, isRunning: () => true, rowsChanged: () => undefined });
  feed.follow({ subscribeChildRows: (listener) => { report = listener; return () => undefined; } });
  const events = (run: RootExecutionIdentity) => {
    const seen: SequencedRootEvent<ChildRowRootEvent>[] = [];
    streams.streamOf<ChildRowRootEvent>(run).subscribe((event) => seen.push(event));
    return seen;
  };
  return { rows, streams, report: (change: ChildRowsChange) => report(change), events };
};

describe("ChildRowsFeed", () => {
  it("a new row is base's task_execution_started in its run's stream, at the change, placed in the root", () => {
    const h = harness();
    const seen = h.events(M);
    h.rows.set("manager", [row("writer")]);
    h.report({ run: M, added: [row("writer")], removed: [] });
    expect(seen).toEqual([{ changeSequence: 1, event: { kind: "task_execution_started", placed: { row: row("writer"), host: { hostKind: "root", hostRunId: "manager" } } } },
      { changeSequence: 2, event: { kind: "run_tree_changed" } }]);
  });

  it("a row whose Tasks closed is task_executions_closed; back after its assigner reactivated it (its entry open again), it is task_executions_reopened (CR-461-042)", () => {
    const h = harness();
    const seen = h.events(M);
    h.report({ run: M, added: [], removed: [{ agentRunId: "writer" }] });
    h.rows.set("manager", [row("writer")]);
    h.report({ run: M, added: [row("writer")], removed: [] });
    expect(seen.map(({ changeSequence, event }) => [changeSequence, event.kind])).toEqual([[1, "task_executions_closed"], [2, "run_tree_changed"],
      [3, "task_executions_reopened"], [4, "run_tree_changed"]]);
  });

  it("only a row this run's stream reported closed is reopened: another run's closure, or a row never closed, is started", () => {
    const h = harness();
    const seen = h.events(M);
    h.report({ run: { rootSubjectKind: "agent", rootRunId: "other" }, added: [], removed: [{ agentRunId: "writer" }] });
    h.rows.set("manager", [row("writer"), row("reader")]);
    h.report({ run: M, added: [row("writer"), row("reader")], removed: [] });
    expect(seen.map(({ event }) => event.kind)).toEqual(["task_execution_started", "task_execution_started", "run_tree_changed"]);
    h.report({ run: M, added: [], removed: [{ agentRunId: "reader" }] });
    h.report({ run: M, added: [row("reader")], removed: [] });
    h.report({ run: M, added: [row("reader")], removed: [] });
    expect(seen.slice(3).map(({ event }) => event.kind)).toEqual(["task_executions_closed", "run_tree_changed", "task_executions_reopened", "run_tree_changed",
      "task_execution_started", "run_tree_changed"]);
  });

  it("each run has its own sequence: a change to another run's rows is not in this run's stream", () => {
    const h = harness();
    const seen = h.events(M);
    h.report({ run: { rootSubjectKind: "agent", rootRunId: "other" }, added: [row("helper")], removed: [] });
    expect(seen).toEqual([]);
  });

  it("base's placement: a row is in the root, in the team run that delegated it, or where its delegating task agent is", () => {
    const squad = teamRow("squad");
    const fromTeam = row("checker", TEAM);
    const worker = row("worker");
    const fromWorker = row("helper", { rootSubjectKind: "agent", rootRunId: "worker" });
    const fromHelper = row("deep", { rootSubjectKind: "agent", rootRunId: "helper" });
    const rows = [squad, fromTeam, worker, fromWorker, fromHelper];
    expect(placementOf(M, squad, rows)).toEqual({ hostKind: "root", hostRunId: "manager" });
    expect(placementOf(M, fromTeam, rows)).toEqual({ hostKind: "team", hostRunId: "squad" });
    expect(placementOf(M, fromWorker, rows)).toEqual({ hostKind: "root", hostRunId: "manager" });
    expect(placementOf(M, fromHelper, rows)).toEqual({ hostKind: "root", hostRunId: "manager" });
  });

  it("CR-461-040: over the real tree, a row two hops down (a Team's task agent's helper) is in the Team's rows, at its root, and reaches its stream live", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (r) => r.rootRunId === "squad" ? ["lead"] : [r.rootRunId]));
    tree.build();
    tasks.setEntriesListener(tree);
    const streams = testViewStreams();
    const feed = new ChildRowsFeed({ streams, tree, isRunning: () => true, rowsChanged: () => undefined });
    feed.follow(tree);
    const seen: SequencedRootEvent<ChildRowRootEvent>[] = [];
    streams.streamOf<ChildRowRootEvent>(TEAM).subscribe((event) => seen.push(event));
    tasks.addTask("T1");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: TEAM, delegatorAgentRunId: "lead" }, execution: { agentRunId: "worker" } });
    await tasks.markStarted({ agentRunId: "worker" });
    await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/helper", delegatedFrom: { delegatingRun: { rootSubjectKind: "agent", rootRunId: "worker" }, delegatorAgentRunId: "worker" }, execution: { agentRunId: "helper" } });
    const root = { hostKind: "root", hostRunId: "squad" };
    expect(feed.rowsOf(TEAM).open.map((placed) => [placed.row.run, placed.host])).toEqual([[{ agentRunId: "worker" }, root], [{ agentRunId: "helper" }, root]]);
    expect(seen.map(({ event }) => [event.kind, event.kind === "task_execution_started" ? event.placed.row.run : null])).toEqual([
      ["task_execution_started", { agentRunId: "worker" }], ["run_tree_changed", null], ["task_execution_started", { agentRunId: "helper" }], ["run_tree_changed", null]]);
  });

  it("AR-028 (SR-083, SR-084): a listed, expanded, not-open run is told its tree changed, at any depth, and its re-read tree gains the new row and loses the closed one, without a reload", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (r) => [r.rootRunId]));
    tree.build();
    tasks.setEntriesListener(tree);
    const runStatus = new RunStatusService({ agents: () => ({}) as never, peerRunOf: () => null, agentsOf: async () => [], peerEnded: () => undefined,
      registrations: { resolve: () => null, onRegistrationChanged: () => () => undefined } });
    const feed = new ChildRowsFeed({ streams: testViewStreams(), tree, isRunning: () => true, rowsChanged: (run) => runStatus.treeChanged(run) });
    feed.follow(tree);
    // What the client reads again on each notice (`runTree(run)`).
    const runTree = new RunTreeView({ tree, ownTreeOf: async () => ({ kind: "agent", agentRunId: "manager", address: "/manager" }),
      projection: { rowOf: async (child) => "agentRunId" in child.run ? { kind: "local", row: agentChildRow(child.run.agentRunId) } : null } });
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
