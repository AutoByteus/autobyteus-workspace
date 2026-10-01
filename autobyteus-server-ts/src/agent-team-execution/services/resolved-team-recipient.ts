import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

/** A delegation target: a configured Agent, or a collaborator (an Agent, Agent Team or Team member) of the run. */
export type TeamDelegationPlacement =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress }>
  | Readonly<{ kind: "agent_team"; address: AgentTeamAddress; coordinatorAddress: AgentTeamAddress }>;
