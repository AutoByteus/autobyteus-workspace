/** Identity of one delegated child: a task Agent or a task Team. */
export type TaskExecutionReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;

export const taskExecutionRunId = (value: TaskExecutionReference): string =>
  "agentRunId" in value ? value.agentRunId : value.teamRunId;

export const taskExecutionReferenceKey = (value: TaskExecutionReference): string =>
  "agentRunId" in value ? `agent:${value.agentRunId}` : `team:${value.teamRunId}`;
