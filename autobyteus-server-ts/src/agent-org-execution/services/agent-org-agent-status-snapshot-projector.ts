import {
  createCollaborationAgentStatusSnapshot,
  type CollaborationAgentStatusSnapshot,
} from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { createCollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";

/** Projects status leaves of the Org's own agents: its direct agents and the members of its mounted teams. */
export const projectAgentOrgAgentStatusSnapshots = (input: Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  rootAgents: Pick<RootAgentExecutionRegistry, "getStatusSnapshots">;
  teams: Pick<RootTeamExecutionDirectory, "require" | "get">;
}>): readonly CollaborationAgentStatusSnapshot[] => {
  const rootTeamRunIds = input.tree.rootOrg.members.flatMap((member) => "teamRunId" in member ? [member.teamRunId] : []);
  const live = [
    ...input.rootAgents.getStatusSnapshots(),
    ...rootTeamRunIds.flatMap((teamRunId) => input.teams.require(teamRunId).getLeafAgentStatusSnapshots()),
  ];
  // Every agent without a live execution reports `offline`.
  const reported = new Set(live.map((snapshot) => snapshot.execution.agentRunId));
  const index = new AgentOrgExecutionIndex(input.tree);
  const dormant = index.listAgents()
    .filter((agent) => !reported.has(agent.agentRunId))
    .map((agent) => createCollaborationAgentStatusSnapshot({
      execution: createCollaborationMemberExecutionIdentity({ root: index.root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
      status: "offline",
    }));
  return Object.freeze([...live, ...dormant]);
};
