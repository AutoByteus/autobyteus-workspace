import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";

export type CommittedLocalExecutionTermination = Readonly<{
  finish(): Promise<AgentOperationResult>;
}>;

export type PreparedLocalExecutionTermination = Readonly<{
  cancel(): void;
  commit(): CommittedLocalExecutionTermination;
}>;
