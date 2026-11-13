import type { DelegationIndex } from "../../delegation/delegation-index.js";
import type { RunOwnAgentsReader } from "../../../run-history/store/run-own-agents-reader.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import { runReferenceOf, type RunTaskRecords } from "./task-execution-resource-port.js";

/** Base's input-fence text for a closed copy (`root-task-execution-resource-scope.ts:164` at 827f1e68dc; IMP-58). */
export const CLOSED_TASK_INPUT_MESSAGE = "Your Task is DONE or CANCELLED, so you can't start new work.";

export type ClosedTaskRefusal = Readonly<{ accepted: false; code: "TASK_AGENT_RESOURCE_CLOSED" | "TASK_AGENT_RESOURCES_UNAVAILABLE"; message: string }>;

const REFUSAL: ClosedTaskRefusal = Object.freeze({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: CLOSED_TASK_INPUT_MESSAGE });

/**
 * The closed-Task input fence of a delegated run (autobyteus-461 DS-15, SR-070; REQ-005: a closed run takes no input
 * except its assigner's reactivation, which reopens its entry first, DS-2). A run a Task names whose entry is closed
 * refuses user, application and resume input with base's text. A run no Task names is not fenced (one the user started,
 * or one whose Task was deleted). Asked where the input enters, before the run's root is resolved or restored, and again
 * at the head of a loaded root's gate; it reads the Task side's records, the authority (AR-017). Created at step 1–2.
 *
 * Damaged Task data (CR-461-051, autobyteus-469 DEC-010): a delegated run that no readable Task names may belong to a
 * Task whose record cannot be read, so while any cannot, it fails closed with the Task side's message. Whether the run
 * was delegated is its own file's `delegatedFrom`: a loaded root passes it from its own options at its gate head; where
 * input enters, `ClosedTaskEntryFence` reads it before the root is loaded (SR-074).
 */
export class ClosedTaskFence {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "tasksOf">;
    tasks: Pick<RunTaskRecords, "isOpen" | "unreadable">;
  }>) {}

  /** The refusal of input to `run`, or `null` when it takes input. `delegated`: the run's own file has `delegatedFrom`. */
  refusal(run: RootExecutionIdentity, delegated = false): ClosedTaskRefusal | null {
    const reference = runReferenceOf(run);
    if (!reference) return null;
    if (!this.dependencies.tree.tasksOf(reference).length) {
      const unreadable = delegated ? this.dependencies.tasks.unreadable() : null;
      return unreadable ? Object.freeze({ accepted: false, code: "TASK_AGENT_RESOURCES_UNAVAILABLE", message: unreadable }) : null;
    }
    return this.dependencies.tasks.isOpen(reference) ? null : REFUSAL;
  }

  /** Throws the refusal when `run` takes no input. */
  assertOpen(run: RootExecutionIdentity, delegated = false): void {
    const refusal = this.refusal(run, delegated);
    if (refusal) throw new TaskDelegationError(refusal.code, refusal.message);
  }
}

/**
 * The fence where input enters, before the run's root is resolved or restored (DS-15, SR-074): a refused input registers
 * no root, shows no status and binds no stream. While a Task record cannot be read, whether the run was delegated is read
 * from its own file (`RunOwnAgentsReader.delegationOf`); otherwise nothing is read.
 */
export class ClosedTaskEntryFence {
  constructor(private readonly dependencies: Readonly<{
    fence: Pick<ClosedTaskFence, "refusal">;
    tasks: Pick<RunTaskRecords, "unreadable">;
    files: Pick<RunOwnAgentsReader, "delegationOf">;
  }>) {}

  async refusal(run: RootExecutionIdentity): Promise<ClosedTaskRefusal | null> {
    const delegated = this.dependencies.tasks.unreadable() ? (await this.dependencies.files.delegationOf(run)) !== null : false;
    return this.dependencies.fence.refusal(run, delegated);
  }
}

