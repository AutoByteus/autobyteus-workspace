import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationCapabilityService } from "../../application-capability/services/application-capability-service.js";
import type { ApplicationPackageCommandService } from "../../application-packages/services/application-package-command-service.js";
import type { ApplicationPackageRegistryService } from "../../application-packages/services/application-package-registry-service.js";

type StudioApplicationApiServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  bundleService: ApplicationBundleService;
  capabilityService: ApplicationCapabilityService;
  packageQueries: ApplicationPackageRegistryService;
  packageCommands: ApplicationPackageCommandService;
}>;

let configuredServices: StudioApplicationApiServices | null = null;

export const configureStudioApplicationApiServices = (
  services: StudioApplicationApiServices,
): void => {
  if (configuredServices) {
    throw new Error("Studio application API services are already configured.");
  }
  configuredServices = Object.freeze(services);
};

const requireConfiguredServices = (): StudioApplicationApiServices => {
  if (!configuredServices) {
    throw new Error("Studio application API services are not configured.");
  }
  return configuredServices;
};

export const getStudioApplicationBundleService = (): ApplicationBundleService =>
  requireConfiguredServices().bundleService;

export const getStudioApplicationCapabilityService =
(): ApplicationCapabilityService => requireConfiguredServices().capabilityService;

export const getStudioAgentDefinitionService = (): AgentDefinitionService =>
  requireConfiguredServices().agentDefinitionService;

export const getStudioAgentTeamDefinitionService = (): AgentTeamDefinitionService =>
  requireConfiguredServices().agentTeamDefinitionService;

export const getStudioApplicationPackageQueries =
  (): ApplicationPackageRegistryService => requireConfiguredServices().packageQueries;

export const getStudioApplicationPackageCommands =
  (): ApplicationPackageCommandService => requireConfiguredServices().packageCommands;
