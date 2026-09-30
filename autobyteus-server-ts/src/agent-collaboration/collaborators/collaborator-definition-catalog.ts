import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { CollaboratorDefinitionCatalog } from "./collaborator-candidate-policy.js";
import { CollaboratorCandidatePolicy } from "./collaborator-candidate-policy.js";
import { CollaboratorEntryBuilder } from "./collaborator-entry-builder.js";
import { CollaboratorMentionAdmission } from "./collaborator-mention-admission.js";

export const createCollaboratorDefinitionCatalog = (services: Readonly<{
  agents: Pick<AgentDefinitionService, "getAllAgentDefinitions" | "getAgentDefinitionById">;
  teams: Pick<AgentTeamDefinitionService, "getAllDefinitions" | "getDefinitionById">;
}>): CollaboratorDefinitionCatalog => Object.freeze({
  listAgentDefinitions: () => services.agents.getAllAgentDefinitions(),
  listTeamDefinitions: () => services.teams.getAllDefinitions(),
  getAgentDefinition: (id) => services.agents.getAgentDefinitionById(id),
  getTeamDefinition: (id) => services.teams.getDefinitionById(id),
});

/** Process wiring: one policy and one admission coordinator over the shared catalogs. */
export const createCollaboratorMentionAdmission = (catalog: CollaboratorDefinitionCatalog): CollaboratorMentionAdmission =>
  new CollaboratorMentionAdmission({
    policy: new CollaboratorCandidatePolicy(catalog),
    entries: new CollaboratorEntryBuilder(catalog),
  });

let processAdmission: CollaboratorMentionAdmission | null = null;
/** The process admission coordinator over the shared definition services. */
export const getCollaboratorMentionAdmission = (): CollaboratorMentionAdmission =>
  processAdmission ??= createCollaboratorMentionAdmission(createCollaboratorDefinitionCatalog({
    agents: AgentDefinitionService.getInstance(),
    teams: AgentTeamDefinitionService.getInstance(),
  }));
