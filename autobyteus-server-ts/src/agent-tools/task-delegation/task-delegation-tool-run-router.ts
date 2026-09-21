import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

/** Invokes the selector-free capability bound to the exact collaboration member. */
export class TaskDelegationToolRunRouter {
  delegateTask(context: TaskDelegationToolContext, input: import("../../agent-collaboration/execution/task/task-lifecycle-command.js").DelegateTaskInput) {
    return context.commands.delegateTask(context.identity, input);
  }
  submitTaskResult(context: TaskDelegationToolContext, input: import("../../agent-collaboration/execution/task/task-lifecycle-command.js").SubmitTaskResultInput) {
    return context.commands.submitTaskResult(context.identity, input);
  }
  reviewTaskResult(context: TaskDelegationToolContext, input: import("../../agent-collaboration/execution/task/task-lifecycle-command.js").ReviewTaskResultInput) {
    return context.commands.reviewTaskResult(context.identity, input);
  }
}
