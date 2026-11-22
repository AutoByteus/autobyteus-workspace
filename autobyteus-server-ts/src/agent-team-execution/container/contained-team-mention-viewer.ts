import { mentionViewerOf, mentionViewerRelation, type MentionViewer } from "../../agent-collaboration/collaborators/mention-viewer.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import { ContainedTeamAddressSpace } from "./contained-team-address-space.js";

/**
 * The `@` note's view of a Team run's focused member (wording §8). A Team unit's member sees through its address
 * boundary (design R-1'', R-1'''): a mentioned `P/x` relates as its teammate `/x` does, `P` is its own Team, any other
 * address is another unit's or the catalog's; its own Team is mentioned at `P`, its members at `P/x` (as in the Org before).
 */
export const teamMentionViewerOf = (index: TeamExecutionIndex, focusedAgentRunId: string): MentionViewer => {
  const space = ContainedTeamAddressSpace.of(index.tree.containedIn);
  if (!space) return mentionViewerOf(index, focusedAgentRunId);
  const inTeam = mentionViewerRelation(index, focusedAgentRunId);
  const self = index.agentAddressOf(focusedAgentRunId);
  return Object.freeze({
    relation: (address) => {
      const read = space.input(address);
      return read.kind === "member" ? inTeam(read.teamAddress) : read.kind === "own_team" ? "own_team" : "other";
    },
    ownTeam: self ? Object.freeze({
      selfAddress: space.toOrg(self),
      teamAddress: space.prefix,
      teamDefinitionId: index.tree.rootTeam.teamDefinitionId,
      members: Object.freeze(index.tree.rootTeam.members.map((member) => Object.freeze({ address: space.toOrg(member.address), definitionId: member.agentDefinitionId }))),
    }) : null,
  });
};
