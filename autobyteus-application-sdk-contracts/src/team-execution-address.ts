export type ApplicationTeamExecutionAddress = Readonly<{
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  memberAddress: string;
  taskAgentRunId: string | null;
}>;
