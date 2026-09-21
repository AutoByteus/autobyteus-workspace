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
    }>;

export class CollaborationHandoffCompiler {
  compileTeam(team: ResolvedFlatTeamDefinition): CollaborationHandoff[] {
    const seenPairs = new Set<string>();
    return this.compileList({
      handoffs: team.definition.handoffs,
      ownerLabel: `Team '${team.definition.name}'`,
      resolve: (address) => this.resolveTeamEndpoint(team, address),
      seenPairs,
    });
  }

  compileOrg(org: ResolvedAgentOrgDefinition): CollaborationHandoff[] {
    const seenPairs = new Set<string>();
    const output = this.compileList({
      handoffs: org.definition.handoffs,
      ownerLabel: `AgentOrg '${org.definition.name}'`,
      resolve: (address) => this.resolveOrgEndpoint(org, address),
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
    seenPairs: Set<string>;
  }): CollaborationHandoff[] {
    return input.handoffs.map((handoff, index) => {
      const rules = this.validateRules(handoff, input.ownerLabel, index);
      const fromEndpoint = input.resolve(handoff.from);
      if (fromEndpoint.kind !== "agent") {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_SOURCE_INVALID",
          `${input.ownerLabel} handoffs[${index}].from must resolve to an Agent.`,
        );
      }
      const toEndpoint = input.resolve(handoff.to);
      const from = createAgentTeamAddress(fromEndpoint.agent.absolutePath);
      const to = toEndpoint.kind === "agent"
        ? createAgentTeamAddress(toEndpoint.agent.absolutePath)
        : toEndpoint.address;
      const targetAgent = toEndpoint.kind === "agent" ? toEndpoint.agent : toEndpoint.coordinator;
      if (from === createAgentTeamAddress(targetAgent.absolutePath)) {
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

  private resolveOrgEndpoint(org: ResolvedAgentOrgDefinition, address: string): Endpoint {
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
    if (!agent) throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `AgentOrg endpoint '${address}' was not found.`);
    return { kind: "agent", agent };
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
