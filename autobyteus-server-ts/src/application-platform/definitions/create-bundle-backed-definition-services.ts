import type { AppConfig } from "../../config/app-config.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { FileAgentDefinitionProvider } from "../../agent-definition/providers/file-agent-definition-provider.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { FileAgentTeamDefinitionProvider } from "../../agent-team-definition/providers/file-agent-team-definition-provider.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import {
  createDefinitionCatalogRuntime,
  type DefinitionCatalogRuntime,
} from "../../definition-catalog/services/definition-catalog-runtime.js";

export type BundleBackedDefinitionServices = Readonly<{
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
  catalogRuntime: DefinitionCatalogRuntime;
}>;

/** One definition catalog (registered package roots plus this bundle service's applications) behind the services. */
export const createBundleBackedDefinitionServices = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
}): BundleBackedDefinitionServices => {
  const catalogRuntime = createDefinitionCatalogRuntime({
    appConfig: input.appConfig,
    applicationOwnedSources: input.bundleService,
  });
  const agentDefinitionService = new AgentDefinitionService({
    fileStore: new FileAgentDefinitionProvider({
      appConfig: input.appConfig,
      applicationBundleService: input.bundleService,
    }),
    catalogRuntime,
  });
  const agentTeamDefinitionService = new AgentTeamDefinitionService({
    fileStore: new FileAgentTeamDefinitionProvider({
      appConfig: input.appConfig,
      applicationBundleService: input.bundleService,
    }),
    catalogRuntime,
    agentDefinitionService,
  });
  return Object.freeze({ agentDefinitionService, agentTeamDefinitionService, catalogRuntime });
};
