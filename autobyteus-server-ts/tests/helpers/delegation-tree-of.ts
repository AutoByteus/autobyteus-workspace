import { NO_RUN_PARTS } from "./run-agents-reader.js";
import { DelegationTree } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionResourcePort } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";

type Source = Pick<TaskExecutionResourcePort, "taskIdsWithEntries" | "entriesOf">;

/** A `DelegationTree` built now from the Task side's loaded records (a test's read of the relationships). */
export const delegationTreeOf = (source: Source): DelegationTree => {
  const tree = new DelegationTree(() => source, NO_RUN_PARTS);
  tree.build();
  return tree;
};
/** The run's current Task entry (newest open, else newest), from the records as they are now. */
export const currentTaskOf = (source: Source, run: TaskExecutionReference) => delegationTreeOf(source).currentTaskOf(run);
/** One hop: the runs with an open Task that this run delegated to, from the records as they are now. */
export const openChildrenOf = (source: Source, run: RootExecutionIdentity) => delegationTreeOf(source).openChildrenOf(run);
