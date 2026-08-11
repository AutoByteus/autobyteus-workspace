import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../domain/team-execution-address.js";
import type { TaskDelegationDelegatorIdentity } from "./task-delegation-record.js";

export type TaskAgentDirectoryEntryStatus = "starting" | "active" | "settled";
export type TaskAgentDirectoryEntry = {
  taskId: string;
  memberAddress: AgentTeamAddress;
  executionAddress: TeamExecutionAddress;
  delegatorReplyRecipientAddress: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  delegator: TaskDelegationDelegatorIdentity;
  status: TaskAgentDirectoryEntryStatus;
};
export type RegisterStartingTaskAgentInput = Omit<TaskAgentDirectoryEntry, "status">;

const clone = (entry: TaskAgentDirectoryEntry): TaskAgentDirectoryEntry => ({
  ...entry,
  executionAddress: createTeamExecutionAddress(entry.executionAddress),
  delegator: {
    ...entry.delegator,
    executionAddress: createTeamExecutionAddress(entry.delegator.executionAddress),
  },
});

const taskAgentRunId = (entry: TaskAgentDirectoryEntry): string => {
  const runId = entry.executionAddress.taskAgentRunId;
  if (!runId) throw new Error(`Task Agent '${entry.taskId}' has no taskAgentRunId.`);
  return runId;
};

export class TaskAgentDirectory {
  private readonly byTask = new Map<string, TaskAgentDirectoryEntry>();
  private readonly taskByRun = new Map<string, string>();
  private readonly settled = new Set<string>();

  constructor(readonly rootTeamRunId: string) {}

  registerStartingTask(input: RegisterStartingTaskAgentInput): TaskAgentDirectoryEntry {
    const taskId = input.taskId.trim();
    const executionAddress = createTeamExecutionAddress(input.executionAddress);
    const runId = executionAddress.taskAgentRunId;
    if (!taskId || !runId || executionAddress.rootTeamRunId !== this.rootTeamRunId) {
      throw new Error("Task Agent directory requires an exact root-scoped task execution address.");
    }
    if (this.byTask.has(taskId) || this.taskByRun.has(runId)) {
      throw new Error(`Task Agent '${taskId}' is already registered.`);
    }
    const entry: TaskAgentDirectoryEntry = { ...input, taskId, executionAddress, status: "starting" };
    this.byTask.set(taskId, entry);
    this.taskByRun.set(runId, taskId);
    this.settled.delete(runId);
    return clone(entry);
  }

  markActive(taskId: string): TaskAgentDirectoryEntry | null {
    const entry = this.byTask.get(taskId.trim());
    if (!entry || entry.status !== "starting") return null;
    entry.status = "active";
    return clone(entry);
  }

  unregisterPreparedTask(taskId: string): void {
    const entry = this.byTask.get(taskId.trim());
    if (entry && entry.status !== "settled") this.delete(entry);
  }

  markSettledByTaskId(taskId: string): TaskAgentDirectoryEntry | null {
    const entry = this.byTask.get(taskId.trim());
    if (!entry) return null;
    this.delete(entry);
    this.settled.add(taskAgentRunId(entry));
    entry.status = "settled";
    return clone(entry);
  }

  markSettledByTaskAgentRunId(runId: string): TaskAgentDirectoryEntry | null {
    const normalized = runId.trim();
    const taskId = this.taskByRun.get(normalized);
    if (!taskId) {
      if (normalized) this.settled.add(normalized);
      return null;
    }
    return this.markSettledByTaskId(taskId);
  }

  resolveTaskAgentRunId(runId: string): TaskAgentDirectoryEntry | null {
    const taskId = this.taskByRun.get(runId.trim());
    const entry = taskId ? this.byTask.get(taskId) : null;
    return entry?.status === "active" ? clone(entry) : null;
  }

  isTaskAgentRunSettled(runId: string): boolean { return this.settled.has(runId.trim()); }
  listActiveEntries(): TaskAgentDirectoryEntry[] {
    return [...this.byTask.values()].filter((entry) => entry.status === "active").map(clone);
  }
  clear(): void { this.byTask.clear(); this.taskByRun.clear(); this.settled.clear(); }

  private delete(entry: TaskAgentDirectoryEntry): void {
    this.byTask.delete(entry.taskId);
    this.taskByRun.delete(taskAgentRunId(entry));
  }
}

const directories = new Map<string, TaskAgentDirectory>();
export const getTaskAgentDirectory = (id: string): TaskAgentDirectory => {
  const key = id.trim();
  if (!key) throw new Error("rootTeamRunId is required.");
  let directory = directories.get(key);
  if (!directory) {
    directory = new TaskAgentDirectory(key);
    directories.set(key, directory);
  }
  return directory;
};
export const disposeTaskAgentDirectory = (id: string): void => {
  directories.get(id.trim())?.clear();
  directories.delete(id.trim());
};
