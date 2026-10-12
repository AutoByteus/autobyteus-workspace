import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentFolderReader } from "../providers/agent-folder-reader.js";
import { AgentTeamFolderReader } from "../providers/agent-team-folder-reader.js";
import { AgentOrgFolderReader } from "../providers/agent-org-folder-reader.js";
import { listRegisteredPackageRoots, type PackageRootConfig } from "../domain/registered-package-roots.js";
import { AgentPackageDefinitionStore } from "./agent-package-definition-store.js";
import { AgentPackageDefinitionReloader } from "./agent-package-definition-reloader.js";

/** One process's loaded agent package definitions: the store and its reloader, shared by the three definition services. */
export type AgentPackageDefinitions = Readonly<{
  store: AgentPackageDefinitionStore;
  reloader: AgentPackageDefinitionReloader;
}>;

export const createAgentPackageDefinitions = (input: {
  appConfig: PackageRootConfig;
  settleQuietMs?: number;
  settleCapMs?: number;
}): AgentPackageDefinitions => {
  const store = new AgentPackageDefinitionStore();
  const reloader = new AgentPackageDefinitionReloader({
    store,
    readers: {
      agent: new AgentFolderReader(),
      agent_team: new AgentTeamFolderReader(),
      agent_org: new AgentOrgFolderReader(),
    },
    listPackageRoots: () => listRegisteredPackageRoots(input.appConfig),
    settleQuietMs: input.settleQuietMs,
    settleCapMs: input.settleCapMs,
  });
  return Object.freeze({ store, reloader });
};

let processDefinitions: AgentPackageDefinitions | null = null;

/** The agent package definitions used by services constructed without their own (process config resolved lazily). */
export const getProcessAgentPackageDefinitions = (): AgentPackageDefinitions => {
  processDefinitions ??= createAgentPackageDefinitions({
    appConfig: {
      getAgentsDir: () => appConfigProvider.config.getAgentsDir(),
      getAgentTeamsDir: () => appConfigProvider.config.getAgentTeamsDir(),
      getAgentOrgsDir: () => appConfigProvider.config.getAgentOrgsDir(),
      getRegisteredAgentPackageRoots: () => appConfigProvider.config.getRegisteredAgentPackageRoots(),
    },
  });
  return processDefinitions;
};

/** Tests that switch the process app-data directory start from empty process agent package definitions. */
export const resetProcessAgentPackageDefinitionsForTests = (): void => {
  processDefinitions?.reloader.close();
  processDefinitions = null;
};
