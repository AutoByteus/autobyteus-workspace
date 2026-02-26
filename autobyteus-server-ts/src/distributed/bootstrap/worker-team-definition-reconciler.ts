import {
  AgentTeamDefinition as DomainAgentTeamDefinition,
  TeamMember as DomainTeamMember,
} from "../../agent-team-definition/domain/models.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamCommandIngressError } from "../ingress/team-command-ingress-service.js";
import {
  teamDefinitionMatchesSnapshot,
  toTeamDefinitionUpdate,
} from "./bootstrap-payload-normalization.js";

export const createWorkerTeamDefinitionResolver = (input: {
  teamDefinitionService: AgentTeamDefinitionService;
  workerTeamDefinitionIdByHostTeamDefinitionId: Map<string, string>;
}): ((args: {
  hostTeamDefinitionId: string;
  snapshot: DomainAgentTeamDefinition | null;
}) => Promise<string>) => {
  const { teamDefinitionService, workerTeamDefinitionIdByHostTeamDefinitionId } = input;

  return async (args: {
    hostTeamDefinitionId: string;
    snapshot: DomainAgentTeamDefinition | null;
  }): Promise<string> => {
    const mapped = workerTeamDefinitionIdByHostTeamDefinitionId.get(args.hostTeamDefinitionId) ?? null;
    if (mapped) {
      const existingMapped = await teamDefinitionService.getDefinitionById(mapped);
      if (existingMapped) {
        return mapped;
      }
      workerTeamDefinitionIdByHostTeamDefinitionId.delete(args.hostTeamDefinitionId);
    }

    const direct = await teamDefinitionService.getDefinitionById(args.hostTeamDefinitionId);
    if (direct?.id) {
      if (args.snapshot && !teamDefinitionMatchesSnapshot(direct, args.snapshot)) {
        await teamDefinitionService.updateDefinition(direct.id, toTeamDefinitionUpdate(args.snapshot));
      }
      workerTeamDefinitionIdByHostTeamDefinitionId.set(args.hostTeamDefinitionId, direct.id);
      return direct.id;
    }

    if (!args.snapshot) {
      throw new TeamCommandIngressError(
        "TEAM_BOOTSTRAP_DEFINITION_UNAVAILABLE",
        `Team definition '${args.hostTeamDefinitionId}' is unavailable on worker and no snapshot was provided.`,
      );
    }

    const allDefinitions = await teamDefinitionService.getAllDefinitions();
    const byName = allDefinitions.find(
      (definition) =>
        definition.name === args.snapshot?.name &&
        definition.coordinatorMemberName === args.snapshot?.coordinatorMemberName,
    );
    if (byName?.id) {
      if (!teamDefinitionMatchesSnapshot(byName, args.snapshot)) {
        await teamDefinitionService.updateDefinition(byName.id, toTeamDefinitionUpdate(args.snapshot));
      }
      workerTeamDefinitionIdByHostTeamDefinitionId.set(args.hostTeamDefinitionId, byName.id);
      return byName.id;
    }

    const created = await teamDefinitionService.createDefinition(
      new DomainAgentTeamDefinition({
        name: args.snapshot.name,
        description: args.snapshot.description,
        coordinatorMemberName: args.snapshot.coordinatorMemberName,
        role: args.snapshot.role ?? null,
        avatarUrl: args.snapshot.avatarUrl ?? null,
        nodes: args.snapshot.nodes.map(
          (node) =>
            new DomainTeamMember({
              memberName: node.memberName,
              referenceId: node.referenceId,
              referenceType: node.referenceType,
              homeNodeId: node.homeNodeId ?? "embedded-local",
            }),
        ),
      }),
    );
    if (!created.id) {
      throw new TeamCommandIngressError(
        "TEAM_BOOTSTRAP_DEFINITION_UNAVAILABLE",
        `Failed to create worker-local team definition for host definition '${args.hostTeamDefinitionId}'.`,
      );
    }
    workerTeamDefinitionIdByHostTeamDefinitionId.set(args.hostTeamDefinitionId, created.id);
    return created.id;
  };
};
