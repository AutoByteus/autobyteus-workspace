import { vi } from "vitest";
import { DefinitionCatalog } from "../../src/definition-catalog/services/definition-catalog.js";
import type { DefinitionCatalogRuntime } from "../../src/definition-catalog/services/definition-catalog-runtime.js";
import type { DefinitionCatalogSync } from "../../src/definition-catalog/services/definition-catalog-sync.js";
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
import { createDefinitionCatalogRuntime } from "../../src/definition-catalog/services/definition-catalog-runtime.js";
import type {
  DefinitionBySubject,
  DefinitionSubject,
  SubjectNodeOutcome,
} from "../../src/definition-catalog/domain/definition-catalog-types.js";

/**
 * An in-memory definition catalog for service unit tests: definitions are seeded directly and
 * the sync is a spy that never touches disk.
 */
export const createInMemoryCatalogRuntime = () => {
  const catalog = new DefinitionCatalog();
  const sync = {
    settle: vi.fn(async () => undefined),
    reloadAll: vi.fn(async () => undefined),
    reconcileNow: vi.fn(async () => undefined),
  };
  const runtime = { catalog, sync: sync as unknown as DefinitionCatalogSync } as DefinitionCatalogRuntime;
  const seed = <S extends DefinitionSubject>(
    subject: S,
    definition: DefinitionBySubject[S],
    children: ReadonlyArray<SubjectNodeOutcome & { id: string }> = [],
  ): void => {
    const id = String(definition.id);
    catalog.apply(subject, id, {
      kind: "read",
      location: { packageRoot: "/package", unitDir: `/package/${subject}/${id}`, sourceClass: "server_data", fromRegisteredRoot: true },
      root: { subject, outcome: { kind: "valid", definition, fingerprint: JSON.stringify(definition) } } as SubjectNodeOutcome,
      children: new Map(children.map(({ id: childId, ...node }) => [childId, node as SubjectNodeOutcome])),
    });
  };
  return { runtime, catalog, sync, seed };
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
 * Real file providers, one real definition catalog and admission over temporary package roots:
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
  const runtime = createDefinitionCatalogRuntime({ appConfig, applicationOwnedSources: applicationOwnedSources as never });
  const providerDependencies = { appConfig, applicationBundleService: applicationOwnedSources as unknown as ApplicationBundleService };
  const agents = new AgentDefinitionService({ fileStore: new FileAgentDefinitionProvider(providerDependencies), catalogRuntime: runtime });
  const teams = new AgentTeamDefinitionService({
    fileStore: new FileAgentTeamDefinitionProvider(providerDependencies), catalogRuntime: runtime, agentDefinitionService: agents,
  });
  const orgs = new AgentOrgDefinitionService(new FileAgentOrgDefinitionProvider(appConfig), agents, teams, runtime);
  const admission = new DefinitionAdmissionService({
    registry: new DefinitionSourceRegistry({
      listImplementationOwnedTeamSources: async () => (await applicationOwnedSources.listApplicationOwnedTeamSources()) as never,
    }),
    agents, teams, orgs,
  });
  return { runtime, agents, teams, orgs, admission, close: () => runtime.sync.close() };
};
