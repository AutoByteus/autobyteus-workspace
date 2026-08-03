import {
  cloneCollaborationHandoff,
  type CollaborationHandoff,
} from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  formatAbsoluteCollaborationAddress,
  parseDefinitionCollaborationAddress,
} from "../../agent-collaboration/domain/collaboration-logical-address.js";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type {
  ResolvedTeamDefinitionAgent,
  ResolvedTeamDefinitionGraph,
  ResolvedTeamDefinitionMember,
} from "./team-definition-graph-resolver.js";

type ResolvedEndpoint =
  | { kind: "agent"; agent: ResolvedTeamDefinitionAgent }
  | { kind: "team"; team: ResolvedTeamDefinitionGraph };

export class TeamHandoffCompiler {
  compile(graph: ResolvedTeamDefinitionGraph): CollaborationHandoff[] {
    const output: CollaborationHandoff[] = [];
    const seenPairs = new Set<string>();
    this.visit(graph, output, seenPairs);
    return output.map(cloneCollaborationHandoff);
  }

  private visit(
    graph: ResolvedTeamDefinitionGraph,
    output: CollaborationHandoff[],
    seenPairs: Set<string>,
  ): void {
    for (const [index, handoff] of (graph.definition.handoffs ?? []).entries()) {
      const rules = this.validateRules(handoff, graph, index);
      const fromEndpoint = this.resolveEndpoint(graph, handoff.from);
      if (fromEndpoint.kind !== "agent") {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_SOURCE_INVALID",
          `Handoff source '${handoff.from}' in team '${graph.definition.name}' must resolve to an Agent.`,
        );
      }
      const toEndpoint = this.resolveEndpoint(graph, handoff.to);
      const from = formatAbsoluteCollaborationAddress(fromEndpoint.agent.absolutePath);
      const to = toEndpoint.kind === "agent"
        ? formatAbsoluteCollaborationAddress(toEndpoint.agent.absolutePath)
        : formatAbsoluteCollaborationAddress(toEndpoint.team.mountPath);
      const effectiveTargetAgent = toEndpoint.kind === "agent"
        ? toEndpoint.agent
        : toEndpoint.team.coordinator;
      if (from === formatAbsoluteCollaborationAddress(effectiveTargetAgent.absolutePath)) {
        throw new CollaborationContractError(
          "COLLABORATION_SELF_TARGET_REJECTED",
          `Handoff '${from}' -> '${to}' resolves back to the source Agent.`,
        );
      }
      const pair = `${from}\u0000${to}`;
      if (seenPairs.has(pair)) {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_DUPLICATE",
          `Duplicate effective handoff '${from}' -> '${to}'.`,
        );
      }
      seenPairs.add(pair);
      output.push(cloneCollaborationHandoff({ from, to, rules }));
    }
    for (const member of graph.members) {
      if (member.kind === "agent_team") {
        this.visit(member.team, output, seenPairs);
      }
    }
  }

  private validateRules(
    handoff: CollaborationHandoff,
    graph: ResolvedTeamDefinitionGraph,
    index: number,
  ): string[] {
    if (!Array.isArray(handoff.rules) || handoff.rules.length === 0) {
      throw new CollaborationContractError(
        "COLLABORATION_HANDOFF_RULE_INVALID",
        `Team '${graph.definition.name}' handoffs[${index}].rules must be non-empty.`,
      );
    }
    return handoff.rules.map((rule, ruleIndex) => {
      if (typeof rule !== "string" || !rule || rule !== rule.trim()) {
        throw new CollaborationContractError(
          "COLLABORATION_HANDOFF_RULE_INVALID",
          `Team '${graph.definition.name}' handoffs[${index}].rules[${ruleIndex}] must be a non-empty trimmed string.`,
        );
      }
      return rule;
    });
  }

  private resolveEndpoint(
    graph: ResolvedTeamDefinitionGraph,
    value: string,
  ): ResolvedEndpoint {
    const segments = parseDefinitionCollaborationAddress(value);
    if (segments.length === 0) {
      return { kind: "team", team: graph };
    }
    let currentTeam = graph;
    let currentMember: ResolvedTeamDefinitionMember | null = null;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      currentMember = currentTeam.members.find((member) => member.memberName === segment) ?? null;
      if (!currentMember) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `Collaboration target '${value}' was not found in team '${graph.definition.name}'.`,
        );
      }
      if (index < segments.length - 1) {
        if (currentMember.kind !== "agent_team") {
          throw new CollaborationContractError(
            "COLLABORATION_TRAVERSAL_INVALID",
            `Collaboration address '${value}' uses Agent '${segment}' as an intermediate segment.`,
          );
        }
        currentTeam = currentMember.team;
      }
    }
    return currentMember?.kind === "agent"
      ? { kind: "agent", agent: currentMember }
      : { kind: "team", team: currentMember!.team };
  }
}
