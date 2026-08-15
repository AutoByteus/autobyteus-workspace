import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRun } from "./team-run.js";

export type TaskExecutionBinding =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; agentRunId: string }>
  | Readonly<{ kind: "team"; address: AgentTeamAddress; teamRunId: string; coordinatorAgentRunId: string }>;

export type CommittedTaskExecution = Readonly<{
  releaseWork(): void;
}>;

/** Opaque local preparation. No task lifecycle policy is retained here. */
export interface PreparedTaskExecution {
  readonly binding: TaskExecutionBinding;
  readonly preparedTeamRuns: readonly TeamRun[];
  sealForCommit(): void;
  commit(): CommittedTaskExecution;
  abort(): Promise<void>;
}
