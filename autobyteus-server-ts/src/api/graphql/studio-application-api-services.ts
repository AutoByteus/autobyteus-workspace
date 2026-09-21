import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationCapabilityService } from "../../application-capability/services/application-capability-service.js";
import type { ApplicationPackageCommandService } from "../../application-packages/services/application-package-command-service.js";
import type { ApplicationPackageRegistryService } from "../../application-packages/services/application-package-registry-service.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { AgentOrgRunService } from "../../agent-org-execution/services/agent-org-run-service.js";
import type { StudioRunModelConfigService } from "../../run-history/services/studio-run-model-config-service.js";
import type { DefinitionAdmissionService } from "../../collaboration-definition-admission/services/definition-admission-service.js";
import type { CollaborationRootHistoryService } from "../../run-history/services/collaboration-root-history-service.js";

type StudioApplicationApiServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  agentOrgDefinitionService: AgentOrgDefinitionService;
  agentRunService: AgentRunService;
  teamRunService: TeamRunService;
  agentOrgRunService: AgentOrgRunService;
  definitionAdmissionService: DefinitionAdmissionService;
  collaborationRootHistoryService: CollaborationRootHistoryService;
  runModelConfigService: StudioRunModelConfigService;
  bundleService: ApplicationBundleService;
  capabilityService: ApplicationCapabilityService;
  packageQueries: ApplicationPackageRegistryService;
  packageCommands: ApplicationPackageCommandService;
}>;

let configuredServices: StudioApplicationApiServices | null = null;

export const configureStudioApplicationApiServices = (
  services: StudioApplicationApiServices,
): Readonly<{ close(): void }> => {
  if (
    !services?.agentDefinitionService
    || !services.agentTeamDefinitionService
    || !services.agentOrgDefinitionService
    || !services.agentRunService
    || !services.teamRunService
    || !services.agentOrgRunService
    || !services.definitionAdmissionService
    || !services.collaborationRootHistoryService
    || !services.runModelConfigService
    || !services.bundleService
    || !services.capabilityService
    || !services.packageQueries
    || !services.packageCommands
  ) {
    throw new Error("Complete Studio application API services are required.");
  }
  if (configuredServices) {
    throw new Error("Studio application API services are already configured.");
  }
  const boundServices = Object.freeze(services);
  configuredServices = boundServices;
  let closed = false;
  return Object.freeze({
    close: () => {
      if (closed) return;
      closed = true;
      if (configuredServices === boundServices) {
        configuredServices = null;
      }
    },
  });
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

export const getStudioAgentOrgDefinitionService = (): AgentOrgDefinitionService =>
  requireConfiguredServices().agentOrgDefinitionService;

export const getStudioAgentRunService = (): AgentRunService =>
  requireConfiguredServices().agentRunService;

export const getStudioTeamRunService = (): TeamRunService =>
  requireConfiguredServices().teamRunService;

export const getStudioAgentOrgRunService = (): AgentOrgRunService =>
  requireConfiguredServices().agentOrgRunService;

export const getStudioDefinitionAdmissionService = (): DefinitionAdmissionService =>
  requireConfiguredServices().definitionAdmissionService;

export const getStudioCollaborationRootHistoryService = (): CollaborationRootHistoryService =>
  requireConfiguredServices().collaborationRootHistoryService;

export const getStudioRunModelConfigService = (): StudioRunModelConfigService =>
  requireConfiguredServices().runModelConfigService;

export const getStudioApplicationPackageQueries =
  (): ApplicationPackageRegistryService => requireConfiguredServices().packageQueries;

export const getStudioApplicationPackageCommands =
  (): ApplicationPackageCommandService => requireConfiguredServices().packageCommands;
