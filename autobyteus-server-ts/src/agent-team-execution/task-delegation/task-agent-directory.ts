import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { cloneTaskAgentInstanceIdentity, type TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type { TaskDelegationDelegatorIdentity } from "./task-delegation-record.js";

export type TaskAgentDirectoryEntryStatus = "starting" | "active" | "settled";
export type TaskAgentDirectoryEntry = {
  teamRunId: string; taskId: string; memberAddress: AgentTeamAddress;
  delegatorReplyRecipientAddress: string | null; delegatorReplyTargetAgentRunId: string | null;
  delegator: TaskDelegationDelegatorIdentity; taskAgentInstance: TaskAgentInstanceIdentity;
  status: TaskAgentDirectoryEntryStatus; createdAt: string; updatedAt: string;
};
export type RegisterStartingTaskAgentInput = Omit<TaskAgentDirectoryEntry, "teamRunId" | "status" | "createdAt" | "updatedAt">;
const clone = (entry: TaskAgentDirectoryEntry): TaskAgentDirectoryEntry => ({ ...entry, delegator: { ...entry.delegator }, taskAgentInstance: cloneTaskAgentInstanceIdentity(entry.taskAgentInstance) });

export class TaskAgentDirectory {
  private readonly byTask = new Map<string, TaskAgentDirectoryEntry>();
  private readonly taskByRun = new Map<string, string>();
  private readonly settled = new Set<string>();
  constructor(readonly teamRunId: string) {}
  registerStartingTask(input: RegisterStartingTaskAgentInput) {
    const taskId = input.taskId.trim(); const runId = input.taskAgentInstance.taskAgentRunId.trim();
    if (this.byTask.has(taskId) || this.taskByRun.has(runId)) throw new Error(`Task Agent '${taskId}' is already registered.`);
    const now = new Date().toISOString(); const entry = { ...input, teamRunId: this.teamRunId, status: "starting" as const, createdAt: now, updatedAt: now };
    this.byTask.set(taskId, entry); this.taskByRun.set(runId, taskId); this.settled.delete(runId); return clone(entry);
  }
  markActive(taskId: string) { const entry = this.byTask.get(taskId.trim()); if (!entry) return null; entry.status = "active"; entry.updatedAt = new Date().toISOString(); return clone(entry); }
  unregisterStartingTask(taskId: string) { const entry = this.byTask.get(taskId.trim()); if (entry?.status === "starting") this.delete(entry); }
  markSettledByTaskId(taskId: string) { const entry = this.byTask.get(taskId.trim()); if (!entry) return null; this.delete(entry); this.settled.add(entry.taskAgentInstance.taskAgentRunId); entry.status = "settled"; return clone(entry); }
  markSettledByTaskAgentRunId(runId: string) { const taskId = this.taskByRun.get(runId.trim()); if (!taskId) { this.settled.add(runId.trim()); return null; } return this.markSettledByTaskId(taskId); }
  resolveTaskAgentRunId(runId: string) { const taskId = this.taskByRun.get(runId.trim()); const entry = taskId ? this.byTask.get(taskId) : null; return entry?.status === "active" ? clone(entry) : null; }
  isTaskAgentRunSettled(runId: string) { return this.settled.has(runId.trim()); }
  listActiveEntries() { return [...this.byTask.values()].filter((entry) => entry.status === "active").map(clone); }
  clear() { this.byTask.clear(); this.taskByRun.clear(); this.settled.clear(); }
  private delete(entry: TaskAgentDirectoryEntry) { this.byTask.delete(entry.taskId); this.taskByRun.delete(entry.taskAgentInstance.taskAgentRunId); }
}
const directories = new Map<string, TaskAgentDirectory>();
export const getTaskAgentDirectory = (id: string) => { const key = id.trim(); if (!key) throw new Error("teamRunId is required."); let directory = directories.get(key); if (!directory) { directory = new TaskAgentDirectory(key); directories.set(key, directory); } return directory; };
export const disposeTaskAgentDirectory = (id: string) => { directories.get(id.trim())?.clear(); directories.delete(id.trim()); };
