import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../domain/team-execution-address.js";

export type ActiveTaskExecutionBinding = Readonly<{
  kind: "task_agent" | "task_team";
  taskId: string;
  executionAddress: TeamExecutionAddress;
}>;

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export const createActiveTaskExecutionBinding = (
  input: ActiveTaskExecutionBinding,
): ActiveTaskExecutionBinding => {
  const executionAddress = createTeamExecutionAddress(input.executionAddress);
  if (input.kind === "task_agent") {
    if (!executionAddress.taskAgentRunId) {
      throw new Error("Task Agent execution binding requires taskAgentRunId.");
    }
  } else if (executionAddress.taskAgentRunId !== null || executionAddress.taskTeamRunIds.length === 0) {
    throw new Error("Task AgentTeam execution binding requires a task-Team run chain and no taskAgentRunId.");
  }
  return Object.freeze({
    kind: input.kind,
    taskId: required(input.taskId, "taskId"),
    executionAddress,
  });
};

export const cloneActiveTaskExecutionBinding = (
  binding: ActiveTaskExecutionBinding,
): ActiveTaskExecutionBinding => createActiveTaskExecutionBinding(binding);

export const getActiveTaskExecutionRunId = (
  binding: ActiveTaskExecutionBinding | null,
): string | null => binding?.kind === "task_agent"
  ? binding.executionAddress.taskAgentRunId
  : binding?.executionAddress.taskTeamRunIds.at(-1) ?? null;

export const getActiveTaskExecutionKind = (
  binding: ActiveTaskExecutionBinding | null,
): ActiveTaskExecutionBinding["kind"] | null => binding?.kind ?? null;
