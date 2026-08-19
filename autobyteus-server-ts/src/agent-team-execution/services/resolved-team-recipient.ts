import {
  assertAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";

export type ResolvedTeamRecipient =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress }>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      coordinatorAddress: AgentTeamAddress;
    }>;

export const createResolvedAgentRecipient = (address: string): ResolvedTeamRecipient =>
  Object.freeze({ kind: "agent", address: assertAgentTeamAddress(address) });

export const createResolvedAgentTeamRecipient = (input: {
  address: string;
  coordinatorAddress: string;
}): ResolvedTeamRecipient => Object.freeze({
  kind: "agent_team",
  address: assertAgentTeamAddress(input.address),
  coordinatorAddress: assertAgentTeamAddress(input.coordinatorAddress),
});
