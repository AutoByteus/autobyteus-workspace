import type { DelegationIndex } from "../../delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import { runReferenceOf, type RunTaskRecords } from "./task-execution-resource-port.js";

/** Base's input-fence text for a closed copy (`root-task-execution-resource-scope.ts:164` at 827f1e68dc; IMP-58). */
export const CLOSED_TASK_INPUT_MESSAGE = "Your Task is DONE or CANCELLED, so you can't start new work.";

export type ClosedTaskRefusal = Readonly<{ accepted: false; code: "TASK_AGENT_RESOURCE_CLOSED"; message: string }>;

const REFUSAL: ClosedTaskRefusal = Object.freeze({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: CLOSED_TASK_INPUT_MESSAGE });

/**
 * The closed-Task input fence of a delegated run (autobyteus-461 DS-15, SR-070; REQ-005: a closed run takes no input
 * except its assigner's reactivation, which reopens its entry first, DS-2). A run a Task names whose entry is closed
 * refuses user, application and resume input with base's text. A run no Task names is not fenced (one the user started,
 * or one whose Task was deleted). Asked where the input enters, before the run's root is resolved or restored, and again
 * at the head of a loaded root's gate; it reads the Task side's records, the authority (AR-017). Created at step 1–2.
 */
export class ClosedTaskFence {
  constructor(private readonly dependencies: Readonly<{
    tree: Pick<DelegationIndex, "tasksOf">;
    tasks: Pick<RunTaskRecords, "isOpen">;
  }>) {}

  /** The refusal of input to `run`, or `null` when it takes input. */
  refusal(run: RootExecutionIdentity): ClosedTaskRefusal | null {
    const reference = runReferenceOf(run);
    if (!reference || !this.dependencies.tree.tasksOf(reference).length) return null;
    return this.dependencies.tasks.isOpen(reference) ? null : REFUSAL;
  }

  /** Throws the refusal (`TASK_AGENT_RESOURCE_CLOSED`) when `run` takes no input. */
  assertOpen(run: RootExecutionIdentity): void {
    if (this.refusal(run)) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", CLOSED_TASK_INPUT_MESSAGE);
  }
}

