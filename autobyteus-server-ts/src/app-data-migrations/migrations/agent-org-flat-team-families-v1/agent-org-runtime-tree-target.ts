import type { ReleasedTeamRunV2 } from "./released-team-run-v2-schema.js";

export const orgTreeTarget = (released: ReleasedTeamRunV2): unknown => {
  const root = released.root as Record<string, unknown>;
  const team = released.rootTeam as Record<string, unknown>;
  return {
    schemaVersion: 1, subjectKind: "agent_org", createdAt: root.createdAt, archivedAt: root.archivedAt,
    applicationBinding: root.applicationBinding, handoffs: root.handoffs,
    rootOrg: { address: "/", orgDefinitionId: team.teamDefinitionId, orgDefinitionName: team.teamDefinitionName,
      orgRunId: team.teamRunId, defaultLaunchConfiguration: team.defaultLaunchConfiguration,
      members: team.members, taskExecutions: team.taskExecutions },
  };
};
