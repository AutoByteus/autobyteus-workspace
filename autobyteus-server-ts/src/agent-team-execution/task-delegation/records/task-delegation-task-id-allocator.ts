import type { TaskDelegationRecord } from "../task-delegation-record.js";

const TASK_ID_PATTERN = /^task_(\d+)$/;

export class TaskDelegationTaskIdAllocator {
  private readonly nextByRootTeamRunId = new Map<string, number>();

  reserve(input: {
    rootTeamRunId: string;
    records: readonly TaskDelegationRecord[];
  }): string {
    const persistedNext = this.nextAfterPersistedMax(input.records);
    const currentNext = this.nextByRootTeamRunId.get(input.rootTeamRunId) ?? 1;
    const next = Math.max(currentNext, persistedNext);
    this.nextByRootTeamRunId.set(input.rootTeamRunId, next + 1);
    return `task_${String(next).padStart(4, "0")}`;
  }

  private nextAfterPersistedMax(records: readonly TaskDelegationRecord[]): number {
    let max = 0;
    for (const record of records) {
      const match = TASK_ID_PATTERN.exec(record.taskId);
      if (!match) continue;
      max = Math.max(max, Number.parseInt(match[1]!, 10));
    }
    return max + 1;
  }
}
