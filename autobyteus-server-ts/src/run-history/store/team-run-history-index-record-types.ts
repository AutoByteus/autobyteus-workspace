export interface TeamRunIndexRowRecord {
  teamRunId: string;
  teamDefinitionId: string;
  teamDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
  /** The Project the Team run was started under (projected from its tree); absent means none. */
  projectId?: string;
}

export type TeamRunIndexFileRecord = TeamRunIndexRowRecord[];
