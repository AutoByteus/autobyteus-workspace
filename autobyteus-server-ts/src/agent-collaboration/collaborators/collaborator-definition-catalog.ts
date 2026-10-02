import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { CollaboratorDefinitionCatalog } from "./collaborator-candidate-policy.js";
import { CollaboratorCandidatePolicy } from "./collaborator-candidate-policy.js";
import { CollaboratorEntryBuilder } from "./collaborator-entry-builder.js";
import { CollaboratorAdmission } from "./collaborator-admission.js";
import { CollaboratorRunnabilityValidator } from "./collaborator-runnability-validator.js";
import { RunModelSelectionService, type RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import { getModelCatalogService } from "../../llm-management/services/model-catalog-service.js";

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
export const createCollaboratorAdmission = (
  catalog: CollaboratorDefinitionCatalog,
  modelSelectionValidator: RunModelSelectionValidator,
): CollaboratorAdmission =>
  new CollaboratorAdmission({
    policy: new CollaboratorCandidatePolicy(catalog),
    entries: new CollaboratorEntryBuilder(catalog),
    runnability: new CollaboratorRunnabilityValidator(modelSelectionValidator),
  });

let processAdmission: CollaboratorAdmission | null = null;
/** The process admission coordinator over the shared definition services. */
export const getCollaboratorAdmission = (): CollaboratorAdmission =>
  processAdmission ??= createCollaboratorAdmission(createCollaboratorDefinitionCatalog({
    agents: AgentDefinitionService.getInstance(),
    teams: AgentTeamDefinitionService.getInstance(),
  }), new RunModelSelectionService(getModelCatalogService()));
