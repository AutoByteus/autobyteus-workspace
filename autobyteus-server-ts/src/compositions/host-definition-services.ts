import type { AppConfig } from "../config/app-config.js";
import type { ApplicationBundleService } from "../application-bundles/services/application-bundle-service.js";
import { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../agent-team-definition/services/agent-team-definition-service.js";
import { createBundleBackedDefinitionServices } from "../application-platform/definitions/create-bundle-backed-definition-services.js";

export type HostDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
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

  let closed = false;
  return Object.freeze({
    ...definitions,
    close: () => {
      if (closed) return;
      closed = true;
      AgentTeamDefinitionService.releaseProcessInstance(
        definitions.agentTeamDefinitionService,
      );
      AgentDefinitionService.releaseProcessInstance(
        definitions.agentDefinitionService,
      );
    },
  });
};
