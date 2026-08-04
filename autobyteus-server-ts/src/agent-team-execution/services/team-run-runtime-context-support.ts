import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
import type { TeamRunAgentTeamNode } from "../domain/team-run-config.js";
import { createTeamExecutionAddress } from "../domain/team-execution-address.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../backends/mixed/mixed-team-run-context.js";

const buildRuntimeContext = (
  rootTeamRunId: string,
  team: TeamRunAgentTeamNode,
): MixedTeamRunContext => new MixedTeamRunContext({
  memberContexts: team.children.map((node) => node.kind === "agent"
    ? new MixedAgentMemberContext({
        address: node.address,
        agentRunId: node.agentRunId,
        runtimeKind: node.runtimeKind,
        platformAgentRunId: node.platformAgentRunId,
      })
    : new MixedSubTeamMemberContext({
        address: node.address,
        teamDefinitionId: node.teamDefinitionId,
        teamRunId: node.teamRunId,
        childRuntimeContext: buildRuntimeContext(rootTeamRunId, node),
      })),
  teamExecutionAddress: createTeamExecutionAddress({
    rootTeamRunId,
    memberAddress: team.address,
  }),
});

export const buildRestoreTeamRunRuntimeContext = (
  metadata: TeamRunMetadata,
): MixedTeamRunContext => buildRuntimeContext(metadata.rootTeam.teamRunId, metadata.rootTeam);
