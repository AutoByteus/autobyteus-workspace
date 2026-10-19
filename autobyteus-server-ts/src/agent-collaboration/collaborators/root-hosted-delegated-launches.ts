import { DelegatedLaunchSelectionCommand } from "./delegated-launch-selection-command.js";
import type { DelegatedLaunchRootPort } from "./delegated-launch-selection-command.js";
import type { DelegatedLaunchSelections } from "../domain/delegated-launch-selection.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../execution/task/task-execution-reference.js";

/**
 * The delegated-launch port of the AgentOrg and Agent roots: the root supplies its tree, sources,
 * task lifecycle and one tree write per Save; every delegated copy is a task execution.
 */
export const createRootHostedDelegatedLaunchCommand = (options: Readonly<{
  tasks: DelegatedLaunchRootPort["tasks"] & Readonly<{ closedTaskExecutions(): readonly TaskExecutionReference[] }>;
  forest: DelegatedLaunchRootPort["forest"];
  readTaskSource: DelegatedLaunchRootPort["readTaskSource"];
  publishSelectionsChanged: DelegatedLaunchRootPort["publishSelectionsChanged"];
  /** Applies the selections to the current tree; equal to it when nothing changes. */
  isUnchanged(selections: DelegatedLaunchSelections): boolean;
  commitTree(selections: DelegatedLaunchSelections, afterDurability: () => void): Promise<void>;
}>): DelegatedLaunchSelectionCommand => new DelegatedLaunchSelectionCommand({
  forest: options.forest,
  readTaskSource: options.readTaskSource,
  isClosed: (reference) => options.tasks.closedTaskExecutions()
    .some((closed) => taskExecutionReferenceKey(closed) === taskExecutionReferenceKey(reference)),
  tasks: options.tasks,
  commitSelections: async (selections, afterDurability) => {
    if (options.isUnchanged(selections)) return "unchanged";
    await options.commitTree(selections, afterDurability);
    return "committed";
  },
  publishSelectionsChanged: options.publishSelectionsChanged,
  now: () => new Date().toISOString(),
});
