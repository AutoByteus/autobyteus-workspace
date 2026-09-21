import type { TaskDelegationRecordV1 } from "./task-delegation-record-v1.js";
import type {
  TaskExecution,
  TaskTeamMemberExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";

export type RootTaskReopenRepair = Readonly<{
  records: readonly TaskDelegationRecordV1[];
  referencedTaskRuns: ReadonlySet<string>;
  settledAtByRunId: ReadonlyMap<string, string>;
  changed: boolean;
}>;

export const repairTaskRecordsOnRootReopen = (input: {
  records: readonly TaskDelegationRecordV1[];
  recoveryTimestamp: string;
  rootLabel: string;
}): RootTaskReopenRepair => {
  const referencedTaskRuns = new Set<string>();
  const settledAtByRunId = new Map<string, string>();
  let changed = false;
  const records = input.records.map((task): TaskDelegationRecordV1 => {
    const runId = "agentRunId" in task.taskExecution ? task.taskExecution.agentRunId : task.taskExecution.teamRunId;
    referencedTaskRuns.add(runId);
    settledAtByRunId.set(runId, input.recoveryTimestamp);
    if (task.status !== "active" && task.status !== "awaiting_review") return task;
    changed = true;
    return Object.freeze({
      ...task,
      status: "interrupted" as const,
      updates: Object.freeze([...task.updates, Object.freeze({
        interruptionId: `${task.taskId}_interruption_restart`,
        reason: `Interrupted because live task recovery is not supported after ${input.rootLabel} reopen.`,
        createdAt: input.recoveryTimestamp,
      })]),
    });
  });
  return Object.freeze({ records: Object.freeze(records), referencedTaskRuns, settledAtByRunId, changed });
};

export const repairTaskExecutionForestOnRootReopen = (input: {
  tasks: readonly TaskExecution[];
  referencedTaskRuns: ReadonlySet<string>;
  settledAtByRunId: ReadonlyMap<string, string>;
}): readonly TaskExecution[] => {
  const repairTask = (task: TaskExecution): TaskExecution | null => {
    const runId = "agentRunId" in task ? task.agentRunId : task.teamRunId;
    if (!input.referencedTaskRuns.has(runId)) return null;
    const settledAt = task.settledAt ?? input.settledAtByRunId.get(runId) ?? null;
    return "agentRunId" in task
      ? Object.freeze({ ...task, settledAt })
      : Object.freeze({
          ...task,
          settledAt,
          members: Object.freeze(task.members.map(repairMember)),
          taskExecutions: Object.freeze(task.taskExecutions.map(repairTask).filter(notNull)),
        });
  };
  const repairMember = (member: TaskTeamMemberExecution): TaskTeamMemberExecution =>
    "agentRunId" in member ? member : Object.freeze({
      ...member,
      members: Object.freeze(member.members.map(repairMember)),
      taskExecutions: Object.freeze(member.taskExecutions.map(repairTask).filter(notNull)),
    });
  const notNull = <T>(value: T | null): value is T => value !== null;
  return Object.freeze(input.tasks.map(repairTask).filter(notNull));
};
