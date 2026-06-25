import type { TeamRun } from "../domain/team-run.js";
import {
  TaskDelegationService,
  type TaskDelegationServiceOptions,
} from "./task-delegation-service.js";

type RegistryEntry = {
  run: TeamRun;
  service: TaskDelegationService;
};

export class TaskDelegationRunRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  constructor(private readonly serviceOptions: TaskDelegationServiceOptions = {}) {}

  getOrCreate(run: TeamRun): TaskDelegationService {
    const existing = this.entries.get(run.runId) ?? null;
    if (existing && existing.run === run && run.isActive()) {
      return existing.service;
    }
    if (existing) {
      existing.service.dispose();
      this.entries.delete(run.runId);
    }
    const service = new TaskDelegationService(run, this.serviceOptions);
    this.entries.set(run.runId, { run, service });
    return service;
  }

  detach(teamRunId: string): void {
    const entry = this.entries.get(teamRunId) ?? null;
    if (!entry) {
      return;
    }
    entry.service.dispose();
    this.entries.delete(teamRunId);
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      entry.service.dispose();
    }
    this.entries.clear();
  }
}

let cachedTaskDelegationRunRegistry: TaskDelegationRunRegistry | null = null;

export const getTaskDelegationRunRegistry = (): TaskDelegationRunRegistry => {
  if (!cachedTaskDelegationRunRegistry) {
    cachedTaskDelegationRunRegistry = new TaskDelegationRunRegistry();
  }
  return cachedTaskDelegationRunRegistry;
};
