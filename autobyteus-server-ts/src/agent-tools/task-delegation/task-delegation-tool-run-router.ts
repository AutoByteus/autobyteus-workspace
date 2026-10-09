import type { DelegateTaskResult } from "../../agent-team-execution/task-delegation/task-delegation-result-contract.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import type { DelegateTaskToolInput } from "./task-delegation-tool-input-parsers.js";
import { toDelegateTaskResult } from "./task-delegation-tool-serialization.js";

/** Invokes the selector-free capability bound to the exact collaboration member, by subject. */
export class TaskDelegationToolRunRouter {
  async delegateTask(context: TaskDelegationToolContext, input: DelegateTaskToolInput): Promise<DelegateTaskResult> {
    return toDelegateTaskResult(input.subject === "new_copy"
      ? await context.commands.delegateToNewCopy(context.identity, input.input)
      : await context.commands.assignToExistingCopy(context.identity, input.input));
  }
}
