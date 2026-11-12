import { describe, expect, it } from "vitest";
import { ChildRowsFeed, placementOf, type ChildRowRootEvent } from "../../../../src/agent-collaboration/delegation/child-rows-feed.js";
import type { ChildRowsChange } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { SubtreeRow } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { SequencedRootEvent } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { testViewStreams } from "../../../helpers/view-streams.js";

/**
 * autobyteus-461 SR-061 … SR-063: the feed publishes base's row events into each affected run's view stream at the change
 * itself, numbered in the run's one sequence: a new row is started (with its placement, as at base), a row whose Tasks
 * closed is closed, a closed row that still runs and is back is reopened.
 */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const TEAM: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "squad" };
const row = (agentRunId: string, parent: RootExecutionIdentity = M): SubtreeRow => ({ run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "manager",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}`, parent });
const teamRow = (teamRunId: string, parent: RootExecutionIdentity = M): SubtreeRow => ({ run: { teamRunId }, taskId: "T1", delegatorAgentRunId: "manager",
  entryAgentRunId: `${teamRunId}-lead`, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${teamRunId}`, parent });

const harness = (closedEntries: ReadonlySet<string> = new Set()) => {
  let report: (change: ChildRowsChange) => void = () => undefined;
  const rows = new Map<string, SubtreeRow[]>();
  const streams = testViewStreams();
  const tree = {
    collaborationTreeOf: (run: RootExecutionIdentity) => ({ rows: () => rows.get(run.rootRunId) ?? [], closedRows: () => [] }),
    tasksOf: (run: { agentRunId?: string }) => run.agentRunId && closedEntries.has(run.agentRunId) ? [{ open: false }] : [],
  };
  const feed = new ChildRowsFeed({ streams, tree: tree as never, isRunning: () => true });
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
    expect(seen).toEqual([{ changeSequence: 1, event: { kind: "task_execution_started", placed: { row: row("writer"), host: { hostKind: "root", hostRunId: "manager" } } } }]);
  });

  it("a row whose Tasks closed is task_executions_closed; a closed row back that still runs is task_executions_reopened", () => {
    const h = harness(new Set(["writer"]));
    const seen = h.events(M);
    h.report({ run: M, added: [], removed: [{ agentRunId: "writer" }] });
    h.rows.set("manager", [row("writer")]);
    h.report({ run: M, added: [row("writer")], removed: [] });
    expect(seen.map(({ changeSequence, event }) => [changeSequence, event.kind])).toEqual([[1, "task_executions_closed"], [2, "task_executions_reopened"]]);
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
});
