export const TEAM_RUN_HISTORY_INDEX_RECORD_VERSION = 1;

export type TeamRunStatusRecord = "ACTIVE" | "IDLE" | "ERROR";

export type TeamRunDeleteLifecycleRecord = "READY" | "CLEANUP_PENDING";

export interface TeamRunIndexRowRecord {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  lastActivityAt: string;
  lastKnownStatus: TeamRunStatusRecord;
  deleteLifecycle: TeamRunDeleteLifecycleRecord;
}

export interface TeamRunIndexFileRecord {
  version: number;
  rows: TeamRunIndexRowRecord[];
}
