import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';

/**
 * projects-left-navigation (REQ-008): which delegated copies of one listed root are shown under a Project, by copy key
 * (`agent:<agentRunId>` / `team:<teamRunId>`, as the server's task execution references). The server owns which copy
 * belongs to which Project (`projectRunHistory` scopes); the rows only read it. `null`: no scope (Workspaces mode).
 */
export type TaskExecutionScope = ReadonlySet<string>;

/**
 * One listed root's scope as its rows receive it: the copies shown, and where to report top-level copies that are in no
 * scope yet (a copy the run stream showed before its Task link was read; DS-004 trigger 5).
 */
export type RootExecutionScope = Readonly<{ copies: TaskExecutionScope; noteUnscoped(copyKeys: readonly string[]): void }>;

export type TaskExecutionReference = Readonly<{ agentRunId?: string | null; teamRunId?: string | null }>;

export const taskExecutionKey = (execution: TaskExecutionReference): string | null =>
  execution.teamRunId ? `team:${execution.teamRunId}` : execution.agentRunId ? `agent:${execution.agentRunId}` : null;

/** The copy key of a delegated (transient) row: a task Team row is its Team run, a task Agent or remote row its run. */
export const transientRowCopyKey = (row: RunHistoryTransientExecutionRow): string | null =>
  row.teamRunIdForNode ? `team:${row.teamRunIdForNode}` : taskExecutionKey({ agentRunId: row.remote?.runId ?? row.agentRunId });

/** How to read one kind of tree row: its depth, and its copy key when it is a delegated row (else null). */
export type TaskRowView<R> = Readonly<{ depth(row: R): number; copyKey(row: R): string | null }>;

/**
 * The rows a scope keeps: every non-delegated row; a delegated row whose parent is not delegated (a top-level task
 * row: a copy the root or one of its members started) only when its copy is in the scope; everything under a kept
 * row follows it, everything under a dropped one goes with it.
 */
export const scopeTaskRows = <R>(
  rows: readonly R[],
  scope: TaskExecutionScope | null,
  view: TaskRowView<R>,
): { kept: R[]; droppedKeys: string[] } => {
  if (!scope) return { kept: [...rows], droppedKeys: [] };
  const kept: R[] = [];
  const droppedKeys: string[] = [];
  // The depth of the innermost open ancestor and whether it is a delegated row; `dropDepth`: inside a dropped subtree.
  const ancestors: Array<{ depth: number; delegated: boolean }> = [];
  let dropDepth: number | null = null;
  for (const row of rows) {
    const depth = view.depth(row);
    if (dropDepth !== null && depth > dropDepth) continue;
    dropDepth = null;
    while (ancestors.length && ancestors[ancestors.length - 1]!.depth >= depth) ancestors.pop();
    const key = view.copyKey(row);
    const parentDelegated = ancestors[ancestors.length - 1]?.delegated ?? false;
    if (key !== null && !parentDelegated && !scope.has(key)) {
      dropDepth = depth;
      droppedKeys.push(key);
      continue;
    }
    kept.push(row);
    ancestors.push({ depth, delegated: key !== null });
  }
  return { kept, droppedKeys };
};

/** Tree connectors recomputed for the rows a scope kept (the vertical lines that continue below a row). */
export const branchConnectors = <R>(rows: readonly R[], depthOf: (row: R) => number): Array<{
  continuingAncestorDepths: number[];
  hasFollowingSibling: boolean;
}> => {
  const followsAtDepth = (index: number, depth: number): boolean => {
    for (let next = index + 1; next < rows.length; next += 1) {
      const nextDepth = depthOf(rows[next]!);
      if (nextDepth < depth) return false;
      if (nextDepth === depth) return true;
    }
    return false;
  };
  return rows.map((row, index) => ({
    continuingAncestorDepths: Array.from({ length: depthOf(row) }, (_, depth) => depth).filter((depth) => followsAtDepth(index, depth)),
    hasFollowingSibling: followsAtDepth(index, depthOf(row)),
  }));
};
