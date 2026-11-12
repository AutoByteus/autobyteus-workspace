import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

/**
 * Archive and delete of a run are refused while a run it delegated to works on an open Task (REQ-007, AR-007, TC-2):
 * the refusal names the working runs. A run on a peer node is not asked (its node owns it). Created with the tree and
 * the runs' own statuses (SR-047) and passed to the run services that archive and delete.
 */
export class DelegatedWorkGuard {
  constructor(private readonly input: Readonly<{
    tree: Pick<DelegationIndex, "openChildrenOf">;
    /** A run's own live status by its identity; `null` when it is not running. */
    statusOf(child: TaskExecutionReference): string | null;
  }>) {}

  /** The refusal of archiving or deleting `run`; `null` when no run it delegated to works. */
  refusal(run: RootExecutionIdentity, action: "archived" | "deleted"): string | null {
    const working = this.input.tree.openChildrenOf(run).filter((child) => child.nodeId === undefined)
      .filter((child) => { const status = this.input.statusOf(child.run); return status === "running" || status === "initializing"; });
    if (!working.length) return null;
    const names = working.map((child) => child.recipientAddress).join(", ");
    return `This run can't be ${action} while a run it delegated to is working (${names}). Try again when it has finished, or stop it first.`;
  }
}
