import type { AgentTeamDefinition } from "../domain/models.js";
import {
  buildScopedMemberResolutionContext,
  resolveScopedAgentMemberRef,
  resolveScopedTeamMemberRef,
} from "../utils/scoped-team-member-resolution.js";

export type TeamDefinitionGraphLookup = {
  getTeamById: (id: string) => Promise<AgentTeamDefinition | null> | AgentTeamDefinition | null;
  getAgentById?: (id: string) => Promise<unknown | null> | unknown | null;
};

export const validateTeamDefinitionGraph = async (input: {
  rootDefinition: AgentTeamDefinition;
  lookup: TeamDefinitionGraphLookup;
}): Promise<string[]> => {
  const errors: string[] = [];
  const rootId = input.rootDefinition.id?.trim();
  if (!rootId) {
    return errors;
  }

  const visit = async (
    definition: AgentTeamDefinition,
    path: string[],
  ): Promise<void> => {
    const definitionId = definition.id?.trim();
    if (!definitionId) {
      errors.push(`Team definition '${definition.name}' is missing id.`);
      return;
    }
    const resolutionContext = buildScopedMemberResolutionContext(definition, definitionId);
    const containingApplicationId = resolutionContext.containingTeamOwnershipScope === "application_owned"
      || resolutionContext.containingTeamOwnershipScope === "team_local"
      ? resolutionContext.ownerApplicationId ?? null
      : null;

    for (const node of definition.nodes ?? []) {
      try {
        if (node.refType === "agent") {
          const agentId = resolveScopedAgentMemberRef(resolutionContext, node);
          if (input.lookup.getAgentById) {
            const agent = await input.lookup.getAgentById(agentId);
            if (!agent) {
              errors.push(`Team '${definition.name}' member '${node.memberName}' references missing agent '${node.ref}'.`);
            }
          }
          continue;
        }

        const childTeamId = resolveScopedTeamMemberRef(resolutionContext, node);
        if (childTeamId === definitionId) {
          errors.push(`Team '${definition.name}' cannot reference itself as nested team member '${node.memberName}'.`);
          continue;
        }
        if (path.includes(childTeamId)) {
          errors.push(`Circular dependency detected in team definitions involving ID: ${childTeamId}`);
          continue;
        }

        const child = await input.lookup.getTeamById(childTeamId);
        if (!child) {
          errors.push(`Team '${definition.name}' member '${node.memberName}' references missing team '${node.ref}'.`);
          continue;
        }
        if (node.refScope === "application_owned") {
          if (
            (child.ownershipScope ?? "shared") !== "application_owned"
            || !containingApplicationId
            || child.ownerApplicationId !== containingApplicationId
          ) {
            errors.push(`Team '${definition.name}' member '${node.memberName}' must reference a team inside the same application bundle.`);
            continue;
          }
        }
        await visit(child, [...path, childTeamId]);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
  };

  await visit(input.rootDefinition, [rootId]);
  return errors;
};

export const assertValidTeamDefinitionGraph = async (input: {
  rootDefinition: AgentTeamDefinition;
  lookup: TeamDefinitionGraphLookup;
}): Promise<void> => {
  const errors = await validateTeamDefinitionGraph(input);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
};
