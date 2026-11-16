import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { RunTreeBase, RunTreeRow, RunTreeView } from "./run-tree-view.js";

/**
 * What changed in a run's tree since a view last had it (SR-084): the rows that came (in the tree's order), the keys of
 * the rows that left, and the rows whose content changed (a moved parent, a peer's answer, a launch). Empty when nothing
 * changed: a view still sends it, since its number is in the view's one sequence.
 */
export type RunTreeChange = Readonly<{ added: readonly RunTreeRow[]; removed: readonly string[]; updated: readonly RunTreeRow[] }>;

/** A row's content in one canonical form (its fields in name order), so two reads of the same row compare equal. */
const canonical = (value: unknown): string => JSON.stringify(value, (_key, field: unknown) => field && typeof field === "object" && !Array.isArray(field)
  ? Object.fromEntries(Object.entries(field as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : field);

export const diffRunTree = (before: readonly RunTreeRow[], after: readonly RunTreeRow[]): RunTreeChange => {
  const previous = new Map(before.map((row) => [row.key, row]));
  const next = new Set(after.map((row) => row.key));
  const added: RunTreeRow[] = [];
  const updated: RunTreeRow[] = [];
  for (const row of after) {
    const had = previous.get(row.key);
    if (!had) added.push(row);
    else if (canonical(had) !== canonical(row)) updated.push(row);
  }
  return Object.freeze({ added: Object.freeze(added), removed: Object.freeze(before.filter((row) => !next.has(row.key)).map((row) => row.key)),
    updated: Object.freeze(updated) });
};

/**
 * One view session's tree (SR-084): the rows its snapshot sent, then, for each `run_tree_changed` notice it sends (in
 * the view's order), the tree read again and what changed since the rows it sent last.
 */
export class RunTreeSessionRows {
  private constructor(private readonly view: Pick<RunTreeView, "rowsOf">, private readonly run: RootExecutionIdentity, private rows: readonly RunTreeRow[]) {}

  /** The snapshot's rows, from the delegated rows read at its base. */
  static async open(view: Pick<RunTreeView, "rowsOf">, run: RootExecutionIdentity, atBase: RunTreeBase): Promise<RunTreeSessionRows> {
    return new RunTreeSessionRows(view, run, await view.rowsOf(run, atBase));
  }

  /** The rows the session sent last: its snapshot's, until its first change. */
  get current(): readonly RunTreeRow[] {
    return this.rows;
  }

  async next(): Promise<RunTreeChange> {
    const rows = await this.view.rowsOf(this.run);
    const change = diffRunTree(this.rows, rows);
    this.rows = rows;
    return change;
  }
}
