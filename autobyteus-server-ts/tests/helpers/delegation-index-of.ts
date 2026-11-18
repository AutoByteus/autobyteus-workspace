import { NO_RUN_PARTS } from "./run-agents-reader.js";
import { DelegationIndex } from "../../src/agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionResourcePort } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";

type Source = Pick<TaskExecutionResourcePort, "taskIdsWithEntries" | "entriesOf">;

/** A `DelegationIndex` built now from the Task side's loaded records (a test's read of the relationships). */
export const delegationIndexOf = (source: Source): DelegationIndex => {
  const tree = new DelegationIndex(() => source, NO_RUN_PARTS);
  tree.build();
  return tree;
};
/** The run's current Task entry (newest open, else newest), from the records as they are now. */
export const currentTaskOf = (source: Source, run: TaskExecutionReference) => delegationIndexOf(source).currentTaskOf(run);
/** One hop: the runs with an open Task that this run delegated to, from the records as they are now. */
export const openChildrenOf = (source: Source, run: RootExecutionIdentity) => delegationIndexOf(source).openChildrenOf(run);
