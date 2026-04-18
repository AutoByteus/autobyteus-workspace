import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { ApplicationPackageService } from "../../../src/application-packages/services/application-package-service.js";
import { ApplicationPackageRegistryStore } from "../../../src/application-packages/stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../../../src/application-packages/stores/application-package-root-settings-store.js";
import { BUILT_IN_APPLICATION_PACKAGE_ID } from "../../../src/application-bundles/providers/file-application-bundle-provider.js";

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
});
