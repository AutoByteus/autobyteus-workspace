export interface TeamRunIndexRowRecord {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
}

export type TeamRunIndexFileRecord = TeamRunIndexRowRecord[];
