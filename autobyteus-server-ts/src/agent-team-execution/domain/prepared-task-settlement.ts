import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TaskExecutionBinding } from "./prepared-task-execution.js";

export type CommittedTaskSettlement = Readonly<{
  finishLocalTeardown(): Promise<AgentOperationResult>;
}>;

/**
 * Exact reversible local settlement. Neither preparation nor cancellation
 * performs provider termination, registry deletion, or durable mutation.
 */
export type PreparedTaskSettlement = Readonly<{
  readonly taskId: string;
  readonly binding: TaskExecutionBinding;
  cancelBeforeDurability(): void;
  commitAfterDurability(): CommittedTaskSettlement;
}>;
