import {
  assertAgentTeamAddress,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";

export type ResolvedTeamRecipient = Readonly<{ kind: "agent"; address: AgentTeamAddress }>;

export const createResolvedAgentRecipient = (address: string): ResolvedTeamRecipient =>
  Object.freeze({ kind: "agent", address: assertAgentTeamAddress(address) });
