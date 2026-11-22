import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";

/**
 * What an address an agent of a contained Team gives means (design R-1'', R-1'''): a member of its own Team (`P/x`,
 * in team space `/x`), the Team's own Org address `P` (its meaning depends on the surface: the coordinator for
 * `send_message_to`, the own Team for `delegate_task`), or any other address, which is Org space (the container answers).
 */
export type ContainedTeamAddressInput =
  | Readonly<{ kind: "member"; teamAddress: AgentTeamAddress }>
  | Readonly<{ kind: "own_team" }>
  | Readonly<{ kind: "org"; orgAddress: AgentTeamAddress }>;

/**
 * The one tool-facing address boundary of a Team run contained in an Org (design R-1'', R-1'''): its tree, index,
 * membership planner, committer and intra-Team log stay in team space (members at `/x`); every address an agent of the
 * Team gives is read in (`input`), and every team-space address it is shown is translated out (`toOrg`) with the Team's
 * Org address `P` (`containedIn.address`). `P` is never mapped to the root `/`.
 */
export class ContainedTeamAddressSpace {
  private constructor(readonly prefix: AgentTeamAddress) {}

  /** The boundary of a contained Team run; `null` for a Team run outside any Org (its addresses are shown as they are). */
  static of(containedIn: ContainedIn | null | undefined): ContainedTeamAddressSpace | null {
    return containedIn ? new ContainedTeamAddressSpace(containedIn.address) : null;
  }

  /** In: an address an agent of the Team gave. */
  input(address: AgentTeamAddress): ContainedTeamAddressInput {
    if (address === this.prefix) return Object.freeze({ kind: "own_team" });
    if (isAgentTeamAddressAncestor(this.prefix, address)) {
      return Object.freeze({ kind: "member", teamAddress: createAgentTeamAddress(getAgentTeamAddressSegments(address).slice(getAgentTeamAddressSegments(this.prefix).length)) });
    }
    return Object.freeze({ kind: "org", orgAddress: address });
  }

  /** Out: a team-space address in the Org (`/x` → `P/x`; the Team instance `/` → `P`). */
  toOrg(teamAddress: string): AgentTeamAddress {
    return createAgentTeamAddress([...getAgentTeamAddressSegments(this.prefix), ...getAgentTeamAddressSegments(teamAddress)]);
  }

  /** Out: an Org address of this Team (`P/x` → `/x`); `null` for an address outside it, including `P` itself. */
  fromOrg(orgAddress: string): AgentTeamAddress | null {
    const read = this.input(orgAddress as AgentTeamAddress);
    return read.kind === "member" ? read.teamAddress : null;
  }

  /** Out: the Team's own rules (team space: a contained Team's rules are between its members) in the Org. */
  rulesToOrg(handoffs: readonly CollaborationHandoff[]): CollaborationHandoff[] {
    return handoffs.map((handoff) => Object.freeze({ ...handoff, from: this.toOrg(handoff.from), to: this.toOrg(handoff.to) }));
  }
}
