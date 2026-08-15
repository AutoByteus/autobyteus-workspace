import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

export type CommittedLocalExecutionTermination = Readonly<{
  finish(): Promise<AgentOperationResult>;
}>;

/** Local handle/TeamRun quiescence used to assemble a task settlement. */
export type PreparedLocalExecutionTermination = Readonly<{
  cancel(): void;
  commit(): CommittedLocalExecutionTermination;
}>;
