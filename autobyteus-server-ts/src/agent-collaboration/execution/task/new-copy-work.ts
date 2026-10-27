import type { DelegationWork } from "../../../model-routing/domain/model-routing-types.js";
import type { TaskExecutionJoin } from "./root-task-dispatch.js";
import { asTaskDelegationError, type RootTaskExecutionResourceScope } from "./root-task-execution-resource-scope.js";
import { TaskDelegationError, type SpawnTaskInput } from "./task-delegation-command.js";
import {
  requireTaskString,
  validateTaskReferenceFiles,
  type DelegatedProjectTask,
} from "./task-execution-input.js";

/**
 * A fresh copy's work, prepared before its placement (DS-001 step 1): what the copy's first message says, how it joins
 * a Task, and the work and Task identity its launch resolution and decision records use (`delegation`).
 */
export type NewCopyWork = Readonly<{
  description: string;
  comments: readonly string[];
  referenceFiles: readonly string[];
  /** A saved Project Task given with `task_id`. */
  task?: DelegatedProjectTask;
  join: TaskExecutionJoin;
  delegation: DelegationWork;
}>;

/** A description's first non-empty line: the title of a Task with no Project. */
const firstLineOf = (description: string): string =>
  description.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";

/** The text the Model Router reads: the description, then a saved Task's comments. */
const workText = (description: string, comments: readonly string[]): string =>
  comments.length ? [description, "", "Comments:", ...comments.map((comment) => `- ${comment}`)].join("\n") : description;

/**
 * `delegate_task` with an address (DS-001 step 1): validates the input and reads the work's source, so the work text
 * and its Task exist before placement. `task_id` → that saved Task; a description from a task agent → sub-work of its
 * Task (that Task's identity); a description from anyone else → a new Task with no Project, created when the copy is
 * linked (its ID is not known yet).
 */
export const prepareNewCopyWork = async (
  scope: RootTaskExecutionResourceScope<unknown>,
  senderAgentRunId: string,
  input: SpawnTaskInput,
): Promise<NewCopyWork> => {
  const linked = Object.prototype.hasOwnProperty.call(input, "task_id");
  const allowed = linked ? ["recipient_address", "task_id"] : ["recipient_address", "description", "reference_files"];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new TaskDelegationError("VALIDATION_ERROR", "Delegation accepts exactly one work source.");
  const owner = scope.ownerOf(senderAgentRunId);
  if (linked) {
    if (owner) throw new TaskDelegationError("TASK_AGENT_RESOURCE_OWNED_SENDER", "You are a task agent, so you can't use task_id. Delegate with a description instead; that work is part of your Task.");
    // The agent's task_id (key or ID) is resolved once; only the stored ID goes on.
    const saved = await scope.port().resolveAssignment(requireTaskString(input.task_id, "task_id")).catch(error => { throw asTaskDelegationError(error); });
    return Object.freeze({
      description: saved.description, comments: saved.comments,
      task: { taskKey: saved.taskReference, projectId: saved.projectId },
      referenceFiles: await validateTaskReferenceFiles(saved.referenceFiles),
      join: { role: "assigned" as const, taskId: saved.taskId, assignedBy: senderAgentRunId },
      delegation: { text: workText(saved.description, saved.comments),
        task: { taskId: saved.taskId, taskKey: saved.taskReference, projectId: saved.projectId, title: saved.title } },
    });
  }
  if (owner && !owner.open) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "Your Task is DONE or CANCELLED, so you can't start new work.");
  // An unowned copy could not be told apart from an unreadable Task's work: reject before any planning.
  if (!owner) scope.assertResourceDataReadable();
  const description = requireTaskString(input.description, "description");
  const referenceFiles = await validateTaskReferenceFiles(input.reference_files ?? []);
  if (owner) {
    // Sub-work of Task work stays that Task's.
    const identity = await scope.port().describeTask(owner.taskId).catch(error => { throw asTaskDelegationError(error); });
    return Object.freeze({ description, comments: [], referenceFiles, join: { role: "delegated" as const, creator: owner.execution },
      delegation: { text: description, task: { taskId: owner.taskId, ...identity } } });
  }
  // Otherwise the copy gets its own Task with no Project.
  return Object.freeze({ description, comments: [], referenceFiles,
    join: { role: "assigned" as const, assignedBy: senderAgentRunId, adHocTask: { description, referenceFiles } },
    delegation: { text: description, task: { taskId: null, taskKey: null, projectId: null, title: firstLineOf(description) } } });
};
