import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import type { MessageRecipientIndexPort } from "./message-recipient-resolution.js";

/**
 * The `@` note's view of the agent the user is talking to (wording §8): how each mentioned address
 * relates to it, and its own team instance by definition (SR-011). Separate from message resolution:
 * the three root indexes implement both ports.
 */

/** The index facts the `@` note needs about the focused agent. */
export interface MentionViewerIndexPort extends Pick<MessageRecipientIndexPort, "getMessagePlacement" | "isOwnTeamAddress" | "teamInstancesOf"> {
  /** The definitions of one team instance's members and of the team itself, from what the tree recorded; null when it recorded none. */
  instanceDefinitionsOf(teamRunId: string): InstanceDefinitions | null;
  /** The address of an agent execution in this root; null when it is not in the tree. */
  agentAddressOf(agentRunId: string): AgentTeamAddress | null;
}

/** The definitions recorded for one team instance: the team's own (when known) and each member's, with its address in the instance. */
export type InstanceDefinitions = Readonly<{
  teamDefinitionId: string | null;
  members: readonly Readonly<{ address: AgentTeamAddress; definitionId: string }>[];
}>;

/** How an address relates to the agent the user is talking to (decides the `@` note line). */
export type MentionViewerRelation = (address: AgentTeamAddress) => "self" | "own_team" | "other";

/**
 * The focused agent's own team instance by definition (SR-011): its own address, the team's address and
 * definition, and each member's definition and address inside the instance. Needed because the members
 * of a task agent team are not configured placements, so a mention of a teammate would otherwise
 * resolve to its catalog address and be offered `delegate_task`.
 */
export type OwnTeamMentionFacts = Readonly<{
  selfAddress: AgentTeamAddress;
  teamAddress: AgentTeamAddress;
  teamDefinitionId: string | null;
  members: InstanceDefinitions["members"];
}>;

/** Everything the `@` note needs to know about the agent the user is talking to. */
export type MentionViewer = Readonly<{ relation: MentionViewerRelation; ownTeam: OwnTeamMentionFacts | null }>;

/**
 * The relation of an address to one focused agent, from a root's index. `self` is the agent's own
 * placement by identity (a task agent at a configured agent's address is not that agent);
 * `own_team` is exactly what `delegate_task` refuses (CM-1); everything else is `other`.
 */
export const mentionViewerRelation = (
  index: Pick<MentionViewerIndexPort, "getMessagePlacement" | "isOwnTeamAddress">,
  focusedAgentRunId: string,
): MentionViewerRelation => (address) => {
  const placement = index.getMessagePlacement(address);
  if (placement?.kind === "agent" && placement.receiver.agentRunId === focusedAgentRunId) return "self";
  return index.isOwnTeamAddress(focusedAgentRunId, address) ? "own_team" : "other";
};

type RecordedTeamDefinitions = Readonly<{
  teamDefinitionId: string;
  members: readonly Readonly<{ address: AgentTeamAddress; agentDefinitionId: string }>[];
}>;

/**
 * The definitions a team instance's tree record carries: a configured team node's, or a Team copy's
 * from its own source.
 */
export const instanceDefinitionsFromSource = (
  source: RecordedTeamDefinitions | Readonly<{ source: RecordedTeamDefinitions }>,
): InstanceDefinitions => {
  const recorded = "source" in source ? source.source : source;
  return Object.freeze({
    teamDefinitionId: recorded.teamDefinitionId,
    members: Object.freeze(recorded.members.map((member) => Object.freeze({ address: member.address, definitionId: member.agentDefinitionId }))),
  });
};

export const mentionViewerOf = (
  index: MentionViewerIndexPort,
  focusedAgentRunId: string,
): MentionViewer => {
  const selfAddress = index.agentAddressOf(focusedAgentRunId);
  const instance = index.teamInstancesOf(focusedAgentRunId)[0];
  const recorded = instance ? index.instanceDefinitionsOf(instance.teamRunId) : null;
  return Object.freeze({
    relation: mentionViewerRelation(index, focusedAgentRunId),
    ownTeam: selfAddress && instance && recorded
      ? Object.freeze({ selfAddress, teamAddress: instance.address, teamDefinitionId: recorded.teamDefinitionId, members: recorded.members })
      : null,
  });
};
