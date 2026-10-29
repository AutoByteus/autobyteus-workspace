import type { AppConfig } from "../config/app-config.js";
import type { ApplicationBundleService } from "../application-bundles/services/application-bundle-service.js";
import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../agent-org-definition/services/agent-org-definition-service.js";
import { createBundleBackedDefinitionServices } from "../application-platform/definitions/create-bundle-backed-definition-services.js";
import { DefinitionSourceRegistry } from "../collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../collaboration-definition-admission/services/definition-admission-service.js";
import { FileAgentOrgDefinitionProvider } from "../agent-org-definition/providers/file-agent-org-definition-provider.js";
import type { AgentPackageDefinitions } from "../agent-package-definitions/services/agent-package-definitions.js";
import type { AgentDefinitionChangeSignal } from "../agent-definition/services/agent-definition-change-signal.js";

export type HostDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentOrgDefinitionService: AgentOrgDefinitionService;
  definitionAdmissionService: DefinitionAdmissionService;
  /** The process agent package definitions (the studio server wires the folder watcher and change feed to its reloader). */
  agentPackageDefinitions: AgentPackageDefinitions;
  /** One signal for every agent definition change (package reloads, application-owned saves, package commands). */
  agentDefinitionChanges: AgentDefinitionChangeSignal;
  close(): void;
}>;

/** Owns fail-closed process binding for the executable host definition services. */
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
    new FileAgentOrgDefinitionProvider(input.appConfig),
    definitions.agentDefinitionService,
    definitions.agentTeamDefinitionService,
    definitions.packageDefinitions,
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
    agentDefinitionService: definitions.agentDefinitionService,
    agentTeamDefinitionService: definitions.agentTeamDefinitionService,
    agentOrgDefinitionService,
    definitionAdmissionService,
    agentPackageDefinitions: definitions.packageDefinitions,
    agentDefinitionChanges: definitions.agentDefinitionChanges,
    close: () => {
      if (closed) return;
      closed = true;
      definitions.packageDefinitions.reloader.close();
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
