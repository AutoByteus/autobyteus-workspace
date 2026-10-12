import { vi } from "vitest";
import { AgentPackageDefinitionStore } from "../../src/agent-package-definitions/services/agent-package-definition-store.js";
import type { AgentPackageDefinitions } from "../../src/agent-package-definitions/services/agent-package-definitions.js";
import type { AgentPackageDefinitionReloader } from "../../src/agent-package-definitions/services/agent-package-definition-reloader.js";
import type { AppConfig } from "../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../src/application-bundles/services/application-bundle-service.js";
import { FileAgentDefinitionProvider } from "../../src/agent-definition/providers/file-agent-definition-provider.js";
import { FileAgentTeamDefinitionProvider } from "../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { FileAgentOrgDefinitionProvider } from "../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { AgentDefinitionService } from "../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../../src/agent-org-definition/services/agent-org-definition-service.js";
import { DefinitionSourceRegistry } from "../../src/collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../../src/collaboration-definition-admission/services/definition-admission-service.js";
import { createAgentPackageDefinitions } from "../../src/agent-package-definitions/services/agent-package-definitions.js";
import type {
  DefinitionByKind,
  AgentPackageDefinitionKind,
  KindDefinitionReadResult,
} from "../../src/agent-package-definitions/domain/agent-package-definition-types.js";

/**
 * In-memory agent package definitions for service unit tests: definitions are seeded directly
 * into the store and the reloader is a spy that never touches disk.
 */
export const createInMemoryPackageDefinitions = () => {
  const store = new AgentPackageDefinitionStore();
  const reloader = {
    applyPendingChanges: vi.fn(async () => undefined),
    reloadAllPackages: vi.fn(async () => undefined),
    reloadFoldersNow: vi.fn(async () => undefined),
  };
  const packageDefinitions = { store, reloader: reloader as unknown as AgentPackageDefinitionReloader } as AgentPackageDefinitions;
  const seed = <K extends AgentPackageDefinitionKind>(
    kind: K,
    definition: DefinitionByKind[K],
    nested: ReadonlyArray<KindDefinitionReadResult & { id: string }> = [],
  ): void => {
    const id = String(definition.id);
    store.apply(kind, id, {
      status: "read",
      location: { packageRoot: "/package", folderDir: `/package/${kind}/${id}`, sourceClass: "server_data" },
      root: { kind, result: { status: "valid", definition, fingerprint: JSON.stringify(definition) } } as KindDefinitionReadResult,
      nested: new Map(nested.map(({ id: nestedId, ...read }) => [nestedId, read as KindDefinitionReadResult])),
    });
  };
  return { packageDefinitions, store, reloader, seed };
};

type TestDefinitionConfig = Pick<AppConfig, "getAgentsDir" | "getAgentTeamsDir" | "getAgentOrgsDir">
  & Partial<Pick<AppConfig, "getAgentMdPath" | "getAgentConfigPath">>
  & { externalRoots?: readonly string[] };

const emptyApplicationSources = {
  listApplicationOwnedAgentSources: async () => [],
  getApplicationOwnedAgentSourceById: async () => null,
  listApplicationOwnedTeamSources: async () => [],
  getApplicationOwnedTeamSourceById: async () => null,
};

/**
 * Real file providers, real agent package definitions and admission over temporary package roots:
 * the default package from `config` plus `config.externalRoots` as registered packages.
 */
export const createDiskDefinitionServices = (
  config: TestDefinitionConfig,
  bundleService: Partial<ApplicationBundleService> = emptyApplicationSources,
) => {
  const externalRoots = [...(config.externalRoots ?? [])];
  const appConfig = {
    ...config,
    getAgentMdPath: config.getAgentMdPath ?? ((id: string) => `${config.getAgentsDir()}/${id}/agent.md`),
    getAgentConfigPath: config.getAgentConfigPath ?? ((id: string) => `${config.getAgentsDir()}/${id}/agent-config.json`),
    getAdditionalAgentPackageRoots: () => externalRoots,
    getRegisteredAgentPackageRoots: () => externalRoots,
  } as unknown as AppConfig;
  const applicationOwnedSources = { ...emptyApplicationSources, ...bundleService } as typeof emptyApplicationSources;
  const packageDefinitions = createAgentPackageDefinitions({ appConfig });
  const providerDependencies = { appConfig, applicationBundleService: applicationOwnedSources as unknown as ApplicationBundleService };
  const agents = new AgentDefinitionService({ fileStore: new FileAgentDefinitionProvider(providerDependencies), packageDefinitions });
  const teams = new AgentTeamDefinitionService({
    fileStore: new FileAgentTeamDefinitionProvider(providerDependencies), packageDefinitions, agentDefinitionService: agents,
  });
  const orgs = new AgentOrgDefinitionService(new FileAgentOrgDefinitionProvider(appConfig), agents, teams, packageDefinitions);
  const admission = new DefinitionAdmissionService({
    registry: new DefinitionSourceRegistry({
      listImplementationOwnedTeamSources: async () => (await applicationOwnedSources.listApplicationOwnedTeamSources()) as never,
    }),
    agents, teams, orgs,
  });
  return { packageDefinitions, agents, teams, orgs, admission, close: () => packageDefinitions.reloader.close() };
};
