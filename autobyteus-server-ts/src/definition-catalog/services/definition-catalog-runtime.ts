import { appConfigProvider } from "../../config/app-config-provider.js";
import { getGeneralProcessApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { AgentDefinitionSourceReader, type ApplicationOwnedAgentSourceLookup } from "../providers/agent-definition-source-reader.js";
import { AgentTeamDefinitionSourceReader, type ApplicationOwnedTeamSourceLookup } from "../providers/agent-team-definition-source-reader.js";
import { AgentOrgDefinitionSourceReader } from "../providers/agent-org-definition-source-reader.js";
import { listRegisteredPackageRoots, type PackageRootConfig } from "../domain/registered-package-roots.js";
import { DefinitionCatalog } from "./definition-catalog.js";
import { DefinitionCatalogSync } from "./definition-catalog-sync.js";

/** One process's catalog and its sync, shared by the three definition services. */
export type DefinitionCatalogRuntime = Readonly<{
  catalog: DefinitionCatalog;
  sync: DefinitionCatalogSync;
}>;

export const createDefinitionCatalogRuntime = (input: {
  appConfig: PackageRootConfig;
  applicationOwnedSources: ApplicationOwnedAgentSourceLookup & ApplicationOwnedTeamSourceLookup;
  settleQuietMs?: number;
  settleCapMs?: number;
}): DefinitionCatalogRuntime => {
  const catalog = new DefinitionCatalog();
  const sync = new DefinitionCatalogSync({
    catalog,
    readers: {
      agent: new AgentDefinitionSourceReader(input.applicationOwnedSources),
      agent_team: new AgentTeamDefinitionSourceReader(input.applicationOwnedSources),
      agent_org: new AgentOrgDefinitionSourceReader(),
    },
    listPackageRoots: () => listRegisteredPackageRoots(input.appConfig),
    settleQuietMs: input.settleQuietMs,
    settleCapMs: input.settleCapMs,
  });
  return Object.freeze({ catalog, sync });
};

let defaultRuntime: DefinitionCatalogRuntime | null = null;

/** The runtime used by services constructed without one (process defaults resolved lazily). */
export const getDefaultDefinitionCatalogRuntime = (): DefinitionCatalogRuntime => {
  defaultRuntime ??= createDefinitionCatalogRuntime({
    appConfig: {
      getAgentsDir: () => appConfigProvider.config.getAgentsDir(),
      getAgentTeamsDir: () => appConfigProvider.config.getAgentTeamsDir(),
      getAgentOrgsDir: () => appConfigProvider.config.getAgentOrgsDir(),
      getRegisteredAgentPackageRoots: () => appConfigProvider.config.getRegisteredAgentPackageRoots(),
    },
    applicationOwnedSources: {
      listApplicationOwnedAgentSources: () => getGeneralProcessApplicationBundleService().listApplicationOwnedAgentSources(),
      getApplicationOwnedAgentSourceById: (id) => getGeneralProcessApplicationBundleService().getApplicationOwnedAgentSourceById(id),
      listApplicationOwnedTeamSources: () => getGeneralProcessApplicationBundleService().listApplicationOwnedTeamSources(),
      getApplicationOwnedTeamSourceById: (id) => getGeneralProcessApplicationBundleService().getApplicationOwnedTeamSourceById(id),
    },
  });
  return defaultRuntime;
};

/** Tests that switch the process app-data directory start from an empty default catalog. */
export const resetDefaultDefinitionCatalogRuntimeForTests = (): void => {
  defaultRuntime?.sync.close();
  defaultRuntime = null;
};
