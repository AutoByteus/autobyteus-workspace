import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
} from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";
import { TaskDelegationToolRunRouter } from "./task-delegation-tool-run-router.js";

export class TaskDelegationToolService {
  constructor(private readonly router = new TaskDelegationToolRunRouter()) {}

  async delegateTask(context: TaskDelegationToolContext, input: DelegateTaskInput): Promise<DelegateTaskResult> {
    return (await this.router.resolveRoot(context)).delegateTask(context, input);
  }
  async submitTaskResult(context: TaskDelegationToolContext, input: SubmitTaskResultInput): Promise<SubmitTaskResultResult> {
    return (await this.router.resolveRoot(context)).submitTaskResult(context, input);
  }
  async reviewTaskResult(context: TaskDelegationToolContext, input: ReviewTaskResultInput): Promise<ReviewTaskResultResult> {
    return (await this.router.resolveRoot(context)).reviewTaskResult(context, input);
  }
}

let cached: TaskDelegationToolService | null = null;
export const getTaskDelegationToolService = (): TaskDelegationToolService => cached ??= new TaskDelegationToolService();
