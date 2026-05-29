import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type TaskDelegationDeliverable,
  type TaskDelegationMemberIdentity,
  type TaskDelegationRecord,
  type TaskDelegationStatus,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";

export type CreateTaskDelegationRecordInput = {
  taskId: string;
  task: TaskDelegationTaskInput;
  assignee: TaskDelegationMemberIdentity;
  delegator: TaskDelegationMemberIdentity;
  dependencyTaskIds: string[];
};

const cloneIdentity = (
  identity: TaskDelegationMemberIdentity,
): TaskDelegationMemberIdentity => ({
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
});

const cloneRecord = (record: TaskDelegationRecord): TaskDelegationRecord => ({
  ...record,
  assignee: cloneIdentity(record.assignee),
  delegator: cloneIdentity(record.delegator),
  dependencyTaskIds: [...record.dependencyTaskIds],
  expectedDeliverables: [...record.expectedDeliverables],
  deliverables: record.deliverables.map((deliverable) => ({ ...deliverable })),
});

export class TaskDelegationLedger {
  private readonly recordsById = new Map<string, TaskDelegationRecord>();
  private idCounter = 0;

  constructor(readonly teamRunId: string) {}

  reserveTaskId(): string {
    return this.nextTaskId();
  }

  createRecords(input: CreateTaskDelegationRecordInput[]): TaskDelegationRecord[] {
    const now = new Date().toISOString();
    const created: TaskDelegationRecord[] = [];
    for (const item of input) {
      const taskId = item.taskId.trim();
      if (!taskId) {
        throw new TaskDelegationError("TASK_ID_REQUIRED", "taskId is required.");
      }
      const record: TaskDelegationRecord = {
        taskId,
        taskName: item.task.task_name,
        description: item.task.description,
        status: "not_started",
        assignee: cloneIdentity(item.assignee),
        delegator: cloneIdentity(item.delegator),
        dependencyTaskIds: [...item.dependencyTaskIds],
        completionCriteria: item.task.completion_criteria ?? null,
        expectedDeliverables: [...item.task.expected_deliverables],
        deliverables: [],
        terminalSummary: null,
        createdAt: now,
        updatedAt: now,
        queuedAt: null,
        terminalAt: null,
      };
      this.recordsById.set(taskId, record);
      created.push(cloneRecord(record));
    }
    return created;
  }

  hasTaskName(taskName: string): boolean {
    return this.listRecords().some((record) => record.taskName === taskName);
  }

  getRecord(taskId: string): TaskDelegationRecord | null {
    const record = this.recordsById.get(taskId) ?? null;
    return record ? cloneRecord(record) : null;
  }

  findRecordByTaskName(taskName: string): TaskDelegationRecord[] {
    return this.listRecords().filter((record) => record.taskName === taskName);
  }

  listRecords(): TaskDelegationRecord[] {
    return [...this.recordsById.values()].map(cloneRecord);
  }

  listRunnableNotStarted(): TaskDelegationRecord[] {
    return this.listRecords().filter(
      (record) =>
        record.status === "not_started" &&
        record.dependencyTaskIds.every(
          (dependencyTaskId) =>
            this.recordsById.get(dependencyTaskId)?.status === "completed",
        ),
    );
  }

  markQueued(taskIds: string[]): TaskDelegationRecord[] {
    const now = new Date().toISOString();
    const queued: TaskDelegationRecord[] = [];
    for (const taskId of taskIds) {
      const record = this.recordsById.get(taskId);
      if (!record || record.status !== "not_started") {
        continue;
      }
      record.status = "queued";
      record.queuedAt = now;
      record.updatedAt = now;
      queued.push(cloneRecord(record));
    }
    return queued;
  }

  markNotStarted(taskIds: string[]): TaskDelegationRecord[] {
    const now = new Date().toISOString();
    const records: TaskDelegationRecord[] = [];
    for (const taskId of taskIds) {
      const record = this.recordsById.get(taskId);
      if (!record || record.status !== "queued") {
        continue;
      }
      record.status = "not_started";
      record.queuedAt = null;
      record.updatedAt = now;
      records.push(cloneRecord(record));
    }
    return records;
  }

  updateStatus(input: {
    taskId: string;
    status: Exclude<TaskDelegationStatus, "not_started" | "queued">;
    summary?: string | null;
    deliverables?: TaskDelegationDeliverable[];
  }): TaskDelegationRecord {
    const record = this.recordsById.get(input.taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${input.taskId}' was not found.`,
      );
    }
    if (isTaskDelegationTerminalStatus(record.status)) {
      throw new TaskDelegationError(
        "TASK_ALREADY_TERMINAL",
        `Delegated task '${input.taskId}' is already ${record.status}.`,
      );
    }
    this.assertValidStatusTransition(record, input.status);
    const now = new Date().toISOString();
    record.status = input.status;
    record.updatedAt = now;
    if (input.deliverables?.length) {
      record.deliverables.push(...input.deliverables.map((deliverable) => ({ ...deliverable })));
    }
    if (input.summary !== undefined) {
      record.terminalSummary = input.summary?.trim() || null;
    }
    if (isTaskDelegationTerminalStatus(input.status)) {
      record.terminalAt = now;
    }
    return cloneRecord(record);
  }

  hasCurrentWorkForAssignee(memberRouteKey: string): boolean {
    const normalizedRouteKey = memberRouteKey.trim();
    if (!normalizedRouteKey) {
      return false;
    }
    const records = [...this.recordsById.values()].filter(
      (record) => record.assignee.memberRouteKey === normalizedRouteKey,
    );
    if (records.some((record) => record.status === "queued" || record.status === "in_progress")) {
      return true;
    }
    return records.some(
      (record) =>
        record.status === "not_started" &&
        record.dependencyTaskIds.every(
          (dependencyTaskId) =>
            this.recordsById.get(dependencyTaskId)?.status === "completed",
        ),
    );
  }

  private nextTaskId(): string {
    this.idCounter += 1;
    return `task_${String(this.idCounter).padStart(4, "0")}`;
  }

  private assertValidStatusTransition(
    record: TaskDelegationRecord,
    nextStatus: Exclude<TaskDelegationStatus, "not_started" | "queued">,
  ): void {
    if (record.status === "not_started") {
      throw new TaskDelegationError(
        "INVALID_STATUS_TRANSITION",
        `Delegated task '${record.taskId}' has not been activated and cannot be updated to ${nextStatus}.`,
      );
    }
    if (record.status === "queued" || record.status === "in_progress") {
      return;
    }
    throw new TaskDelegationError(
      "INVALID_STATUS_TRANSITION",
      `Delegated task '${record.taskId}' cannot transition from ${record.status} to ${nextStatus}.`,
    );
  }
}
