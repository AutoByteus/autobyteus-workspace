import type { TeamRun } from "../domain/team-run.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import { cloneTaskTeamInstanceIdentity } from "../domain/task-team-instance.js";

export type TaskTeamActiveRunEntry = {
  parentTeamRunId: string;
  taskId: string;
  logicalTeamRouteKey: string;
  taskTeamRunId: string;
  childTeamRunId: string;
  identity: TaskTeamInstanceIdentity;
  activeRun: TeamRun;
  boundAt: string;
};

const cloneEntry = (entry: TaskTeamActiveRunEntry): TaskTeamActiveRunEntry => ({
  ...entry,
  identity: cloneTaskTeamInstanceIdentity(entry.identity),
  activeRun: entry.activeRun,
});

export class TaskTeamActiveRunDirectory {
  private readonly entryByTaskTeamRunId = new Map<string, TaskTeamActiveRunEntry>();
  private readonly taskTeamRunIdByChildTeamRunId = new Map<string, string>();
  private readonly taskTeamRunIdsByParentTeamRunId = new Map<string, Set<string>>();

  bindActiveRun(
    identity: TaskTeamInstanceIdentity,
    run: TeamRun,
  ): TaskTeamActiveRunEntry {
    const taskTeamRunId = identity.taskTeamRunId.trim();
    const taskId = identity.taskId.trim();
    const parentTeamRunId = identity.parentTeamRunId.trim();
    const childTeamRunId = run.runId.trim();
    if (!taskTeamRunId || !taskId || !parentTeamRunId || !childTeamRunId) {
      throw new Error("taskTeamRunId, taskId, parentTeamRunId, and childTeamRunId are required.");
    }

    this.unbind(taskTeamRunId);
    const entry: TaskTeamActiveRunEntry = {
      parentTeamRunId,
      taskId,
      logicalTeamRouteKey: identity.logicalTeam.memberRouteKey,
      taskTeamRunId,
      childTeamRunId,
      identity: cloneTaskTeamInstanceIdentity(identity),
      activeRun: run,
      boundAt: new Date().toISOString(),
    };
    this.entryByTaskTeamRunId.set(taskTeamRunId, entry);
    this.taskTeamRunIdByChildTeamRunId.set(childTeamRunId, taskTeamRunId);
    this.taskTeamRunIdByChildTeamRunId.set(taskTeamRunId, taskTeamRunId);
    let parentEntries = this.taskTeamRunIdsByParentTeamRunId.get(parentTeamRunId) ?? null;
    if (!parentEntries) {
      parentEntries = new Set<string>();
      this.taskTeamRunIdsByParentTeamRunId.set(parentTeamRunId, parentEntries);
    }
    parentEntries.add(taskTeamRunId);
    return cloneEntry(entry);
  }

  resolveActiveRun(teamRunIdOrTaskTeamRunId: string | null | undefined): TeamRun | null {
    const normalizedRunId = teamRunIdOrTaskTeamRunId?.trim();
    if (!normalizedRunId) return null;
    const taskTeamRunId = this.taskTeamRunIdByChildTeamRunId.get(normalizedRunId) ?? normalizedRunId;
    const entry = this.entryByTaskTeamRunId.get(taskTeamRunId) ?? null;
    if (!entry?.activeRun.isActive()) return null;
    return entry.activeRun;
  }

  resolveActiveEntryByTaskTeamRunId(
    taskTeamRunIdInput: string | null | undefined,
  ): TaskTeamActiveRunEntry | null {
    const taskTeamRunId = taskTeamRunIdInput?.trim();
    if (!taskTeamRunId) return null;
    const entry = this.entryByTaskTeamRunId.get(taskTeamRunId) ?? null;
    return entry?.activeRun.isActive() ? cloneEntry(entry) : null;
  }

  resolveKnownEntryByTaskTeamRunId(
    taskTeamRunIdInput: string | null | undefined,
  ): TaskTeamActiveRunEntry | null {
    const taskTeamRunId = taskTeamRunIdInput?.trim();
    if (!taskTeamRunId) return null;
    const entry = this.entryByTaskTeamRunId.get(taskTeamRunId) ?? null;
    return entry ? cloneEntry(entry) : null;
  }

  unbind(taskTeamRunIdInput: string | null | undefined): void {
    const taskTeamRunId = taskTeamRunIdInput?.trim();
    if (!taskTeamRunId) return;
    const entry = this.entryByTaskTeamRunId.get(taskTeamRunId) ?? null;
    if (!entry) return;
    this.entryByTaskTeamRunId.delete(taskTeamRunId);
    this.taskTeamRunIdByChildTeamRunId.delete(entry.childTeamRunId);
    this.taskTeamRunIdByChildTeamRunId.delete(entry.taskTeamRunId);
    const parentEntries = this.taskTeamRunIdsByParentTeamRunId.get(entry.parentTeamRunId) ?? null;
    parentEntries?.delete(taskTeamRunId);
    if (parentEntries?.size === 0) {
      this.taskTeamRunIdsByParentTeamRunId.delete(entry.parentTeamRunId);
    }
  }

  unbindForParentTeamRun(parentTeamRunIdInput: string | null | undefined): void {
    const parentTeamRunId = parentTeamRunIdInput?.trim();
    if (!parentTeamRunId) return;
    for (const taskTeamRunId of [...(this.taskTeamRunIdsByParentTeamRunId.get(parentTeamRunId) ?? [])]) {
      this.unbind(taskTeamRunId);
    }
  }

  listActiveEntriesForParent(parentTeamRunIdInput: string | null | undefined): TaskTeamActiveRunEntry[] {
    const parentTeamRunId = parentTeamRunIdInput?.trim();
    if (!parentTeamRunId) return [];
    return [...(this.taskTeamRunIdsByParentTeamRunId.get(parentTeamRunId) ?? [])]
      .map((taskTeamRunId) => this.resolveActiveEntryByTaskTeamRunId(taskTeamRunId))
      .filter((entry): entry is TaskTeamActiveRunEntry => entry !== null);
  }

  clear(): void {
    this.entryByTaskTeamRunId.clear();
    this.taskTeamRunIdByChildTeamRunId.clear();
    this.taskTeamRunIdsByParentTeamRunId.clear();
  }
}

let cachedTaskTeamActiveRunDirectory: TaskTeamActiveRunDirectory | null = null;

export const getTaskTeamActiveRunDirectory = (): TaskTeamActiveRunDirectory => {
  if (!cachedTaskTeamActiveRunDirectory) {
    cachedTaskTeamActiveRunDirectory = new TaskTeamActiveRunDirectory();
  }
  return cachedTaskTeamActiveRunDirectory;
};

export const disposeTaskTeamActiveRunDirectoryForParentTeamRun = (parentTeamRunId: string): void => {
  getTaskTeamActiveRunDirectory().unbindForParentTeamRun(parentTeamRunId);
};

export const clearTaskTeamActiveRunDirectory = (): void => {
  getTaskTeamActiveRunDirectory().clear();
};
