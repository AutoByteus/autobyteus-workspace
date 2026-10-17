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

/**
 * What an agent is for the prompt it reads (collaboration-prompt-wording): a standalone agent (the
 * Agent-root host), a task agent (created by a delegation, not a member of a team), a member of an
 * agent team, or a direct agent of an organization.
 */
export type MemberCollaborationRole = "standalone_agent" | "task_agent" | "team_member" | "org_agent";

/** A Team or Org root's configured root-level agent placements and the role of the agents configured there. */
export type ConfiguredRootPlacements = Readonly<{
  addresses: Iterable<string>;
  /** The run IDs of the agents configured at those placements (a task agent at the same address has another). */
  agentRunIds: Iterable<string>;
  /** `team_member` in a Team root, `org_agent` in an Org root. */
  role: Extract<MemberCollaborationRole, "team_member" | "org_agent">;
}>;

/**
 * A root's own scope facts: its configured root-level placements (none for an Agent root), its
 * handoffs and its definition.
 */
export type MemberScopeRootFacts = Readonly<{
  configured: ConfiguredRootPlacements | null;
  handoffs: readonly CollaborationHandoff[];
  definition: MemberInstructionDefinition | null;
}>;

/** A member's collaboration scope: its role, outgoing handoff rules and the definition of its enclosing instruction. */
export type MemberCollaborationScope = Readonly<{
  outgoingHandoffs: readonly CollaborationHandoff[];
  instructionDefinition: MemberInstructionDefinition | null;
  role: Exclude<MemberCollaborationRole, "standalone_agent">;
}>;

const scopeOf = (
  memberAddress: string,
  handoffs: readonly CollaborationHandoff[],
  instructionDefinition: MemberInstructionDefinition | null,
  role: MemberCollaborationScope["role"],
): MemberCollaborationScope => Object.freeze({
  outgoingHandoffs: Object.freeze(handoffs.filter((handoff) => handoff.from === memberAddress)),
  instructionDefinition,
  role,
});

/**
 * The one owner of a member's collaboration scope (CR-001), used by every root at construction
 * and restore. A member's scope comes from the authored unit its placement belongs to:
 * 1. a direct member of the non-root Team instance hosting it (configured or mounted Team,
 *    ordinary or catalog copy — each TeamRun is prepared from its own source)
 *    gets that instance's handoffs and Team instruction;
 * 2. a root-level member at a configured root placement gets the root's handoffs and instruction;
 *    a task agent at that address (another run ID) is a task agent that keeps the root's handoffs
 *    and instruction, as before;
 * 3. anything else (a catalog Agent copy, an Agent-root child outside a
 *    Team instance, an Agent hosted by a Team it is not a member of) gets none.
 * The role is decided here, never re-derived from addresses: an address cannot tell a configured
 * agent from a task agent at the same address.
 * `hostTeam` is absent for Agents hosted directly by an Org or Agent root.
 */
export const resolveMemberCollaborationScope = (input: Readonly<{
  memberAddress: AgentTeamAddress;
  agentRunId: string;
  hostTeam?: MemberHostTeam | null;
  root: MemberScopeRootFacts;
}>): MemberCollaborationScope => {
  const parent = getParentAgentTeamAddress(input.memberAddress);
  const host = input.hostTeam ?? null;
  if (host && host.address !== "/" && parent === host.address) {
    return scopeOf(input.memberAddress, host.handoffs,
      host.teamDefinitionId ? Object.freeze({ kind: "agent_team", definitionId: host.teamDefinitionId }) : null,
      "team_member");
  }
  const configured = input.root.configured;
  if (configured && parent === "/" && new Set(configured.addresses).has(input.memberAddress)) {
    return new Set(configured.agentRunIds).has(input.agentRunId)
      ? scopeOf(input.memberAddress, input.root.handoffs, input.root.definition, configured.role)
      : scopeOf(input.memberAddress, input.root.handoffs, input.root.definition, "task_agent");
  }
  return Object.freeze({ outgoingHandoffs: Object.freeze([]), instructionDefinition: null, role: "task_agent" });
};
