import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import { cloneTaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type {
  TaskDelegationDelegatorIdentity,
  TaskDelegationMemberIdentity,
} from "./task-delegation-record.js";

export type TaskAgentDirectoryEntryStatus = "starting" | "active" | "settled";

export type TaskAgentDirectoryEntry = {
  teamRunId: string;
  taskId: string;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  logicalMember: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity;
  status: TaskAgentDirectoryEntryStatus;
  createdAt: string;
  updatedAt: string;
};

export type RegisterStartingTaskAgentInput = {
  taskId: string;
  logicalMember: TaskDelegationMemberIdentity;
  delegator: TaskDelegationDelegatorIdentity;
  taskAgentInstance: TaskAgentInstanceIdentity;
  delegatorReplyRecipientName?: string | null;
  delegatorReplyTargetAgentRunId?: string | null;
};

const cloneMember = (member: TaskDelegationMemberIdentity): TaskDelegationMemberIdentity => ({
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  runtimeKind: member.runtimeKind ?? null,
});

const cloneDelegator = (delegator: TaskDelegationDelegatorIdentity): TaskDelegationDelegatorIdentity => ({
  ...cloneMember(delegator),
  taskAgentInstanceId: delegator.taskAgentInstanceId ?? null,
  taskAgentRunId: delegator.taskAgentRunId ?? null,
  taskId: delegator.taskId ?? null,
  logicalMemberRouteKey: delegator.logicalMemberRouteKey ?? null,
});

const cloneEntry = (entry: TaskAgentDirectoryEntry): TaskAgentDirectoryEntry => ({
  ...entry,
  logicalMember: cloneMember(entry.logicalMember),
  delegator: cloneDelegator(entry.delegator),
  taskAgentInstance: cloneTaskAgentInstanceIdentity(entry.taskAgentInstance),
});

export class TaskAgentDirectory {
  private readonly entriesByTaskId = new Map<string, TaskAgentDirectoryEntry>();
  private readonly taskIdsByRunId = new Map<string, string>();
  private readonly settledTaskAgentRunIds = new Set<string>();

  constructor(readonly teamRunId: string) {}

  registerStartingTask(input: RegisterStartingTaskAgentInput): TaskAgentDirectoryEntry {
    const taskId = input.taskId.trim();
    const taskAgentRunId = input.taskAgentInstance.taskAgentRunId.trim();
    this.settledTaskAgentRunIds.delete(taskAgentRunId);
    const existingByTask = this.entriesByTaskId.get(taskId) ?? null;
    if (existingByTask && existingByTask.status !== "settled") {
      throw new Error(`Task-agent directory entry for task '${taskId}' already exists.`);
    }
    const existingTaskForRun = this.taskIdsByRunId.get(taskAgentRunId) ?? null;
    if (existingTaskForRun && existingTaskForRun !== taskId) {
      throw new Error(`Task-agent run '${taskAgentRunId}' is already active.`);
    }
    const now = new Date().toISOString();
    const entry: TaskAgentDirectoryEntry = {
      teamRunId: this.teamRunId,
      taskId,
      delegatorReplyRecipientName: input.delegatorReplyRecipientName?.trim() || null,
      delegatorReplyTargetAgentRunId: input.delegatorReplyTargetAgentRunId?.trim() || null,
      logicalMember: cloneMember(input.logicalMember),
      delegator: cloneDelegator(input.delegator),
      taskAgentInstance: cloneTaskAgentInstanceIdentity(input.taskAgentInstance),
      status: "starting",
      createdAt: now,
      updatedAt: now,
    };
    this.entriesByTaskId.set(taskId, entry);
    this.taskIdsByRunId.set(taskAgentRunId, taskId);
    return cloneEntry(entry);
  }

  markActive(taskId: string): TaskAgentDirectoryEntry | null {
    const entry = this.entriesByTaskId.get(taskId.trim()) ?? null;
    if (!entry || entry.status === "settled") {
      return null;
    }
    entry.status = "active";
    entry.updatedAt = new Date().toISOString();
    return cloneEntry(entry);
  }

  unregisterStartingTask(taskId: string): void {
    const entry = this.entriesByTaskId.get(taskId.trim()) ?? null;
    if (!entry || entry.status !== "starting") {
      return;
    }
    this.deleteEntry(entry);
  }

  markSettledByTaskId(taskId: string): TaskAgentDirectoryEntry | null {
    const entry = this.entriesByTaskId.get(taskId.trim()) ?? null;
    if (!entry) {
      return null;
    }
    this.deleteEntry(entry);
    this.settledTaskAgentRunIds.add(entry.taskAgentInstance.taskAgentRunId);
    entry.status = "settled";
    entry.updatedAt = new Date().toISOString();
    return cloneEntry(entry);
  }

  markSettledByTaskAgentRunId(taskAgentRunId: string): TaskAgentDirectoryEntry | null {
    const normalizedRunId = taskAgentRunId.trim();
    if (!normalizedRunId) {
      return null;
    }
    const taskId = this.taskIdsByRunId.get(normalizedRunId) ?? null;
    if (!taskId) {
      this.settledTaskAgentRunIds.add(normalizedRunId);
      return null;
    }
    return this.markSettledByTaskId(taskId);
  }

  resolveTaskAgentRunId(taskAgentRunId: string): TaskAgentDirectoryEntry | null {
    const normalizedRunId = taskAgentRunId.trim();
    if (this.settledTaskAgentRunIds.has(normalizedRunId)) {
      return null;
    }
    const taskId = this.taskIdsByRunId.get(normalizedRunId) ?? null;
    const entry = taskId ? this.entriesByTaskId.get(taskId) ?? null : null;
    return entry && entry.status === "active" ? cloneEntry(entry) : null;
  }

  isTaskAgentRunSettled(taskAgentRunId: string): boolean {
    return this.settledTaskAgentRunIds.has(taskAgentRunId.trim());
  }

  listActiveEntries(): TaskAgentDirectoryEntry[] {
    return [...this.entriesByTaskId.values()]
      .filter((entry) => entry.status === "active")
      .map(cloneEntry);
  }

  clear(): void {
    this.entriesByTaskId.clear();
    this.taskIdsByRunId.clear();
    this.settledTaskAgentRunIds.clear();
  }

  private deleteEntry(entry: TaskAgentDirectoryEntry): void {
    this.entriesByTaskId.delete(entry.taskId);
    this.taskIdsByRunId.delete(entry.taskAgentInstance.taskAgentRunId);
  }
}

const taskAgentDirectories = new Map<string, TaskAgentDirectory>();

export const getTaskAgentDirectory = (teamRunId: string): TaskAgentDirectory => {
  const normalized = teamRunId.trim();
  if (!normalized) {
    throw new Error("teamRunId is required for task-agent directory lookup.");
  }
  const existing = taskAgentDirectories.get(normalized) ?? null;
  if (existing) {
    return existing;
  }
  const directory = new TaskAgentDirectory(normalized);
  taskAgentDirectories.set(normalized, directory);
  return directory;
};

export const disposeTaskAgentDirectory = (teamRunId: string): void => {
  const normalized = teamRunId.trim();
  const directory = taskAgentDirectories.get(normalized) ?? null;
  directory?.clear();
  taskAgentDirectories.delete(normalized);
};
