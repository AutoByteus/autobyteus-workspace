import type { AppConfig } from "../../config/app-config.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { FileAgentDefinitionProvider } from "../../agent-definition/providers/file-agent-definition-provider.js";
import { AgentDefinitionPersistenceProvider } from "../../agent-definition/providers/agent-definition-persistence-provider.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { FileAgentTeamDefinitionProvider } from "../../agent-team-definition/providers/file-agent-team-definition-provider.js";
import { AgentTeamDefinitionPersistenceProvider } from "../../agent-team-definition/providers/agent-team-definition-persistence-provider.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";

export const createApplicationDefinitionServices = (input: {
  appConfig: AppConfig;
  bundleService: ApplicationBundleService;
}): {
  agentDefinitionService: AgentDefinitionService;
  agentTeamDefinitionService: AgentTeamDefinitionService;
} => {
  const agentPersistenceProvider = new AgentDefinitionPersistenceProvider(
    new FileAgentDefinitionProvider({
      appConfig: input.appConfig,
      applicationBundleService: input.bundleService,
    }),
  );
  const agentDefinitionService = new AgentDefinitionService({
    persistenceProvider: agentPersistenceProvider,
  });
  const teamPersistenceProvider = new AgentTeamDefinitionPersistenceProvider(
    new FileAgentTeamDefinitionProvider({
      appConfig: input.appConfig,
      applicationBundleService: input.bundleService,
    }),
  );
  const agentTeamDefinitionService = new AgentTeamDefinitionService({
    persistenceProvider: teamPersistenceProvider,
    agentDefinitionService,
  });
  return { agentDefinitionService, agentTeamDefinitionService };
};
