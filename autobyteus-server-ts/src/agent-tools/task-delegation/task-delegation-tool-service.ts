import type { DelegateTaskResult } from "../../agent-team-execution/task-delegation/task-delegation-result-contract.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import type { DelegateTaskToolInput } from "./task-delegation-tool-input-parsers.js";
import { TaskDelegationToolRunRouter } from "./task-delegation-tool-run-router.js";

export class TaskDelegationToolService {
  constructor(private readonly router = new TaskDelegationToolRunRouter()) {}

  async delegateTask(context: TaskDelegationToolContext, input: DelegateTaskToolInput): Promise<DelegateTaskResult> {
    return this.router.delegateTask(context, input);
  }
}

let cached: TaskDelegationToolService | null = null;
export const getTaskDelegationToolService = (): TaskDelegationToolService => cached ??= new TaskDelegationToolService();
