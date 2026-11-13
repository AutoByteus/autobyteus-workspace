import { vi } from "vitest";
import type { ClosedTaskRefusal } from "../../src/agent-collaboration/execution/task/closed-task-fence.js";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { ChildRowsFeed } from "../../src/agent-collaboration/delegation/child-rows-feed.js";
import { testViewStreams } from "./view-streams.js";
import type { ChildRowsChange } from "../../src/agent-collaboration/delegation/delegation-index.js";
import type { SubtreeRow } from "../../src/agent-collaboration/delegation/collaboration-tree.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** A local child's row as the views project it (`delegatedChildDto`). */
export const agentChildRow = (agentRunId: string, address = `/${agentRunId}`): CollaborationTaskExecutionDto => ({
  address, agentRunId, platformAgentRunId: null, delegatorAgentRunId: "delegator", startedAt: "2026-11-01T00:00:00.000Z",
  source: { kind: "agent", agentDefinitionId: "writer",
    launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "m", llmConfig: null, autoExecuteTools: false, workspaceRootPath: null } },
}) as CollaborationTaskExecutionDto;

/** A row under `parent` (default: a run `delegating`, the view's own run in most tests). */
export const delegatedChild = (agentRunId: string, parent: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "delegating" }): SubtreeRow => ({
  run: { agentRunId }, taskId: "T1", delegatorAgentRunId: "delegator",
  entryAgentRunId: agentRunId, started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress: `/${agentRunId}`, parent });

/**
 * A `ChildRowsFeed` over a test's own row reports (autobyteus-461 SR-061 … SR-063): `report(change)` updates the rows and
 * reports the change, so the feed publishes base's row events into the run's view stream; the rows' records are
 * `agentChildRow`. `rows` is what a view session reads (no statuses followed); `settled()` lets the sessions send.
 */
export const followTestChildRows = () => {
  let listener: ((change: ChildRowsChange) => void) | null = null;
  const streams = testViewStreams();
  const rowsByRun = new Map<string, SubtreeRow[]>();
  const tree = {
    collaborationTreeOf: (run: RootExecutionIdentity) => ({ rows: () => rowsByRun.get(rootExecutionIdentityKey(run)) ?? [], closedRows: () => [] }),
    tasksOf: () => [],
  };
  const feed = new ChildRowsFeed({ streams, tree: tree as never, isRunning: () => true });
  feed.follow({ subscribeChildRows: (next: (change: ChildRowsChange) => void) => { listener = next; return () => { listener = null; }; } });
  const projection = { rowOf: async (child: SubtreeRow) => "agentRunId" in child.run
    ? { kind: "local" as const, row: agentChildRow(child.run.agentRunId, child.recipientAddress) } : null };
  // A row's agents' statuses: none cached and none running unless a test sets them (CR-461-039).
  const followers = { follow: () => () => undefined, cachedStatuses: vi.fn((_run: RootExecutionIdentity): readonly Readonly<{ agentRunId: string; memberAddress: string; status: string }>[] => []),
    currentStatuses: vi.fn((_run: RootExecutionIdentity): readonly Readonly<{ agentRunId: string; status: string }>[] => []) };
  return {
    streams,
    rows: { feed, projection, followers, peers: { follow: () => () => undefined, refresh: async () => undefined }, peerRunOf: () => null },
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
export const openTasks = () => ({ refusal: vi.fn((_run: RootExecutionIdentity): ClosedTaskRefusal | null => null) });

export const testViewSources = () => {
  const rows = followTestChildRows();
  return { streams: rows.streams, rows: rows.rows, registrations: testRegistrations(), closedTasks: openTasks(), readStoredTree: async () => null };
};
