import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationPackageRegistryService } from "../../application-packages/services/application-package-registry-service.js";

type StudioApplicationApiServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  bundleService: ApplicationBundleService;
  packageRegistryService: ApplicationPackageRegistryService;
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

export const getStudioApplicationBundleService = (): ApplicationBundleService => {
  if (!configuredServices) {
    throw new Error("Studio application API services are not configured.");
  }
  return configuredServices.bundleService;
};

export const getStudioAgentDefinitionService = (): AgentDefinitionService => {
  if (!configuredServices) {
    throw new Error("Studio application API services are not configured.");
  }
  return configuredServices.agentDefinitionService;
};

export const getStudioAgentTeamDefinitionService = (): AgentTeamDefinitionService => {
  if (!configuredServices) {
    throw new Error("Studio application API services are not configured.");
  }
  return configuredServices.agentTeamDefinitionService;
};

export const getStudioApplicationPackageRegistryService =
  (): ApplicationPackageRegistryService => {
    if (!configuredServices) {
      throw new Error("Studio application API services are not configured.");
    }
    return configuredServices.packageRegistryService;
  };
