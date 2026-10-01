import type {
  DelegateTaskInput,
  DelegateTaskResult,
} from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "./task-delegation-tool-run-router.js";

export class TaskDelegationToolService {
  constructor(private readonly router = new TaskDelegationToolRunRouter()) {}

  async delegateTask(context: TaskDelegationToolContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return this.router.delegateTask(context, input);
  }
}

let cached: TaskDelegationToolService | null = null;
export const getTaskDelegationToolService = (): TaskDelegationToolService => cached ??= new TaskDelegationToolService();
