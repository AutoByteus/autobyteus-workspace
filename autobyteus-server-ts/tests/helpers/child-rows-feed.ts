import { vi } from "vitest";
import type { ClosedTaskRefusal } from "../../src/agent-collaboration/execution/task/closed-task-fence.js";
import { ChildRowsFeed } from "../../src/agent-collaboration/delegation/child-rows-feed.js";
import { RunTreeView, type RunOwnTree } from "../../src/agent-collaboration/delegation/run-tree-view.js";
import { testViewStreams } from "./view-streams.js";
import type { ChildRowsChange } from "../../src/agent-collaboration/delegation/delegation-index.js";
import type { SubtreeRow } from "../../src/agent-collaboration/delegation/collaboration-tree.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { ChildRowRecord } from "../../src/agent-collaboration/delegation/run-tree-records.js";

/** A local child's row as the views project it (`delegatedChildDto`). */
/** A delegated agent run's record, as `RunTreeView` reads it from the run's own file (stage C). */
export const agentChildRow = (agentRunId: string, address = `/${agentRunId}`): ChildRowRecord => Object.freeze({
  kind: "agent", agentRunId, address,
  launch: { runtimeKind: "autobyteus", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null, source: null, ownSource: true },
});

/** A row under `parent` (default: a run `delegating`, the view's own run in most tests). */
export const delegatedChild = (agentRunId: string, parent: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "delegating" }): SubtreeRow => ({
  run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "delegator",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}`, parent });

/** A test run's own parts: its one agent (or member) is the `delegator` of the test's rows. */
export const testOwnTree = (run: RootExecutionIdentity): RunOwnTree => {
  const delegator = { address: "/delegator", agentRunId: "delegator" };
  if (run.rootSubjectKind === "agent") return { kind: "agent", ...delegator };
  if (run.rootSubjectKind === "agent_team") return { kind: "agent_team", teamRunId: run.rootRunId, coordinatorAddress: delegator.address, members: [delegator] };
  return { kind: "agent_org", orgRunId: run.rootRunId, parts: [{ kind: "agent", ...delegator }] };
};

/**
 * A `ChildRowsFeed` over a test's own row reports (autobyteus-461 SR-084): `report(change)` updates the rows and reports
 * the change, so the feed publishes the tree's notice into the run's view stream; the rows' records are `agentChildRow`.
 * `rows` is what a view session reads (no statuses followed); `settled()` lets the sessions send.
 */
export const followTestChildRows = () => {
  let listener: ((change: ChildRowsChange) => void) | null = null;
  const streams = testViewStreams();
  const rowsByRun = new Map<string, SubtreeRow[]>();
  const tree = {
    collaborationTreeOf: (run: RootExecutionIdentity) => ({ rows: () => rowsByRun.get(rootExecutionIdentityKey(run)) ?? [] }),
    chainOf: (run: RootExecutionIdentity) => [run],
  };
  const feed = new ChildRowsFeed({ streams, tree, rowsChanged: () => undefined });
  feed.follow({ subscribeChildRows: (next: (change: ChildRowsChange) => void) => { listener = next; return () => { listener = null; }; } });
  const projection = { rowOf: async (child: SubtreeRow) => "agentRunId" in child.run
    ? agentChildRow(child.run.agentRunId, child.recipientAddress) : null };
  const runTree = new RunTreeView({ tree: tree as never, ownTreeOf: async (run) => testOwnTree(run), projection, isLiveTeamRun: () => true });
  return {
    streams,
    feed,
    rows: { peerRunOf: () => null, runTree },
    report: (change: Readonly<{ run: RootExecutionIdentity; added: readonly SubtreeRow[]; removed: ChildRowsChange["removed"] }>) => {
      const key = rootExecutionIdentityKey(change.run);
      const removed = new Set(change.removed.map((run) => "agentRunId" in run ? run.agentRunId : run.teamRunId));
      const kept = (rowsByRun.get(key) ?? []).filter((row) => !removed.has("agentRunId" in row.run ? row.run.agentRunId : row.run.teamRunId));
      rowsByRun.set(key, [...kept, ...change.added.map((row) => ({ ...row, parent: change.run }))]);
      listener?.({ run: change.run, added: change.added.map((row) => ({ ...row, parent: change.run })), removed: change.removed });
    },
    settled: async () => { for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); },
  };
};

/** A run's registration that a test drives: `register(run)` / `unregister(run)` tell the listeners (SR-046). */
export const testRegistrations = () => {
  const listeners = new Map<string, Set<(registered: boolean) => void>>();
  const tell = (run: RootExecutionIdentity, registered: boolean) => [...listeners.get(rootExecutionIdentityKey(run)) ?? []].forEach((listener) => listener(registered));
  return {
    onRegistrationChanged: (run: RootExecutionIdentity, listener: (registered: boolean) => void) => {
      const key = rootExecutionIdentityKey(run);
      const set = listeners.get(key) ?? new Set<(registered: boolean) => void>();
      set.add(listener);
      listeners.set(key, set);
      return () => { set.delete(listener); };
    },
    register: (run: RootExecutionIdentity) => tell(run, true),
    unregister: (run: RootExecutionIdentity) => tell(run, false),
    listening: (run: RootExecutionIdentity) => listeners.get(rootExecutionIdentityKey(run))?.size ?? 0,
  };
};

/** The rows under a run for a stream handler under test that has none. */
export const noViewRows = () => followTestChildRows().rows;

/** View sources for a stream handler under test whose run is live (no stored tree, no rows). */
/** A closed-Task fence (DS-15) that takes every input; a test sets `refusal` to close a run's Task. */
export const openTasks = () => ({ refusal: vi.fn(async (_run: RootExecutionIdentity): Promise<ClosedTaskRefusal | null> => null) });

export const testViewSources = () => {
  const rows = followTestChildRows();
  return { streams: rows.streams, rows: rows.rows, registrations: testRegistrations(), closedTasks: openTasks(), restorability: { refusal: async () => null }, readStoredTree: async () => null };
};
