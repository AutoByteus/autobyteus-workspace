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
import { PersonalSettingsService } from "../personal-settings/services/personal-settings-service.js";

export type HostDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentOrgDefinitionService: AgentOrgDefinitionService;
  definitionAdmissionService: DefinitionAdmissionService;
  /** The process agent package definitions (the studio server wires the folder watcher and change feed to its reloader). */
  agentPackageDefinitions: AgentPackageDefinitions;
  /** One signal for every agent definition change (package reloads, application-owned saves, package commands). */
  agentDefinitionChanges: AgentDefinitionChangeSignal;
  /** The node's personal settings (the studio server sets the change feed's announce function on it). */
  personalSettings: PersonalSettingsService;
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
  // The package updates reach the personal settings through the process instance.
  PersonalSettingsService.bindProcessInstance(definitions.personalSettings);
  try {
    AgentDefinitionService.bindProcessInstance(definitions.agentDefinitionService);
  } catch (error) {
    PersonalSettingsService.releaseProcessInstance(definitions.personalSettings);
    throw error;
  }
  try {
    AgentTeamDefinitionService.bindProcessInstance(
      definitions.agentTeamDefinitionService,
    );
  } catch (error) {
    AgentDefinitionService.releaseProcessInstance(
      definitions.agentDefinitionService,
    );
    PersonalSettingsService.releaseProcessInstance(definitions.personalSettings);
    throw error;
  }

  const agentOrgDefinitionService = new AgentOrgDefinitionService(
    new FileAgentOrgDefinitionProvider(input.appConfig),
    definitions.agentDefinitionService,
    definitions.agentTeamDefinitionService,
    definitions.packageDefinitions,
    definitions.personalSettings,
  );
  try {
    AgentOrgDefinitionService.bindProcessInstance(agentOrgDefinitionService);
  } catch (error) {
    AgentTeamDefinitionService.releaseProcessInstance(definitions.agentTeamDefinitionService);
    AgentDefinitionService.releaseProcessInstance(definitions.agentDefinitionService);
    PersonalSettingsService.releaseProcessInstance(definitions.personalSettings);
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
    PersonalSettingsService.releaseProcessInstance(definitions.personalSettings);
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
    personalSettings: definitions.personalSettings,
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
      PersonalSettingsService.releaseProcessInstance(definitions.personalSettings);
    },
  });
};
