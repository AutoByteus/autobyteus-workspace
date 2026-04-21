import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";
import {
  buildCanonicalApplicationId,
} from "../../../src/application-bundles/utils/application-bundle-identity.js";
import { BUILT_IN_APPLICATION_PACKAGE_ID, FileApplicationBundleProvider } from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationAvailabilityService } from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { buildApplicationStorageKey } from "../../../src/application-storage/utils/application-storage-paths.js";
import { GitHubApplicationPackageInstaller } from "../../../src/application-packages/installers/github-application-package-installer.js";
import { ApplicationPackageService } from "../../../src/application-packages/services/application-package-service.js";
import { ApplicationPackageRegistryStore } from "../../../src/application-packages/stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../../../src/application-packages/stores/application-package-root-settings-store.js";
import type { GitHubRepositorySource } from "../../../src/application-packages/types.js";
import { buildLocalApplicationPackageId } from "../../../src/application-packages/utils/application-package-root-summary.js";

const parseAdditionalRoots = (): string[] => {
  const raw = process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS ?? "";
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
};

const createRootSettingsStore = (appDataRoot: string): ApplicationPackageRootSettingsStore =>
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

const createBuiltInMaterializer = (bundledSourceRootPath: string) => ({
  ensureMaterialized: async () => undefined,
  getBundledSourceRootPath: () => path.resolve(bundledSourceRootPath),
});

const createLongImportedPackageRoot = async (
  baseRoot: string,
  localApplicationId: string,
): Promise<string> => {
  let currentRoot = path.join(baseRoot, "imported-package-root");
  let depth = 0;

  while (true) {
    const candidate = path.join(currentRoot, "package-root");
    const applicationId = buildCanonicalApplicationId(
      buildLocalApplicationPackageId(path.resolve(candidate)),
      localApplicationId,
    );
    if (applicationId.length > 240) {
      await fs.mkdir(candidate, { recursive: true });
      return candidate;
    }
    depth += 1;
    currentRoot = path.join(currentRoot, `very-long-package-segment-${String(depth).padStart(2, "0")}`);
  }
};

const writeApplicationBundle = async (packageRoot: string, applicationId: string): Promise<void> => {
  const bundleRoot = path.join(packageRoot, "applications", applicationId);
  await fs.mkdir(path.join(bundleRoot, "ui"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "dist"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "migrations"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "assets"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "agent-teams", "sample-team", "agents", "sample-agent"), { recursive: true });
  await fs.writeFile(path.join(bundleRoot, "application.json"), JSON.stringify({
    manifestVersion: "3",
    id: applicationId,
    name: applicationId,
    ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "2" },
    backend: { bundleManifest: "backend/bundle.json" },
    resourceSlots: [
      {
        slotKey: "draftingTeam",
        name: "Drafting Team",
        allowedResourceKinds: ["AGENT_TEAM"],
        defaultResourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "sample-team",
        },
      },
    ],
  }, null, 2));
  await fs.writeFile(path.join(bundleRoot, "ui", "index.html"), "<html></html>", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "backend", "bundle.json"), JSON.stringify({
    contractVersion: "1",
    entryModule: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: { engine: "node", semver: ">=22 <23" },
    sdkCompatibility: { backendDefinitionContractVersion: "2", frontendSdkContractVersion: "2" },
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

describe("ApplicationPackageService", () => {
  const cleanupPaths = new Set<string>();

  afterEach(async () => {
    for (const filePath of cleanupPaths) {
      await fs.rm(filePath, { recursive: true, force: true }).catch(() => undefined);
    }
    cleanupPaths.clear();
    delete process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS;
  });

  it("hides the built-in package row when the current built-in application set is empty", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(localRoot, "linked-app");

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });

    const packages = await service.listApplicationPackages();
    expect(packages.find((entry) => entry.packageId === BUILT_IN_APPLICATION_PACKAGE_ID)).toBeUndefined();
    expect(packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKind: "LOCAL_PATH",
          sourceSummary: path.resolve(localRoot),
          isPlatformOwned: false,
          isRemovable: true,
          applicationCount: 1,
        }),
      ]),
    );

    await expect(service.getApplicationPackageDetails(BUILT_IN_APPLICATION_PACKAGE_ID)).resolves.toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      isPlatformOwned: true,
      applicationCount: 0,
      managedInstallPath: path.resolve(rootSettingsStore.getBuiltInRootPath()),
      bundledSourceRootPath: path.resolve(repoRoot),
    });
  });

  it("lists safe package rows and exposes details through the debug details lookup", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    const builtInRoot = rootSettingsStore.getBuiltInRootPath();

    await writeApplicationBundle(builtInRoot, "built-in-app");
    await writeApplicationBundle(localRoot, "linked-app");

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });

    const packages = await service.listApplicationPackages();
    expect(packages[0]).toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      displayName: "Platform Applications",
      sourceKind: "BUILT_IN",
      sourceSummary: "Managed by AutoByteus",
      isPlatformOwned: true,
      isRemovable: false,
      applicationCount: 1,
    });

    const linkedPackage = packages.find((entry) => (
      entry.packageId !== BUILT_IN_APPLICATION_PACKAGE_ID
      && entry.sourceSummary === path.resolve(localRoot)
    ));
    expect(linkedPackage).toMatchObject({
      sourceKind: "LOCAL_PATH",
      isPlatformOwned: false,
      isRemovable: true,
      applicationCount: 1,
    });

    const builtInDetails = await service.getApplicationPackageDetails(BUILT_IN_APPLICATION_PACKAGE_ID);
    expect(builtInDetails).toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      rootPath: path.resolve(builtInRoot),
      source: path.resolve(repoRoot),
      managedInstallPath: path.resolve(builtInRoot),
      bundledSourceRootPath: path.resolve(repoRoot),
      sourceSummary: "Managed by AutoByteus",
      isPlatformOwned: true,
      isRemovable: false,
      applicationCount: 1,
    });

    const linkedDetails = await service.getApplicationPackageDetails(linkedPackage?.packageId ?? "");
    expect(linkedDetails).toMatchObject({
      packageId: linkedPackage?.packageId,
      rootPath: path.resolve(localRoot),
      source: path.resolve(localRoot),
      managedInstallPath: null,
      bundledSourceRootPath: null,
      sourceSummary: path.resolve(localRoot),
      isPlatformOwned: false,
      isRemovable: true,
      applicationCount: 1,
    });
  });

  it("surfaces package-registry diagnostics for missing roots and registry/settings mismatches", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const registryOnlyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-only-"));
    const missingConfiguredRoot = path.join(appDataRoot, "missing-root");

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(registryOnlyRoot);

    process.env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS = missingConfiguredRoot;

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    const registryStore = new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot });
    await registryStore.upsertLinkedLocalPackageRecord(registryOnlyRoot);

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore,
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    const snapshot = await service.getRegistrySnapshot();

    expect(snapshot.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageRootPath: path.resolve(missingConfiguredRoot),
          message: expect.stringContaining("configured but no registry record exists"),
        }),
        expect.objectContaining({
          packageRootPath: path.resolve(missingConfiguredRoot),
          message: expect.stringContaining("root is missing"),
        }),
        expect.objectContaining({
          packageRootPath: path.resolve(registryOnlyRoot),
          message: expect.stringContaining("registered in the registry but not present in configured roots"),
        }),
      ]),
    );
  });

  it("rejects duplicate GitHub imports before reinstalling", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-managed-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), "built-in-app");

    class MockInstaller extends GitHubApplicationPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedRoot, installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await writeApplicationBundle(installDir, "github-app");
        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      installer: new MockInstaller(),
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await service.importApplicationPackage({
      sourceKind: "GITHUB_REPOSITORY",
      source: "https://github.com/AutoByteus/autobyteus-apps",
    });

    await expect(
      service.importApplicationPackage({
        sourceKind: "GITHUB_REPOSITORY",
        source: "https://github.com/autobyteus/autobyteus-apps",
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("refreshes application bundles and definition caches after local import and removal", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), "built-in-app");
    await writeApplicationBundle(localRoot, "linked-app");

    const refreshCalls: string[] = [];
    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      refreshApplicationBundles: async () => {
        refreshCalls.push("bundles");
      },
      refreshAgentDefinitions: async () => {
        refreshCalls.push("agent-definitions");
      },
      refreshAgentTeams: async () => {
        refreshCalls.push("agent-teams");
      },
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    const importedPackages = await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    const linkedPackage = importedPackages.find((entry) => entry.sourceSummary === path.resolve(localRoot));

    await service.removeApplicationPackage(linkedPackage?.packageId ?? "");

    expect(refreshCalls).toEqual([
      "bundles",
      "agent-definitions",
      "agent-teams",
      "bundles",
      "agent-definitions",
      "agent-teams",
    ]);
  });

  it("removes a stale linked local package when the root is still in settings but the registry record is already missing", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    const rootSettingsStore = new ApplicationPackageRootSettingsStore(
      {
        getAppDataDir: () => appDataRoot,
        getAdditionalApplicationPackageRoots: () => (
          fsSync.existsSync(localRoot) ? [localRoot] : []
        ),
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
    const registryStore = new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot });
    await writeApplicationBundle(localRoot, "linked-app");

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore,
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    const linkedPackageId = buildLocalApplicationPackageId(path.resolve(localRoot));

    await registryStore.removePackageRecord(linkedPackageId);
    await fs.rm(localRoot, { recursive: true, force: true });

    await expect(service.listApplicationPackages()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageId: linkedPackageId,
          sourceKind: "LOCAL_PATH",
        }),
      ]),
    );

    const remainingPackages = await service.removeApplicationPackage(linkedPackageId);

    expect(remainingPackages.find((entry) => entry.packageId === linkedPackageId)).toBeUndefined();
    expect(rootSettingsStore.listAdditionalRootPaths()).toEqual([]);
    await expect(registryStore.findPackageById(linkedPackageId)).resolves.toBeNull();
  });

  it("removes a stale linked local package when the registry record remains but the settings entry is already missing", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    const registryStore = new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot });
    await writeApplicationBundle(localRoot, "linked-app");

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore,
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    const linkedPackageId = buildLocalApplicationPackageId(path.resolve(localRoot));

    rootSettingsStore.removeAdditionalRootPath(localRoot);
    await fs.rm(localRoot, { recursive: true, force: true });

    await expect(service.listApplicationPackages()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageId: linkedPackageId,
          sourceKind: "LOCAL_PATH",
        }),
      ]),
    );

    const remainingPackages = await service.removeApplicationPackage(linkedPackageId);

    expect(remainingPackages.find((entry) => entry.packageId === linkedPackageId)).toBeUndefined();
    expect(rootSettingsStore.listAdditionalRootPaths()).toEqual([]);
    await expect(registryStore.findPackageById(linkedPackageId)).resolves.toBeNull();
  });

  it("keeps removed long-id apps with persisted platform state under quarantined availability ownership", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRootBase = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));
    const localRoot = await createLongImportedPackageRoot(localRootBase, "linked-app");

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRootBase);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), "built-in-app");
    await writeApplicationBundle(localRoot, "linked-app");

    const linkedPackageId = buildLocalApplicationPackageId(path.resolve(localRoot));
    const linkedApplicationId = buildCanonicalApplicationId(linkedPackageId, "linked-app");
    let linkedAppDiscoverable = true;
    const buildCatalogSnapshot = () => ({
      refreshedAt: new Date().toISOString(),
      applications: linkedAppDiscoverable
        ? [{ id: linkedApplicationId }]
        : [],
      diagnostics: [],
    });
    const applicationBundleService = {
      getCatalogSnapshot: vi.fn(async () => buildCatalogSnapshot()),
      getApplicationById: vi.fn(async (applicationId: string) => (
        buildCatalogSnapshot().applications.find((application) => application.id === applicationId) ?? null
      )),
      getDiagnosticByApplicationId: vi.fn(async () => null),
    };
    const availabilityService = new ApplicationAvailabilityService({
      applicationBundleService: applicationBundleService as never,
      dispatchService: {
        suspendApplication: vi.fn(),
      } as never,
    });
    const platformStateStore = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => appDataRoot },
      storageLifecycleService: new ApplicationStorageLifecycleService({
        appConfig: { getAppDataDir: () => appDataRoot },
        applicationBundleService: {
          getApplicationById: vi.fn(async (applicationId: string) => (
            applicationId === linkedApplicationId && linkedAppDiscoverable ? { id: applicationId } : null
          )),
        } as never,
      }),
    });
    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      refreshApplicationBundles: async () => {
        linkedAppDiscoverable = rootSettingsStore.listAdditionalRootPaths().includes(path.resolve(localRoot));
      },
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
      applicationBundleService: applicationBundleService as never,
      availabilityService: availabilityService as never,
      platformStateStore: platformStateStore as never,
    });

    expect(linkedApplicationId.length).toBeGreaterThan(240);
    expect(buildApplicationStorageKey(linkedApplicationId)).not.toBe(encodeURIComponent(linkedApplicationId));

    const importedPackages = await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    const linkedPackage = importedPackages.find((entry) => entry.packageId === linkedPackageId);
    expect(linkedPackage).toBeDefined();

    await platformStateStore.withDatabase(linkedApplicationId, () => undefined);
    await expect(platformStateStore.listKnownApplicationIds()).resolves.toEqual([linkedApplicationId]);
    await expect(availabilityService.getAvailability(linkedApplicationId)).resolves.toMatchObject({
      state: "ACTIVE",
    });

    await service.removeApplicationPackage(linkedPackageId);

    const availability = await availabilityService.getAvailability(linkedApplicationId);
    expect(availability).toMatchObject({
      state: "QUARANTINED",
    });
    expect(availability?.detail).toContain("Persisted platform state still exists");

    const backendGatewayService = new ApplicationBackendGatewayService({
      applicationBundleService: applicationBundleService as never,
      availabilityService: availabilityService as never,
      engineHostService: {
        ensureApplicationEngine: vi.fn(),
      } as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    await expect(
      backendGatewayService.ensureApplicationReady(linkedApplicationId),
    ).rejects.toThrow("currently quarantined");
  });

  it("keeps reloaded long-id packages without a valid catalog entry under persisted-only quarantined ownership", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const localRootBase = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-local-"));
    const localRoot = await createLongImportedPackageRoot(localRootBase, "linked-app");

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(localRootBase);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), "built-in-app");
    await writeApplicationBundle(localRoot, "linked-app");

    const linkedPackageId = buildLocalApplicationPackageId(path.resolve(localRoot));
    const linkedApplicationId = buildCanonicalApplicationId(linkedPackageId, "linked-app");
    let linkedAppDiscoverable = true;
    const buildCatalogSnapshot = () => ({
      refreshedAt: new Date().toISOString(),
      applications: linkedAppDiscoverable
        ? [{ id: linkedApplicationId }]
        : [],
      diagnostics: [],
    });
    const applicationBundleService = {
      getCatalogSnapshot: vi.fn(async () => buildCatalogSnapshot()),
      getApplicationById: vi.fn(async (applicationId: string) => (
        buildCatalogSnapshot().applications.find((application) => application.id === applicationId) ?? null
      )),
      getDiagnosticByApplicationId: vi.fn(async () => null),
    };
    const availabilityService = new ApplicationAvailabilityService({
      applicationBundleService: applicationBundleService as never,
      dispatchService: {
        suspendApplication: vi.fn(),
      } as never,
    });
    const platformStateStore = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => appDataRoot },
      storageLifecycleService: new ApplicationStorageLifecycleService({
        appConfig: { getAppDataDir: () => appDataRoot },
        applicationBundleService: {
          getApplicationById: vi.fn(async (applicationId: string) => (
            applicationId === linkedApplicationId && linkedAppDiscoverable ? { id: applicationId } : null
          )),
        } as never,
      }),
    });
    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
      applicationBundleService: applicationBundleService as never,
      availabilityService: availabilityService as never,
      platformStateStore: platformStateStore as never,
    });

    expect(linkedApplicationId.length).toBeGreaterThan(240);
    expect(buildApplicationStorageKey(linkedApplicationId)).not.toBe(encodeURIComponent(linkedApplicationId));

    await service.importApplicationPackage({
      sourceKind: "LOCAL_PATH",
      source: localRoot,
    });
    await platformStateStore.withDatabase(linkedApplicationId, () => undefined);
    await expect(platformStateStore.listKnownApplicationIds()).resolves.toEqual([linkedApplicationId]);
    linkedAppDiscoverable = false;

    await service.reloadPackage(linkedPackageId);

    const availability = await availabilityService.getAvailability(linkedApplicationId);
    expect(availability).toMatchObject({
      state: "QUARANTINED",
    });
    expect(availability?.detail).toContain("Persisted platform state still exists");
  });

  it("rolls back a managed GitHub import when catalog refresh fails after package registration", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-managed-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), "built-in-app");

    class MockInstaller extends GitHubApplicationPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedRoot, installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await writeApplicationBundle(installDir, "github-app");
        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      installer: new MockInstaller(),
      refreshApplicationBundles: vi.fn(async () => undefined),
      refreshAgentDefinitions: vi.fn(async () => {
        throw new Error("refresh failed");
      }),
      refreshAgentTeams: vi.fn(async () => undefined),
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await expect(
      service.importApplicationPackage({
        sourceKind: "GITHUB_REPOSITORY",
        source: "https://github.com/AutoByteus/autobyteus-apps",
      }),
    ).rejects.toThrow(/refresh failed/i);

    expect(parseAdditionalRoots()).toEqual([]);

    const registryStore = new ApplicationPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    expect(
      await registryStore.findGitHubPackageBySource("autobyteus/autobyteus-apps"),
    ).toBeNull();

    await expect(
      fs.access(path.join(managedRoot, "autobyteus__autobyteus-apps")),
    ).rejects.toBeDefined();
  });

  it("restores a managed GitHub package when removal refresh fails", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const managedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-managed-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedRoot);

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    await writeApplicationBundle(rootSettingsStore.getBuiltInRootPath(), "built-in-app");

    class MockInstaller extends GitHubApplicationPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedRoot, installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await writeApplicationBundle(installDir, "github-app");
        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    let shouldFailRefresh = false;

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore: new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot }),
      installer: new MockInstaller(),
      refreshApplicationBundles: vi.fn(async () => undefined),
      refreshAgentDefinitions: vi.fn(async () => {
        if (shouldFailRefresh) {
          throw new Error("refresh failed");
        }
      }),
      refreshAgentTeams: vi.fn(async () => undefined),
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    const importedPackages = await service.importApplicationPackage({
      sourceKind: "GITHUB_REPOSITORY",
      source: "https://github.com/AutoByteus/autobyteus-apps",
    });
    const managedPackage = importedPackages.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );
    const managedInstallDir = path.join(managedRoot, "autobyteus__autobyteus-apps");

    expect(managedPackage).toBeDefined();
    shouldFailRefresh = true;

    await expect(
      service.removeApplicationPackage(managedPackage?.packageId ?? ""),
    ).rejects.toThrow(/refresh failed/i);

    expect(parseAdditionalRoots()).toContain(managedInstallDir);

    const registryStore = new ApplicationPackageRegistryStore({
      getAppDataDir: () => registryRoot,
    });
    expect(
      await registryStore.findGitHubPackageBySource("autobyteus/autobyteus-apps"),
    ).not.toBeNull();

    await expect(fs.access(managedInstallDir)).resolves.toBeUndefined();
  });

  it("fails local package import before registration when an application-owned agent definition is malformed", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));
    const invalidRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-invalid-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    cleanupPaths.add(invalidRoot);

    await writeApplicationBundle(invalidRoot, "broken-app");
    await fs.writeFile(
      path.join(
        invalidRoot,
        "applications",
        "broken-app",
        "agent-teams",
        "sample-team",
        "agents",
        "sample-agent",
        "agent.md",
      ),
      "# malformed agent definition\n",
      "utf-8",
    );

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    const registryStore = new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot });
    const validatingProvider = new FileApplicationBundleProvider(
      {
        getAppRootDir: () => repoRoot,
      } as never,
      rootSettingsStore as never,
      registryStore as never,
    );

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore,
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: (packageRoot) =>
        validatingProvider.validatePackageRoot(
          packageRoot,
          `local:${path.basename(packageRoot)}`,
        ),
      builtInMaterializer: createBuiltInMaterializer(repoRoot),
    });

    await expect(
      service.importApplicationPackage({
        sourceKind: "LOCAL_PATH",
        source: invalidRoot,
      }),
    ).rejects.toThrow("agent.md must start with '---' frontmatter delimiter");

    expect(rootSettingsStore.listAdditionalRootPaths()).toEqual([]);
    expect(await registryStore.listPackageRecords()).toEqual([]);
  });

  it("rejects importing the bundled platform source root as a linked local package", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-repo-"));
    const appDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-app-data-"));
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "application-package-registry-"));

    cleanupPaths.add(repoRoot);
    cleanupPaths.add(appDataRoot);
    cleanupPaths.add(registryRoot);
    await fs.mkdir(path.join(repoRoot, "applications"), { recursive: true });

    const rootSettingsStore = createRootSettingsStore(appDataRoot);
    const registryStore = new ApplicationPackageRegistryStore({ getAppDataDir: () => registryRoot });
    const builtInMaterializer = createBuiltInMaterializer(repoRoot);

    const service = new ApplicationPackageService({
      rootSettingsStore,
      registryStore,
      refreshApplicationBundles: async () => undefined,
      refreshAgentDefinitions: async () => undefined,
      refreshAgentTeams: async () => undefined,
      validateApplicationPackageContents: async () => undefined,
      builtInMaterializer,
    });

    await expect(
      service.importApplicationPackage({
        sourceKind: "LOCAL_PATH",
        source: builtInMaterializer.getBundledSourceRootPath(),
      }),
    ).rejects.toThrow("bundled platform application source root");

    expect(rootSettingsStore.listAdditionalRootPaths()).toEqual([]);
    expect(await registryStore.listPackageRecords()).toEqual([]);
  });
});
