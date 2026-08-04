import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRun } from "../domain/team-run.js";
import { cloneTaskTeamInstanceIdentity, type TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";

export type TaskTeamActiveRunEntry = Readonly<{
  parentTeamRunId: string;
  taskId: string;
  memberAddress: AgentTeamAddress;
  taskTeamRunId: string;
  identity: TaskTeamInstanceIdentity;
  activeRun: TeamRun;
  boundAt: string;
}>;

export class TaskTeamActiveRunDirectory {
  private readonly entries = new Map<string, TaskTeamActiveRunEntry>();
  bindActiveRun(identity: TaskTeamInstanceIdentity, run: TeamRun): TaskTeamActiveRunEntry {
    const entry = Object.freeze({ parentTeamRunId: identity.parentTeamRunId, taskId: identity.taskId, memberAddress: run.context.teamAddress, taskTeamRunId: identity.taskTeamRunId, identity: cloneTaskTeamInstanceIdentity(identity), activeRun: run, boundAt: new Date().toISOString() });
    this.entries.set(identity.taskTeamRunId, entry); return entry;
  }
  resolveActiveRun(id: string | null | undefined) { const entry = id ? this.entries.get(id.trim()) : null; return entry?.activeRun.isActive() ? entry.activeRun : null; }
  resolveActiveEntryByTaskTeamRunId(id: string | null | undefined) { const entry = id ? this.entries.get(id.trim()) ?? null : null; return entry?.activeRun.isActive() ? entry : null; }
  resolveKnownEntryByTaskTeamRunId(id: string | null | undefined) { return id ? this.entries.get(id.trim()) ?? null : null; }
  unbind(id: string | null | undefined) { if (id) this.entries.delete(id.trim()); }
  unbindForParentTeamRun(id: string | null | undefined) { if (id) for (const [key, entry] of this.entries) if (entry.parentTeamRunId === id.trim()) this.entries.delete(key); }
  listActiveEntriesForParent(id: string | null | undefined) { return id ? [...this.entries.values()].filter((entry) => entry.parentTeamRunId === id.trim() && entry.activeRun.isActive()) : []; }
  clear() { this.entries.clear(); }
}

let cached: TaskTeamActiveRunDirectory | null = null;
export const getTaskTeamActiveRunDirectory = () => cached ??= new TaskTeamActiveRunDirectory();
export const disposeTaskTeamActiveRunDirectoryForParentTeamRun = (id: string) => getTaskTeamActiveRunDirectory().unbindForParentTeamRun(id);
export const clearTaskTeamActiveRunDirectory = () => getTaskTeamActiveRunDirectory().clear();
