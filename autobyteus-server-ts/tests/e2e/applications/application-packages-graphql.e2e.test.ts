import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { FileApplicationBundleProvider } from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationPackageService } from "../../../src/application-packages/services/application-package-service.js";
import { ApplicationPackageRegistryStore } from "../../../src/application-packages/stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../../../src/application-packages/stores/application-package-root-settings-store.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { ApplicationSessionService } from "../../../src/application-sessions/services/application-session-service.js";
import type {
  ApplicationSessionBinding,
  ApplicationSessionSnapshot,
} from "../../../src/application-sessions/domain/models.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { BUILT_IN_APPLICATION_PACKAGE_ID } from "../../../src/application-bundles/providers/file-application-bundle-provider.js";

const BRIEF_STUDIO_IMPORTABLE_PACKAGE_ROOT = path.resolve(
  process.cwd(),
  "..",
  "applications/brief-studio/dist/importable-package",
);

const parseAdditionalRoots = (): string[] => {
  const raw = process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS ?? "";
  if (!raw.trim()) {
    return [];
  }

  const seen = new Set<string>();
  const roots: string[] = [];
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const resolved = path.resolve(trimmed);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    roots.push(resolved);
  }

  return roots;
};

const createTestRootSettingsStore = (appDataRoot: string): ApplicationPackageRootSettingsStore =>
  new ApplicationPackageRootSettingsStore(
    {
      getAppDataDir: () => appDataRoot,
      getAdditionalApplicationPackageRoots: () => parseAdditionalRoots(),
      get: (key: string, defaultValue?: string) =>
        process.env[key] ?? defaultValue,
    },
    {
      updateSetting: (key: string, value: string) => {
        if (value) {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
        return [true, "updated"];
      },
    },
  );

const createTestRegistryStore = (registryRoot: string): ApplicationPackageRegistryStore =>
  new ApplicationPackageRegistryStore({
    getAppDataDir: () => registryRoot,
  });

const createBuiltInMaterializer = (bundledSourceRootPath: string) => ({
  ensureMaterialized: async () => undefined,
  getBundledSourceRootPath: () => path.resolve(bundledSourceRootPath),
});

const writeApplicationBundle = async (packageRoot: string, applicationId: string): Promise<void> => {
  const bundleRoot = path.join(packageRoot, "applications", applicationId);
  await fs.mkdir(path.join(bundleRoot, "ui"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "dist"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "migrations"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "assets"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "agent-teams", "sample-team", "agents", "sample-agent"), { recursive: true });
  await fs.writeFile(path.join(bundleRoot, "application.json"), JSON.stringify({
    manifestVersion: "2",
    id: applicationId,
    name: applicationId,
    ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "1" },
    runtimeTarget: { kind: "AGENT_TEAM", localId: "sample-team" },
    backend: { bundleManifest: "backend/bundle.json" },
  }, null, 2));
  await fs.writeFile(path.join(bundleRoot, "ui", "index.html"), "<html></html>", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "backend", "bundle.json"), JSON.stringify({
    contractVersion: "1",
    entryModule: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: { engine: "node", semver: ">=22 <23" },
    sdkCompatibility: { backendDefinitionContractVersion: "1", frontendSdkContractVersion: "1" },
    supportedExposures: { queries: true, commands: true, routes: true, graphql: true, notifications: true, eventHandlers: true },
    migrationsDir: "backend/migrations",
    assetsDir: "backend/assets",
  }, null, 2));
  await fs.writeFile(path.join(bundleRoot, "backend", "dist", "entry.mjs"), "export default {}\n", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "agent-teams", "sample-team", "agents", "sample-agent", "agent.md"), "---\nname: Sample Agent\ndescription: sample\n---\n", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "agent-teams", "sample-team", "agents", "sample-agent", "agent-config.json"), JSON.stringify({ defaultLaunchConfig: { runtimeKind: "autobyteus" } }, null, 2));
  await fs.writeFile(path.join(bundleRoot, "agent-teams", "sample-team", "team.md"), "---\nname: Sample Team\ndescription: sample\n---\n", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "agent-teams", "sample-team", "team-config.json"), JSON.stringify({ coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "sample-agent", refType: "agent", refScope: "team_local" }] }, null, 2));
};

const createInMemorySessionStateStore = () => {
  const sessions = new Map<string, ApplicationSessionSnapshot>();

  const applicationSessionBinding = async (
    applicationId: string,
    requestedSessionId?: string | null,
  ): Promise<ApplicationSessionBinding> => {
    const requested = requestedSessionId ? sessions.get(requestedSessionId) ?? null : null;
    if (requested && requested.application.applicationId === applicationId && requested.terminatedAt === null) {
      return {
        applicationId,
        requestedSessionId: requestedSessionId ?? null,
        resolvedSessionId: requested.applicationSessionId,
        resolution: "requested_live",
        session: structuredClone(requested),
      };
    }

    const active = Array.from(sessions.values()).find(
      (session) => session.application.applicationId === applicationId && session.terminatedAt === null,
    ) ?? null;
    if (active) {
      return {
        applicationId,
        requestedSessionId: requestedSessionId ?? null,
        resolvedSessionId: active.applicationSessionId,
        resolution: "application_active",
        session: structuredClone(active),
      };
    }

    return {
      applicationId,
      requestedSessionId: requestedSessionId ?? null,
      resolvedSessionId: null,
      resolution: "none",
      session: null,
    };
  };

  return {
    persistLiveSession: vi.fn(async (snapshot: ApplicationSessionSnapshot) => {
      sessions.set(snapshot.applicationSessionId, structuredClone(snapshot));
      return structuredClone(snapshot);
    }),
    persistSessionUpdate: vi.fn(async (snapshot: ApplicationSessionSnapshot) => {
      sessions.set(snapshot.applicationSessionId, structuredClone(snapshot));
      return structuredClone(snapshot);
    }),
    applicationSessionBinding: vi.fn(applicationSessionBinding),
    findSessionById: vi.fn(async (_applicationIds: string[], applicationSessionId: string) => {
      const session = sessions.get(applicationSessionId) ?? null;
      return session ? structuredClone(session) : null;
    }),
  };
};

describe("Application packages GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const cleanupPaths = new Set<string>();

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
    delete process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS;
    ApplicationPackageService.resetInstance();
    ApplicationBundleService.resetInstance();
    ApplicationSessionService.resetInstance();
    appConfigProvider.resetForTests();
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("imports, inspects, and removes a linked local application package", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), `application-packages-repo-${unique}-`));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), `application-packages-app-data-${unique}-`));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `application-packages-registry-${unique}-`));
    const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), `application-packages-local-${unique}-`));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(externalRoot);

    const rootSettingsStore = createTestRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), `built-in-${unique}`);
    await writeApplicationBundle(externalRoot, `external-${unique}`);

    ApplicationPackageService.getInstance({
      rootSettingsStore,
      registryStore: createTestRegistryStore(registryRoot),
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    const imported = await execGraphql<{
      importApplicationPackage: Array<{
        packageId: string;
        displayName: string;
        sourceKind: string;
        sourceSummary: string | null;
        applicationCount: number;
        isPlatformOwned: boolean;
        isRemovable: boolean;
      }>;
    }>(
      `mutation ImportApplicationPackage($input: ImportApplicationPackageInput!) {
        importApplicationPackage(input: $input) {
          packageId
          displayName
          sourceKind
          sourceSummary
          applicationCount
          isPlatformOwned
          isRemovable
        }
      }`,
      {
        input: {
          sourceKind: "LOCAL_PATH",
          source: externalRoot,
        },
      },
    );

    const linkedPackage = imported.importApplicationPackage.find(
      (entry) => entry.sourceSummary === path.resolve(externalRoot),
    );
    expect(linkedPackage).toMatchObject({
      sourceKind: "LOCAL_PATH",
      applicationCount: 1,
      isPlatformOwned: false,
      isRemovable: true,
    });
    expect(imported.importApplicationPackage[0]).toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      sourceKind: "BUILT_IN",
      sourceSummary: "Managed by AutoByteus",
      isPlatformOwned: true,
      isRemovable: false,
    });

    const listed = await execGraphql<{
      applicationPackages: Array<{
        packageId: string;
        sourceSummary: string | null;
        isPlatformOwned: boolean;
      }>;
    }>(
      `query ApplicationPackages {
        applicationPackages {
          packageId
          sourceSummary
          isPlatformOwned
        }
      }`,
    );
    const listedLinked = listed.applicationPackages.find(
      (entry) => entry.sourceSummary === path.resolve(externalRoot),
    );
    expect(listedLinked?.packageId.startsWith("application-local:")).toBe(true);

    const details = await execGraphql<{
      applicationPackageDetails: {
        packageId: string;
        rootPath: string;
        source: string;
        managedInstallPath: string | null;
        bundledSourceRootPath: string | null;
        isPlatformOwned: boolean;
      } | null;
    }>(
      `query ApplicationPackageDetails($packageId: String!) {
        applicationPackageDetails(packageId: $packageId) {
          packageId
          rootPath
          source
          managedInstallPath
          bundledSourceRootPath
          isPlatformOwned
        }
      }`,
      {
        packageId: linkedPackage?.packageId,
      },
    );

    expect(details.applicationPackageDetails).toMatchObject({
      packageId: linkedPackage?.packageId,
      rootPath: path.resolve(externalRoot),
      source: path.resolve(externalRoot),
      managedInstallPath: null,
      bundledSourceRootPath: null,
      isPlatformOwned: false,
    });

    const removed = await execGraphql<{
      removeApplicationPackage: Array<{
        packageId: string;
        sourceSummary: string | null;
      }>;
    }>(
      `mutation RemoveApplicationPackage($packageId: String!) {
        removeApplicationPackage(packageId: $packageId) {
          packageId
          sourceSummary
        }
      }`,
      {
        packageId: linkedPackage?.packageId,
      },
    );

    expect(
      removed.removeApplicationPackage.find((entry) => entry.sourceSummary === path.resolve(externalRoot)),
    ).toBeUndefined();
    expect(removed.removeApplicationPackage[0]?.packageId).toBe(BUILT_IN_APPLICATION_PACKAGE_ID);
  });

  it("makes Brief Studio immediately launchable after import and hides it again after remove until re-import", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), `application-packages-cache-refresh-${unique}-`));
    const appDataRoot = path.join(tempRoot, "app-data");
    const registryRoot = path.join(tempRoot, "registry");
    const bundledSourceRoot = path.join(tempRoot, "bundled-source");

    cleanupPaths.add(tempRoot);
    await fs.mkdir(appDataRoot, { recursive: true });
    await fs.mkdir(registryRoot, { recursive: true });
    await fs.mkdir(bundledSourceRoot, { recursive: true });
    delete process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS;

    appConfigProvider.resetForTests();
    appConfigProvider.initialize({ appDataDir: appDataRoot });

    const rootSettingsStore = createTestRootSettingsStore(appDataRoot);
    const registryStore = createTestRegistryStore(registryRoot);

    ApplicationBundleService.resetInstance();
    const applicationBundleService = ApplicationBundleService.getInstance({
      provider: new FileApplicationBundleProvider(
        {
          getAppRootDir: () => bundledSourceRoot,
        } as never,
        rootSettingsStore as never,
        registryStore as never,
      ),
      rootSettingsStore,
      registryStore,
      builtInMaterializer: {
        ensureMaterialized: async () => undefined,
      },
    });

    const agentDefinitionService = new AgentDefinitionService();
    const agentTeamDefinitionService = new AgentTeamDefinitionService();

    expect(await applicationBundleService.listApplications()).toEqual([]);
    expect(
      (await agentTeamDefinitionService.getAllDefinitions()).filter(
        (definition) => definition.ownerLocalApplicationId === "brief-studio",
      ),
    ).toEqual([]);
    expect(
      (await agentDefinitionService.getVisibleAgentDefinitions()).filter(
        (definition) => definition.ownerLocalApplicationId === "brief-studio",
      ),
    ).toEqual([]);

    const packageService = new ApplicationPackageService({
      rootSettingsStore,
      registryStore,
      refreshApplicationBundles: () => applicationBundleService.refresh(),
      refreshAgentDefinitions: () => agentDefinitionService.refreshCache(),
      refreshAgentTeams: () => agentTeamDefinitionService.refreshCache(),
      validateApplicationPackageContents: (packageRoot) =>
        applicationBundleService.validatePackageRoot(packageRoot),
      builtInMaterializer: createBuiltInMaterializer(bundledSourceRoot),
    });

    const importedPackages = await packageService.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: BRIEF_STUDIO_IMPORTABLE_PACKAGE_ROOT,
    });
    const importedPackage = importedPackages.find(
      (entry) => entry.sourceSummary === path.resolve(BRIEF_STUDIO_IMPORTABLE_PACKAGE_ROOT),
    );
    expect(importedPackage).toBeTruthy();

    const [importedApplication] = (await applicationBundleService.listApplications()).filter(
      (application) =>
        application.localApplicationId === "brief-studio"
        && application.packageId === importedPackage?.packageId,
    );
    expect(importedApplication).toBeTruthy();
    expect(importedApplication?.runtimeTarget.kind).toBe("AGENT_TEAM");

    const importedTeam = await agentTeamDefinitionService.getDefinitionById(
      importedApplication!.runtimeTarget.definitionId,
    );
    expect(importedTeam).not.toBeNull();
    expect(importedTeam?.nodes.map((node) => ({
      memberName: node.memberName,
      ref: node.ref,
      refType: node.refType,
      refScope: node.refScope ?? null,
    }))).toEqual([
      {
        memberName: "researcher",
        ref: "researcher",
        refType: "agent",
        refScope: "team_local",
      },
      {
        memberName: "writer",
        ref: "writer",
        refType: "agent",
        refScope: "team_local",
      },
    ]);

    const expectedVisibleAgentIds = importedTeam!.nodes
      .filter((node) => node.refType === "agent")
      .map((node) =>
        buildTeamLocalAgentDefinitionId(importedApplication!.runtimeTarget.definitionId, node.ref),
      )
      .sort();

    expect(
      (await agentDefinitionService.getVisibleAgentDefinitions())
        .filter((definition) => definition.ownerApplicationId === importedApplication!.id)
        .map((definition) => definition.id)
        .sort(),
    ).toEqual(expectedVisibleAgentIds);

    const sessionStateStore = createInMemorySessionStateStore();
    const teamRunService = {
      createTeamRun: vi.fn(async (input: {
        teamDefinitionId: string;
        memberConfigs: Array<Record<string, unknown>>;
      }) => ({
        runId: "team-run-1",
        config: {
          memberConfigs: input.memberConfigs.map((memberConfig, index) => ({
            ...memberConfig,
            memberRunId: `member-run-${index + 1}`,
          })),
        },
      })),
      terminateTeamRun: vi.fn().mockResolvedValue(true),
      resolveTeamRun: vi.fn(),
    };

    const sessionService = new ApplicationSessionService({
      applicationBundleService: applicationBundleService as never,
      agentDefinitionService: agentDefinitionService as never,
      agentTeamDefinitionService: agentTeamDefinitionService as never,
      teamRunService: teamRunService as never,
      agentRunService: {
        createAgentRun: vi.fn(),
        terminateAgentRun: vi.fn(),
        resolveAgentRun: vi.fn(),
      } as never,
      sessionStateStore: sessionStateStore as never,
      publicationService: {
        recordSessionStarted: vi.fn().mockResolvedValue(undefined),
        recordSessionTerminated: vi.fn().mockResolvedValue(undefined),
        appendRuntimePublication: vi.fn(),
      } as never,
      streamService: {
        publish: vi.fn(),
      } as never,
    });

    const memberConfigs = importedTeam!.nodes
      .filter((node) => node.refType === "agent")
      .map((node) => ({
        memberName: node.memberName,
        memberRouteKey: node.memberName,
        agentDefinitionId: buildTeamLocalAgentDefinitionId(
          importedApplication!.runtimeTarget.definitionId,
          node.ref,
        ),
        llmModelIdentifier: "gpt-5.4",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
        workspaceId: "workspace-1",
        workspaceRootPath: "/tmp/workspace",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }));

    const launchedSession = await sessionService.createApplicationSession({
      applicationId: importedApplication!.id,
      memberConfigs,
    });

    expect(launchedSession.runtime.kind).toBe("AGENT_TEAM");
    expect(
      launchedSession.view.members.map((member) => member.memberRouteKey).sort(),
    ).toEqual(["researcher", "writer"]);
    expect(teamRunService.createTeamRun).toHaveBeenCalledTimes(1);
    expect(teamRunService.createTeamRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamDefinitionId: importedApplication!.runtimeTarget.definitionId,
        memberConfigs: expect.arrayContaining(
          expectedVisibleAgentIds.map((definitionId) =>
            expect.objectContaining({
              agentDefinitionId: definitionId,
            }),
          ),
        ),
      }),
    );

    await sessionService.terminateSession(launchedSession.applicationSessionId);

    await packageService.removeApplicationPackage(importedPackage!.packageId);

    expect(await applicationBundleService.listApplications()).toEqual([]);
    expect(
      await agentTeamDefinitionService.getDefinitionById(importedApplication!.runtimeTarget.definitionId),
    ).toBeNull();
    expect(
      (await agentDefinitionService.getVisibleAgentDefinitions())
        .filter((definition) => definition.ownerApplicationId === importedApplication!.id),
    ).toEqual([]);
    await expect(
      sessionService.createApplicationSession({
        applicationId: importedApplication!.id,
        memberConfigs,
      }),
    ).rejects.toThrow(`Application '${importedApplication!.id}' was not found.`);

    await packageService.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: BRIEF_STUDIO_IMPORTABLE_PACKAGE_ROOT,
    });

    const [reimportedApplication] = (await applicationBundleService.listApplications()).filter(
      (application) =>
        application.localApplicationId === "brief-studio"
        && application.packageId === importedPackage?.packageId,
    );
    expect(reimportedApplication?.id).toBe(importedApplication!.id);
    expect(
      await agentTeamDefinitionService.getDefinitionById(reimportedApplication!.runtimeTarget.definitionId),
    ).not.toBeNull();
    expect(
      (await agentDefinitionService.getVisibleAgentDefinitions())
        .filter((definition) => definition.ownerApplicationId === reimportedApplication!.id)
        .map((definition) => definition.id)
        .sort(),
    ).toEqual(expectedVisibleAgentIds);

    const relaunchedSession = await sessionService.createApplicationSession({
      applicationId: reimportedApplication!.id,
      memberConfigs,
    });
    expect(relaunchedSession.runtime.kind).toBe("AGENT_TEAM");
    expect(teamRunService.createTeamRun).toHaveBeenCalledTimes(2);
  });
});
