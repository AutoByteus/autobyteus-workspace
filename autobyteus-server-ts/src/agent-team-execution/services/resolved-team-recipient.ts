import {
  assertAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";

/** A message recipient: always a configured Agent ingress. */
export type ResolvedTeamRecipient = Readonly<{ kind: "agent"; address: AgentTeamAddress }>;

/** A delegation target: a configured Agent, or a collaborator Agent or Agent Team of the run. */
export type TeamDelegationPlacement =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress }>
  | Readonly<{ kind: "agent_team"; address: AgentTeamAddress; coordinatorAddress: AgentTeamAddress }>;

export const createResolvedAgentRecipient = (address: string): ResolvedTeamRecipient =>
  Object.freeze({ kind: "agent", address: assertAgentTeamAddress(address) });
