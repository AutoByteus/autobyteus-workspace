import type { CollaborationHandoff } from "../../domain/collaboration-handoff.js";
import { getParentAgentTeamAddress, type AgentTeamAddress } from "../../domain/agent-team-address.js";

/** The Team instance (TeamRun) hosting an Agent: its address, definition and handoffs, from its own context. */
export type MemberHostTeam = Readonly<{
  address: string;
  teamDefinitionId: string | null;
  handoffs: readonly CollaborationHandoff[];
}>;

/** The definition whose authored instruction encloses a member. */
export type MemberInstructionDefinition = Readonly<{ kind: "agent_team" | "agent_org"; definitionId: string }>;

/** A root's own scope facts: its configured root-level placements, its handoffs and its definition. */
export type MemberScopeRootFacts = Readonly<{
  configuredRootAddresses: Iterable<string>;
  handoffs: readonly CollaborationHandoff[];
  definition: MemberInstructionDefinition | null;
}>;

/** A member's collaboration scope: its outgoing handoff rules and the definition of its enclosing instruction. */
export type MemberCollaborationScope = Readonly<{
  outgoingHandoffs: readonly CollaborationHandoff[];
  instructionDefinition: MemberInstructionDefinition | null;
}>;

const scopeOf = (
  memberAddress: string,
  handoffs: readonly CollaborationHandoff[],
  instructionDefinition: MemberInstructionDefinition | null,
): MemberCollaborationScope => Object.freeze({
  outgoingHandoffs: Object.freeze(handoffs.filter((handoff) => handoff.from === memberAddress)),
  instructionDefinition,
});

/**
 * The one owner of a member's collaboration scope (CR-001), used by every root at construction
 * and restore. A member's scope comes from the authored unit its placement belongs to:
 * 1. a direct member of the non-root Team instance hosting it (configured or mounted Team,
 *    collaborator Team, ordinary or catalog copy — each TeamRun is prepared from its own source)
 *    gets that instance's handoffs and Team instruction;
 * 2. a root-level member at a configured root placement (or a task copy at that address) gets the
 *    root's handoffs and instruction;
 * 3. anything else (a collaborator Agent, a catalog Agent copy, an Agent-root child outside a
 *    Team instance, an Agent hosted by a Team it is not a member of) gets none.
 * `hostTeam` is absent for Agents hosted directly by an Org or Agent root.
 */
export const resolveMemberCollaborationScope = (input: Readonly<{
  memberAddress: AgentTeamAddress;
  hostTeam?: MemberHostTeam | null;
  root: MemberScopeRootFacts;
}>): MemberCollaborationScope => {
  const parent = getParentAgentTeamAddress(input.memberAddress);
  const host = input.hostTeam ?? null;
  if (host && host.address !== "/" && parent === host.address) {
    return scopeOf(input.memberAddress, host.handoffs,
      host.teamDefinitionId ? Object.freeze({ kind: "agent_team", definitionId: host.teamDefinitionId }) : null);
  }
  if (parent === "/" && new Set(input.root.configuredRootAddresses).has(input.memberAddress)) {
    return scopeOf(input.memberAddress, input.root.handoffs, input.root.definition);
  }
  return Object.freeze({ outgoingHandoffs: Object.freeze([]), instructionDefinition: null });
};
