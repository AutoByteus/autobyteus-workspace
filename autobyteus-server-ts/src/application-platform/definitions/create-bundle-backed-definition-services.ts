import type { AppConfig } from "../../config/app-config.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { FileAgentDefinitionProvider } from "../../agent-definition/providers/file-agent-definition-provider.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentDefinitionChangeSignal } from "../../agent-definition/services/agent-definition-change-signal.js";
import { FileAgentTeamDefinitionProvider } from "../../agent-team-definition/providers/file-agent-team-definition-provider.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  createAgentPackageDefinitions,
  type AgentPackageDefinitions,
} from "../../agent-package-definitions/services/agent-package-definitions.js";

export type BundleBackedDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  packageDefinitions: AgentPackageDefinitions;
  /** One signal for every agent definition change these services can see. */
  agentDefinitionChanges: AgentDefinitionChangeSignal;
}>;

/** The agent package definitions of the registered packages behind the services; application-package definitions come from this bundle service. */
export const createBundleBackedDefinitionServices = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
}): BundleBackedDefinitionServices => {
  const packageDefinitions = createAgentPackageDefinitions({ appConfig: input.appConfig });
  const agentDefinitionChanges = new AgentDefinitionChangeSignal();
  const agentDefinitionService = new AgentDefinitionService({
    changeSignal: agentDefinitionChanges,
    fileStore: new FileAgentDefinitionProvider({
      appConfig: input.appConfig,
      applicationBundleService: input.bundleService,
    }),
    packageDefinitions,
  });
  const agentTeamDefinitionService = new AgentTeamDefinitionService({
    fileStore: new FileAgentTeamDefinitionProvider({
      appConfig: input.appConfig,
      applicationBundleService: input.bundleService,
    }),
    packageDefinitions,
    agentDefinitionService,
  });
  return Object.freeze({
    agentDefinitionService,
    agentTeamDefinitionService,
    packageDefinitions,
    agentDefinitionChanges,
  });
};
