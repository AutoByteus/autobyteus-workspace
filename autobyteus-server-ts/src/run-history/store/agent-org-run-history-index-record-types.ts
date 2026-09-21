export type AgentOrgRunIndexRowRecord = Readonly<{
  orgRunId: string;
  orgDefinitionId: string;
  orgDefinitionName: string;
  workspaceRootPath: string | null;
  summary: string;
  createdAt: string;
  archivedAt: string | null;
  terminatedAt: string | null;
}>;

export type AgentOrgRunIndexFileRecord = readonly AgentOrgRunIndexRowRecord[];
