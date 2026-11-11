import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { findTaskRunControl } from "../../agent-collaboration/execution/task/task-run-control.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

/**
 * Archive and delete of a run are refused while a run it delegated to works on an open Task (REQ-007, AR-007, TC-2):
 * the refusal names the working runs. A run on a peer node is not asked (its node owns it). `null` when none works.
 */
export const workingDelegatedRunsRefusal = (
  run: RootExecutionIdentity,
  action: "archived" | "deleted",
  tree: () => Pick<DelegationTree, "openChildrenOf"> | null = findDelegationTree,
  statusOf: (child: TaskExecutionReference) => string | null = (child) => findTaskRunControl()?.ownStatus(child) ?? null,
): string | null => {
  const working = (tree()?.openChildrenOf(run) ?? []).filter((child) => child.nodeId === undefined)
    .filter((child) => { const status = statusOf(child.run); return status === "running" || status === "initializing"; });
  if (!working.length) return null;
  const names = working.map((child) => child.recipientAddress).join(", ");
  return `This run can't be ${action} while a run it delegated to is working (${names}). Try again when it has finished, or stop it first.`;
};
