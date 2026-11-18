import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { InternalAgentVisibility } from "../../agent-definition/services/internal-agent-visibility.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { CollaboratorDefinitionCatalog } from "./collaborator-candidate-policy.js";
import { CollaboratorCandidatePolicy } from "./collaborator-candidate-policy.js";
import { CollaboratorEntryBuilder } from "./collaborator-entry-builder.js";
import { CollaboratorAdmission } from "./collaborator-admission.js";
import { CollaboratorLaunchResolver } from "./collaborator-launch-resolver.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { RuntimeAvailabilityService } from "../../runtime-management/runtime-availability-service.js";
import { LaunchUsabilityCheck } from "../../launch-preferences/launch-usability-check.js";
import { NO_MODEL_ROUTING, type ModelRouterPort } from "../../model-routing/domain/model-routing-types.js";

export const createCollaboratorDefinitionCatalog = (services: Readonly<{
  agents: Pick<AgentDefinitionService, "getAllAgentDefinitions" | "getAgentDefinitionById">;
  teams: Pick<AgentTeamDefinitionService, "getAllDefinitions" | "getDefinitionById">;
  visibility: Pick<InternalAgentVisibility, "isHidden">;
}>): CollaboratorDefinitionCatalog => Object.freeze({
  listAgentDefinitions: () => services.agents.getAllAgentDefinitions(),
  listTeamDefinitions: () => services.teams.getAllDefinitions(),
  getAgentDefinition: (id) => services.agents.getAgentDefinitionById(id),
  getTeamDefinition: (id) => services.teams.getDefinitionById(id),
  isAgentHidden: (definition) => services.visibility.isHidden(definition),
});

/**
 * Process wiring: one policy and one admission coordinator over the shared catalogs. `modelRouter` is the node's Model
 * Routing (the process composition binds it); a server that does not compose it passes `NO_MODEL_ROUTING`.
 */
export const createCollaboratorAdmission = (
  catalog: CollaboratorDefinitionCatalog,
  modelSelectionValidator: RunModelSelectionValidator,
  runtimeAvailability: Pick<RuntimeAvailabilityService, "getRuntimeAvailability">,
  modelRouter: ModelRouterPort = NO_MODEL_ROUTING,
): CollaboratorAdmission =>
  new CollaboratorAdmission({
    policy: new CollaboratorCandidatePolicy(catalog),
    entries: new CollaboratorEntryBuilder(catalog),
    launches: new CollaboratorLaunchResolver({
      usability: new LaunchUsabilityCheck({ availability: runtimeAvailability, validator: modelSelectionValidator }),
      router: modelRouter,
    }),
  });

let processAdmission: CollaboratorAdmission | null = null;

/** Binds the process admission coordinator, built at process composition over the injected definition services. */
export const bindProcessCollaboratorAdmission = (admission: CollaboratorAdmission): void => {
  if (!admission) throw new Error("A process CollaboratorAdmission instance is required.");
  if (processAdmission) throw new Error("The process CollaboratorAdmission is already initialized.");
  processAdmission = admission;
};

export const releaseProcessCollaboratorAdmission = (admission: CollaboratorAdmission): void => {
  if (processAdmission === admission) processAdmission = null;
};

/** The process admission coordinator over the shared definition services. */
export const getCollaboratorAdmission = (): CollaboratorAdmission => {
  if (!processAdmission) throw new Error("The process CollaboratorAdmission is not initialized.");
  return processAdmission;
};
