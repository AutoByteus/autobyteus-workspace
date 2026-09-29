import type { DelegateTaskInput } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

/** Invokes the selector-free capability bound to the exact collaboration member. */
export class TaskDelegationToolRunRouter {
  delegateTask(context: TaskDelegationToolContext, input: DelegateTaskInput) {
    return context.commands.delegateTask(context.identity, input);
  }
}
