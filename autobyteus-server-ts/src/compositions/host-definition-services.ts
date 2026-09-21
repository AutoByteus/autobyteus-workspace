import type { AppConfig } from "../config/app-config.js";
import type { ApplicationBundleService } from "../application-bundles/services/application-bundle-service.js";
import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../agent-org-definition/services/agent-org-definition-service.js";
import { createBundleBackedDefinitionServices } from "../application-platform/definitions/create-bundle-backed-definition-services.js";
import { DefinitionSourceRegistry } from "../collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../collaboration-definition-admission/services/definition-admission-service.js";

export type HostDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentOrgDefinitionService: AgentOrgDefinitionService;
  definitionAdmissionService: DefinitionAdmissionService;
  close(): void;
}>;

/** Owns fail-closed process binding for the executable host definition catalog. */
export const createHostDefinitionServices = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
}): HostDefinitionServices => {
  if (!input?.appConfig || !input.bundleService) {
    throw new Error("Complete HostDefinitionServices input is required.");
  }
  const definitions = createBundleBackedDefinitionServices(input);
  AgentDefinitionService.bindProcessInstance(definitions.agentDefinitionService);
  try {
    AgentTeamDefinitionService.bindProcessInstance(
      definitions.agentTeamDefinitionService,
    );
  } catch (error) {
    AgentDefinitionService.releaseProcessInstance(
      definitions.agentDefinitionService,
    );
    throw error;
  }

  const agentOrgDefinitionService = new AgentOrgDefinitionService(
    undefined,
    definitions.agentDefinitionService,
    definitions.agentTeamDefinitionService,
  );
  try {
    AgentOrgDefinitionService.bindProcessInstance(agentOrgDefinitionService);
  } catch (error) {
    AgentTeamDefinitionService.releaseProcessInstance(definitions.agentTeamDefinitionService);
    AgentDefinitionService.releaseProcessInstance(definitions.agentDefinitionService);
    throw error;
  }
  const definitionAdmissionService = new DefinitionAdmissionService({
    registry: new DefinitionSourceRegistry({
      appConfig: input.appConfig,
      listImplementationOwnedTeamSources: () => input.bundleService.listApplicationOwnedTeamSources(),
    }),
    agents: definitions.agentDefinitionService,
    teams: definitions.agentTeamDefinitionService,
    orgs: agentOrgDefinitionService,
  });
  try {
    DefinitionAdmissionService.bindProcessInstance(definitionAdmissionService);
  } catch (error) {
    AgentOrgDefinitionService.releaseProcessInstance(agentOrgDefinitionService);
    AgentTeamDefinitionService.releaseProcessInstance(definitions.agentTeamDefinitionService);
    AgentDefinitionService.releaseProcessInstance(definitions.agentDefinitionService);
    throw error;
  }

  let closed = false;
  return Object.freeze({
    ...definitions,
    agentOrgDefinitionService,
    definitionAdmissionService,
    close: () => {
      if (closed) return;
      closed = true;
      DefinitionAdmissionService.releaseProcessInstance(definitionAdmissionService);
      AgentOrgDefinitionService.releaseProcessInstance(agentOrgDefinitionService);
      AgentTeamDefinitionService.releaseProcessInstance(
        definitions.agentTeamDefinitionService,
      );
      AgentDefinitionService.releaseProcessInstance(
        definitions.agentDefinitionService,
      );
    },
  });
};
