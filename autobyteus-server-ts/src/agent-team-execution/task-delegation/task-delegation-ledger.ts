import {
  isTaskDelegationTerminalStatus,
  TaskDelegationError,
  type TaskDelegationDelegatorIdentity,
  type TaskDelegationMemberIdentity,
  type TaskDelegationRecord,
  type TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import {
  cloneTaskAgentIdentity,
} from "./task-agent-instance-identity.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export type CreateTaskDelegationRecordInput = {
  taskId: string;
  task: TaskDelegationTaskInput;
  member: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
};

const cloneIdentity = (
  identity: TaskDelegationMemberIdentity,
): TaskDelegationMemberIdentity => ({
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
  runtimeKind: identity.runtimeKind ?? null,
});

const cloneDelegatorIdentity = (
  identity: TaskDelegationDelegatorIdentity,
): TaskDelegationDelegatorIdentity => ({
  ...cloneIdentity(identity),
  taskAgentInstanceId: identity.taskAgentInstanceId ?? null,
  taskAgentRunId: identity.taskAgentRunId ?? null,
  taskId: identity.taskId ?? null,
  logicalMemberRouteKey: identity.logicalMemberRouteKey ?? null,
});

const cloneRecord = (record: TaskDelegationRecord): TaskDelegationRecord => ({
  ...record,
  member: cloneIdentity(record.member),
  delegator: cloneDelegatorIdentity(record.delegator),
  referenceFiles: [...record.referenceFiles],
  taskAgentInstance: record.taskAgentInstance
    ? cloneTaskAgentIdentity(record.taskAgentInstance)
    : null,
});

const deriveTaskLabel = (description: string, fallbackTaskId: string): string => {
  const firstLine = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) {
    return fallbackTaskId;
  }
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
};

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
        taskLabel: deriveTaskLabel(item.task.description, taskId),
        description: item.task.description,
        status: "not_started",
        member: cloneIdentity(item.member),
        delegator: cloneDelegatorIdentity(item.delegator),
        referenceFiles: [...(item.task.reference_files ?? [])],
        taskAgentInstance: null,
        targetAgentRunId: null,
        delegatorReplyRecipientName: null,
        delegatorReplyTargetAgentRunId: null,
        acceptanceMessage: null,
        acceptedAt: null,
        createdAt: now,
        updatedAt: now,
        terminalAt: null,
      };
      this.recordsById.set(taskId, record);
      created.push(cloneRecord(record));
    }
    return created;
  }

  getRecord(taskId: string): TaskDelegationRecord | null {
    const record = this.recordsById.get(taskId) ?? null;
    return record ? cloneRecord(record) : null;
  }

  listRecords(): TaskDelegationRecord[] {
    return [...this.recordsById.values()].map(cloneRecord);
  }

  listRecordsForTaskAgentRun(taskAgentRunId: string): TaskDelegationRecord[] {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) {
      return [];
    }
    return [...this.recordsById.values()]
      .filter((record) => record.taskAgentInstance?.taskAgentRunId === normalizedRunId)
      .map(cloneRecord);
  }

  listRunnableNotStarted(): TaskDelegationRecord[] {
    return this.listRecords().filter((record) => record.status === "not_started");
  }

  bindTaskAgent(input: {
    taskId: string;
    taskAgentInstance: TaskAgentInstanceIdentity;
    delegatorReplyRecipientName?: string | null;
    delegatorReplyTargetAgentRunId?: string | null;
  }): TaskDelegationRecord {
    const record = this.recordsById.get(input.taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${input.taskId}' was not found.`,
      );
    }
    if (record.status !== "not_started") {
      throw new TaskDelegationError(
        "TASK_ALREADY_ACTIVE",
        `Delegated task '${input.taskId}' is already ${record.status}.`,
      );
    }
    const now = new Date().toISOString();
    record.taskAgentInstance = cloneTaskAgentIdentity(input.taskAgentInstance);
    record.targetAgentRunId = input.taskAgentInstance.taskAgentRunId;
    record.delegatorReplyRecipientName = input.delegatorReplyRecipientName?.trim() || null;
    record.delegatorReplyTargetAgentRunId = input.delegatorReplyTargetAgentRunId?.trim() || null;
    record.updatedAt = now;
    return cloneRecord(record);
  }

  markActive(taskId: string): TaskDelegationRecord {
    const record = this.recordsById.get(taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${taskId}' was not found.`,
      );
    }
    if (record.status !== "not_started") {
      throw new TaskDelegationError(
        "INVALID_STATUS_TRANSITION",
        `Delegated task '${taskId}' cannot transition from ${record.status} to active.`,
      );
    }
    if (!record.taskAgentInstance || !record.targetAgentRunId) {
      throw new TaskDelegationError(
        "TASK_AGENT_NOT_BOUND",
        `Delegated task '${taskId}' is not bound to a task-agent instance.`,
      );
    }
    const now = new Date().toISOString();
    record.status = "active";
    record.updatedAt = now;
    return cloneRecord(record);
  }

  markNotStarted(taskIds: string[]): TaskDelegationRecord[] {
    const now = new Date().toISOString();
    const records: TaskDelegationRecord[] = [];
    for (const taskId of taskIds) {
      const record = this.recordsById.get(taskId);
      if (!record || record.status !== "not_started") {
        continue;
      }
      record.taskAgentInstance = null;
      record.targetAgentRunId = null;
      record.delegatorReplyRecipientName = null;
      record.delegatorReplyTargetAgentRunId = null;
      record.updatedAt = now;
      records.push(cloneRecord(record));
    }
    return records;
  }

  acceptTask(input: {
    taskId: string;
    message?: string | null;
  }): TaskDelegationRecord {
    const record = this.recordsById.get(input.taskId);
    if (!record) {
      throw new TaskDelegationError(
        "TASK_NOT_FOUND",
        `Delegated task '${input.taskId}' was not found.`,
      );
    }
    if (record.status !== "active") {
      throw new TaskDelegationError(
        "TASK_NOT_ACTIVE",
        `Delegated task '${input.taskId}' is ${record.status}, not active.`,
      );
    }
    const now = new Date().toISOString();
    record.status = "accepted";
    record.acceptedAt = now;
    record.terminalAt = now;
    record.updatedAt = now;
    record.acceptanceMessage = input.message?.trim() || null;
    return cloneRecord(record);
  }

  hasCurrentWorkForAssignee(memberRouteKey: string): boolean {
    const normalizedRouteKey = memberRouteKey.trim();
    if (!normalizedRouteKey) {
      return false;
    }
    return [...this.recordsById.values()].some(
      (record) =>
        record.member.memberRouteKey === normalizedRouteKey &&
        !isTaskDelegationTerminalStatus(record.status),
    );
  }

  hasCurrentWorkForTaskAgentInstance(taskAgentRunId: string): boolean {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) {
      return false;
    }
    return [...this.recordsById.values()].some(
      (record) =>
        record.taskAgentInstance?.taskAgentRunId === normalizedRunId &&
        !isTaskDelegationTerminalStatus(record.status),
    );
  }

  private nextTaskId(): string {
    this.idCounter += 1;
    return `task_${String(this.idCounter).padStart(4, "0")}`;
  }
}
