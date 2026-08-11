import type { TeamRun } from "../domain/team-run.js";
import { createTeamExecutionAddress } from "../domain/team-execution-address.js";
import type { ActiveTaskExecutionBinding } from "./active-task-execution-binding.js";

export type TaskTeamActiveRunEntry = Readonly<{
  binding: ActiveTaskExecutionBinding;
  activeRun: TeamRun;
  status: "starting" | "active";
}>;

const runId = (entry: TaskTeamActiveRunEntry): string =>
  entry.binding.executionAddress.taskTeamRunIds.at(-1)!;

const parentRunId = (entry: TaskTeamActiveRunEntry): string => {
  const chain = entry.binding.executionAddress.taskTeamRunIds;
  return chain.length === 1
    ? entry.binding.executionAddress.rootTeamRunId
    : chain.at(-2)!;
};

const clone = (entry: TaskTeamActiveRunEntry): TaskTeamActiveRunEntry => Object.freeze({
  binding: Object.freeze({
    ...entry.binding,
    executionAddress: createTeamExecutionAddress(entry.binding.executionAddress),
  }),
  activeRun: entry.activeRun,
  status: entry.status,
});

export class TaskTeamActiveRunDirectory {
  private readonly entries = new Map<string, TaskTeamActiveRunEntry>();

  bindStartingRun(binding: ActiveTaskExecutionBinding, activeRun: TeamRun): TaskTeamActiveRunEntry {
    if (binding.kind !== "task_team") throw new Error("Task AgentTeam directory requires a task_team binding.");
    const entry: TaskTeamActiveRunEntry = Object.freeze({ binding, activeRun, status: "starting" });
    const id = runId(entry);
    if (!id || this.entries.has(id)) throw new Error(`Task TeamRun '${id}' is already registered.`);
    this.entries.set(id, entry);
    return clone(entry);
  }

  markActive(id: string): TaskTeamActiveRunEntry | null {
    const key = id.trim();
    const entry = this.entries.get(key);
    if (!entry || entry.status !== "starting") return null;
    const active = Object.freeze({ ...entry, status: "active" as const });
    this.entries.set(key, active);
    return clone(active);
  }

  resolveActiveRun(id: string | null | undefined): TeamRun | null {
    return this.resolveActiveEntryByTaskTeamRunId(id)?.activeRun ?? null;
  }

  resolveActiveEntryByTaskTeamRunId(id: string | null | undefined): TaskTeamActiveRunEntry | null {
    const entry = id ? this.entries.get(id.trim()) ?? null : null;
    return entry?.status === "active" && entry.activeRun.isActive() ? clone(entry) : null;
  }

  resolveKnownEntryByTaskTeamRunId(id: string | null | undefined): TaskTeamActiveRunEntry | null {
    const entry = id ? this.entries.get(id.trim()) ?? null : null;
    return entry ? clone(entry) : null;
  }

  unbind(id: string | null | undefined): void { if (id) this.entries.delete(id.trim()); }
  unbindForParentTeamRun(id: string | null | undefined): void {
    if (!id) return;
    for (const [key, entry] of this.entries) {
      if (parentRunId(entry) === id.trim()) this.entries.delete(key);
    }
  }
  listActiveEntriesForParent(id: string | null | undefined): TaskTeamActiveRunEntry[] {
    return id
      ? [...this.entries.values()]
          .filter((entry) => parentRunId(entry) === id.trim() && entry.status === "active" && entry.activeRun.isActive())
          .map(clone)
      : [];
  }
  clear(): void { this.entries.clear(); }
}

let cached: TaskTeamActiveRunDirectory | null = null;
export const getTaskTeamActiveRunDirectory = (): TaskTeamActiveRunDirectory =>
  cached ??= new TaskTeamActiveRunDirectory();
export const disposeTaskTeamActiveRunDirectoryForParentTeamRun = (id: string): void =>
  getTaskTeamActiveRunDirectory().unbindForParentTeamRun(id);
export const clearTaskTeamActiveRunDirectory = (): void => getTaskTeamActiveRunDirectory().clear();
