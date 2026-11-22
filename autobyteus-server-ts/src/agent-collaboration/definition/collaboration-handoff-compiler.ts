import {
  cloneCollaborationHandoff,
  type CollaborationHandoff,
} from "../domain/collaboration-handoff.js";
import {
  assertAgentTeamAddress,
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
} from "../domain/agent-team-address.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import type { ResolvedFlatTeamDefinition } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type {
  ResolvedAgentOrgDefinition,
  ResolvedAgentOrgDefinitionMember,
  ResolvedCollaborationAgent,
} from "./resolved-collaboration-topology.js";

type Endpoint =
  | Readonly<{ kind: "agent"; agent: ResolvedCollaborationAgent }>
  | Readonly<{
      kind: "agent_team";
      address: string;
      coordinator: ResolvedCollaborationAgent;
    }>
  /** A delegated team's `to` outside the team, kept as written (an address in its delegator's space). */
  | Readonly<{ kind: "external"; address: string }>
  /** A running Org's rule endpoint `P/x` whose member is not in Team `P`'s current definition, kept as written (REQ-004). */
  | Readonly<{ kind: "absent_member"; address: string }>;

/**
 * How a team's handoffs are compiled. A team the user starts, and a saved definition, resolve every `to` in the team
 * (today's check). A delegated team (its run has `delegatedFrom`) keeps a `to` outside the team as an external target,
 * as written (contract §2.1; autobyteus-461 SR-054, CR-461-009); its rules may be the ones its members have in the
 * delegating run (`handoffs`, team-local addresses) instead of its definition's.
 */
export type TeamHandoffCompilation = Readonly<{ kind: "own_team" } | { kind: "delegated_team"; handoffs?: readonly CollaborationHandoff[] }>;

/**
 * How an Org's handoffs are compiled. A launch, and a saved definition, resolve every endpoint (today's check). A running
 * Org following its definition (org-teams-follow-definition REQ-004/DEC-005, REQ-009, CRR-006 F-5) keeps an Org rule
 * whose endpoint `P/x` names a member that is not in mounted Team `P`'s current definition: the member left its Team, the
 * rule is left out at each read until it returns. Every other invalid endpoint is refused as at launch.
 */
export type OrgHandoffCompilation = Readonly<{ kind: "launch" } | { kind: "running_org" }>;

export class CollaborationHandoffCompiler {
  compileTeam(team: ResolvedFlatTeamDefinition, compilation: TeamHandoffCompilation = { kind: "own_team" }): CollaborationHandoff[] {
    const seenPairs = new Set<string>();
    const delegated = compilation.kind === "delegated_team";
    return this.compileList({
      handoffs: compilation.kind === "delegated_team" && compilation.handoffs ? compilation.handoffs : team.definition.handoffs,
      ownerLabel: `Team '${team.definition.name}'`,
      resolve: (address) => this.resolveTeamEndpoint(team, address),
      resolveTarget: delegated ? (address) => this.resolveTeamTarget(team, address) : undefined,
      seenPairs,
    });
  }

  compileOrg(org: ResolvedAgentOrgDefinition, compilation: OrgHandoffCompilation = { kind: "launch" }): CollaborationHandoff[] {
    const seenPairs = new Set<string>();
    const output = this.compileList({
      handoffs: org.definition.handoffs,
      ownerLabel: `AgentOrg '${org.definition.name}'`,
      resolve: (address) => this.resolveOrgEndpoint(org, address, compilation.kind === "running_org"),
      seenPairs,
    });
    for (const member of org.members) {
      if (member.kind !== "agent_team") continue;
      const local = this.compileList({
        handoffs: member.team.definition.handoffs,
        ownerLabel: `Team '${member.team.definition.name}'`,
        resolve: (address) => this.resolveMountedTeamEndpoint(member, address),
        seenPairs,
      });
      output.push(...local);
    }
    return output.map(cloneCollaborationHandoff);
  }

  private compileList(input: {
    handoffs: readonly CollaborationHandoff[];
    ownerLabel: string;
    resolve(address: string): Endpoint;
    /** The `to` endpoint, when it resolves differently from `from` (a delegated team's external target). */
    resolveTarget?(address: string): Endpoint;
    seenPairs: Set<string>;
  }): CollaborationHandoff[] {
    return input.handoffs.map((handoff, index) => {
      const rules = this.validateRules(handoff, input.ownerLabel, index);
      const fromEndpoint = input.resolve(handoff.from);
      if (fromEndpoint.kind !== "agent" && fromEndpoint.kind !== "absent_member") {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_SOURCE_INVALID",
          `${input.ownerLabel} handoffs[${index}].from must resolve to an Agent.`,
        );
      }
      const toEndpoint = (input.resolveTarget ?? input.resolve)(handoff.to);
      const from = fromEndpoint.kind === "agent" ? createAgentTeamAddress(fromEndpoint.agent.absolutePath) : fromEndpoint.address;
      const to = toEndpoint.kind === "agent"
        ? createAgentTeamAddress(toEndpoint.agent.absolutePath)
        : toEndpoint.address;
      const targetAgent = toEndpoint.kind === "agent" ? toEndpoint.agent : toEndpoint.kind === "agent_team" ? toEndpoint.coordinator : null;
      if (targetAgent ? from === createAgentTeamAddress(targetAgent.absolutePath) : toEndpoint.kind === "absent_member" && from === to) {
        throw new CollaborationContractError(
          "COLLABORATION_SELF_TARGET_REJECTED",
          `Handoff '${from}' -> '${to}' resolves back to the source Agent.`,
        );
      }
      const pair = `${from}\u0000${to}`;
      if (input.seenPairs.has(pair)) {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_DUPLICATE",
          `Duplicate effective handoff '${from}' -> '${to}'.`,
        );
      }
      input.seenPairs.add(pair);
      return cloneCollaborationHandoff({ from, to, rules });
    });
  }

  private resolveTeamEndpoint(team: ResolvedFlatTeamDefinition, address: string): Endpoint {
    const segments = getAgentTeamAddressSegments(assertAgentTeamAddress(address));
    if (segments.length !== 1) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Team-local endpoint '${address}' must select one direct Agent.`,
      );
    }
    const member = team.members.find((candidate) => candidate.memberName === segments[0]);
    if (!member) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Team-local endpoint '${address}' was not found.`,
      );
    }
    return { kind: "agent", agent: member };
  }

  /** A delegated team's `to`: a member of the team, else an external target as written. */
  private resolveTeamTarget(team: ResolvedFlatTeamDefinition, address: string): Endpoint {
    const valid = assertAgentTeamAddress(address);
    const segments = getAgentTeamAddressSegments(valid);
    const member = segments.length === 1 ? team.members.find((candidate) => candidate.memberName === segments[0]) : undefined;
    return member ? { kind: "agent", agent: member } : { kind: "external", address: valid };
  }

  private resolveMountedTeamEndpoint(
    member: Extract<ResolvedAgentOrgDefinitionMember, { kind: "agent_team" }>,
    localAddress: string,
  ): Endpoint {
    const segments = getAgentTeamAddressSegments(assertAgentTeamAddress(localAddress));
    if (segments.length !== 1) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `Team-local endpoint '${localAddress}' must select one direct Agent.`,
      );
    }
    const agent = member.team.members.find((candidate) => candidate.memberName === segments[0]);
    if (!agent) throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Team-local endpoint '${localAddress}' was not found.`);
    return { kind: "agent", agent };
  }

  private resolveOrgEndpoint(org: ResolvedAgentOrgDefinition, address: string, keepAbsentMember = false): Endpoint {
    const segments = getAgentTeamAddressSegments(assertAgentTeamAddress(address));
    if (segments.length === 0 || segments.length > 2) {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        `AgentOrg endpoint '${address}' must select an Agent or direct Team placement.`,
      );
    }
    const direct = org.members.find((member) => member.memberName === segments[0]);
    if (!direct) throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `AgentOrg endpoint '${address}' was not found.`);
    if (segments.length === 1) {
      return direct.kind === "agent"
        ? { kind: "agent", agent: direct }
        : {
            kind: "agent_team",
            address: createAgentTeamAddress(direct.absolutePath),
            coordinator: direct.team.coordinator,
          };
    }
    if (direct.kind !== "agent_team") {
      throw new CollaborationContractError(
        "COLLABORATION_TRAVERSAL_INVALID",
        `AgentOrg endpoint '${address}' uses Agent '${direct.memberName}' as an intermediate segment.`,
      );
    }
    const agent = direct.team.members.find((candidate) => candidate.memberName === segments[1]);
    if (agent) return { kind: "agent", agent };
    // A running Org keeps a rule to (or from) a member that left its Team: left out at each read until it returns.
    if (keepAbsentMember) return { kind: "absent_member", address: createAgentTeamAddress([...direct.absolutePath, segments[1]!]) };
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `AgentOrg endpoint '${address}' was not found.`);
  }

  private validateRules(handoff: CollaborationHandoff, ownerLabel: string, index: number): string[] {
    if (!Array.isArray(handoff.rules) || handoff.rules.length === 0) {
      throw new CollaborationContractError(
        "COLLABORATION_HANDOFF_RULE_INVALID",
        `${ownerLabel} handoffs[${index}].rules must be non-empty.`,
      );
    }
    return handoff.rules.map((rule, ruleIndex) => {
      if (typeof rule !== "string" || !rule || rule !== rule.trim()) {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_RULE_INVALID",
          `${ownerLabel} handoffs[${index}].rules[${ruleIndex}] must be a non-empty trimmed string.`,
        );
      }
      return rule;
    });
  }
}
