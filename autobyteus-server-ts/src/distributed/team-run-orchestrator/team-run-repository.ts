import type { RunVersion } from "../envelope/envelope-builder.js";
import type { PlacementByMember } from "../member-placement/member-placement-resolver.js";

export type TeamRunStatus = "running" | "degraded" | "stopped";

export type TeamRunRecord = {
  teamRunId: string;
  teamDefinitionId: string;
  coordinatorMemberName: string;
  runVersion: RunVersion;
  hostNodeId: string;
  placementByMember: PlacementByMember;
  status: TeamRunStatus;
  createdAtIso: string;
  updatedAtIso: string;
};

export class TeamRunRepository {
  private readonly runById = new Map<string, TeamRunRecord>();
  private readonly runIdByDefinitionId = new Map<string, string>();
  private readonly nextRunVersionByDefinitionId = new Map<string, number>();

  allocateNextRunVersion(teamDefinitionId: string): number {
    const nextValue = (this.nextRunVersionByDefinitionId.get(teamDefinitionId) ?? 0) + 1;
    this.nextRunVersionByDefinitionId.set(teamDefinitionId, nextValue);
    return nextValue;
  }

  createRunRecord(record: TeamRunRecord): TeamRunRecord {
    this.runById.set(record.teamRunId, record);
    this.runIdByDefinitionId.set(record.teamDefinitionId, record.teamRunId);
    return record;
  }

  getRunById(teamRunId: string): TeamRunRecord | null {
    return this.runById.get(teamRunId) ?? null;
  }

  getActiveRunByDefinitionId(teamDefinitionId: string): TeamRunRecord | null {
    const runId = this.runIdByDefinitionId.get(teamDefinitionId);
    if (!runId) {
      return null;
    }
    const run = this.runById.get(runId) ?? null;
    if (!run || run.status === "stopped") {
      return null;
    }
    return run;
  }

  resolveCurrentRunVersion(teamRunId: string): RunVersion | null {
    return this.getRunById(teamRunId)?.runVersion ?? null;
  }

  updateRunStatus(teamRunId: string, status: TeamRunStatus): TeamRunRecord | null {
    const record = this.runById.get(teamRunId);
    if (!record) {
      return null;
    }
    const updated: TeamRunRecord = {
      ...record,
      status,
      updatedAtIso: new Date().toISOString(),
    };
    this.runById.set(teamRunId, updated);
    return updated;
  }

  deleteRun(teamRunId: string): boolean {
    const record = this.runById.get(teamRunId);
    if (!record) {
      return false;
    }
    this.runIdByDefinitionId.delete(record.teamDefinitionId);
    return this.runById.delete(teamRunId);
  }
}
