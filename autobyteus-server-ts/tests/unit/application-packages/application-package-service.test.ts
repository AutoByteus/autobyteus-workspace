import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BUILT_IN_APPLICATION_PACKAGE_ID, FileApplicationBundleProvider } from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { GitHubApplicationPackageInstaller } from "../../../src/application-packages/installers/github-application-package-installer.js";
import { ApplicationPackageService } from "../../../src/application-packages/services/application-package-service.js";
import { ApplicationPackageRegistryStore } from "../../../src/application-packages/stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../../../src/application-packages/stores/application-package-root-settings-store.js";
import type { GitHubRepositorySource } from "../../../src/application-packages/types.js";

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

const writeApplicationBundle = async (packageRoot: string, applicationId: string): Promise<void> => {
  const bundleRoot = path.join(packageRoot, "applications", applicationId);
  await fs.mkdir(path.join(bundleRoot, "ui"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "dist"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "migrations"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "backend", "assets"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "agents", "sample-agent"), { recursive: true });
  await fs.mkdir(path.join(bundleRoot, "agent-teams", "sample-team"), { recursive: true });
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
  await fs.writeFile(path.join(bundleRoot, "agents", "sample-agent", "agent.md"), "---\nname: Sample Agent\ndescription: sample\n---\n", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "agents", "sample-agent", "agent-config.json"), JSON.stringify({ defaultLaunchConfig: { runtimeKind: "autobyteus" } }, null, 2));
  await fs.writeFile(path.join(bundleRoot, "agent-teams", "sample-team", "team.md"), "---\nname: Sample Team\ndescription: sample\n---\n", "utf-8");
  await fs.writeFile(path.join(bundleRoot, "agent-teams", "sample-team", "team-config.json"), JSON.stringify({ coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "sample-agent", refType: "agent", refScope: "application_owned" }] }, null, 2));
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
      path.join(invalidRoot, "applications", "broken-app", "agents", "sample-agent", "agent.md"),
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
