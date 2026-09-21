import type { CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRootAgentExecutionRegistry } from "./agent-org-root-agent-execution-registry.js";
import type { AgentOrgTeamExecutionDirectory } from "./agent-org-team-execution-directory.js";

/**
 * Projects status leaves from the structural execution roots owned by the Org.
 *
 * The Team directory is intentionally flat for exact identity/lifecycle lookup,
 * while every TeamRun recursively owns the task Teams beneath it. Walking every
 * directory entry would therefore visit nested task-Team leaves more than once.
 */
export const projectAgentOrgAgentStatusSnapshots = (input: Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  rootAgents: Pick<AgentOrgRootAgentExecutionRegistry, "listHandles">;
  teams: Pick<AgentOrgTeamExecutionDirectory, "require">;
}>): readonly CollaborationAgentStatusSnapshot[] => {
  const rootTeamRunIds = [
    ...input.tree.rootOrg.members.flatMap((member) => "teamRunId" in member ? [member.teamRunId] : []),
    ...input.tree.rootOrg.taskExecutions.flatMap((task) =>
      "teamRunId" in task && task.settledAt === null ? [task.teamRunId] : []),
  ];
  return Object.freeze([
    ...input.rootAgents.listHandles().map((handle) => handle.getStatusSnapshot()),
    ...rootTeamRunIds.flatMap((teamRunId) => input.teams.require(teamRunId).getLeafAgentStatusSnapshots()),
  ]);
};
