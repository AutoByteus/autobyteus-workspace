import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILT_IN_APPLICATION_PACKAGE_ID,
  FileApplicationBundleProvider,
} from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import {
  buildCanonicalApplicationId,
  buildCanonicalApplicationOwnedTeamId,
} from "../../../src/application-bundles/utils/application-bundle-identity.js";

const writeFile = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");
};

describe("FileApplicationBundleProvider", () => {
  let tempRoot: string;
  let appRoot: string;
  let appDataRoot: string;
  let builtInRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-app-bundles-"));
    appRoot = path.join(tempRoot, "app-root");
    appDataRoot = path.join(tempRoot, "app-data");
    builtInRoot = path.join(appDataRoot, "application-packages", "platform");
    await fs.mkdir(appRoot, { recursive: true });
    await fs.mkdir(builtInRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const buildProvider = (options?: {
    additionalRootPaths?: string[];
    registryRecords?: Array<{ packageId: string; rootPath: string }>;
  }) => {
    const provider = new FileApplicationBundleProvider(
      {
        getAppRootDir: () => appRoot,
      } as never,
      {
        getBuiltInRootPath: () => builtInRoot,
        listAdditionalRootPaths: () => options?.additionalRootPaths ?? [],
      } as never,
      {
        listPackageRecords: async () => options?.registryRecords ?? [],
      } as never,
    );
    const registryByRootPath = new Map(
      (options?.registryRecords ?? []).map((record) => [path.resolve(record.rootPath), record]),
    );
    const seenRootPaths = new Set<string>();
    const packageEntries = [
      {
        packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
        displayName: 'Platform Applications',
        packageRootPath: builtInRoot,
        sourceKind: 'BUILT_IN' as const,
        source: appRoot,
        applicationCount: 0,
        isPlatformOwned: true,
        isRemovable: false,
        managedInstallPath: builtInRoot,
        bundledSourceRootPath: appRoot,
      },
    ];
    seenRootPaths.add(path.resolve(builtInRoot));

    for (const additionalRootPath of options?.additionalRootPaths ?? []) {
      const resolvedRootPath = path.resolve(additionalRootPath);
      if (seenRootPaths.has(resolvedRootPath)) {
        continue;
      }
      seenRootPaths.add(resolvedRootPath);
      const record = registryByRootPath.get(resolvedRootPath);
      packageEntries.push({
        packageId: record?.packageId ?? `application-local:${encodeURIComponent(resolvedRootPath)}`,
        displayName: path.basename(resolvedRootPath) || resolvedRootPath,
        packageRootPath: resolvedRootPath,
        sourceKind: record ? 'GITHUB_REPOSITORY' as const : 'LOCAL_PATH' as const,
        source: resolvedRootPath,
        applicationCount: 0,
        isPlatformOwned: false,
        isRemovable: true,
        managedInstallPath: null,
        bundledSourceRootPath: null,
      });
    }

    return {
      listBundles: () => provider.listBundles({
        packages: packageEntries,
        diagnostics: [],
        refreshedAt: new Date().toISOString(),
      }),
      getCatalogSnapshot: () => provider.getCatalogSnapshot({
        packages: packageEntries,
        diagnostics: [],
        refreshedAt: new Date().toISOString(),
      }),
      validatePackageRoot: provider.validatePackageRoot.bind(provider),
      buildApplicationOwnedAgentSources: provider.buildApplicationOwnedAgentSources.bind(provider),
      buildApplicationOwnedTeamSources: provider.buildApplicationOwnedTeamSources.bind(provider),
    };
  };

  const writeBundle = async (
    packageRootPath: string = builtInRoot,
    options?: {
      localApplicationId?: string;
      teamMemberRef?: string;
      teamDefaultLaunchConfig?: Record<string, unknown> | null;
      manifestOverrides?: Record<string, unknown>;
    },
  ): Promise<void> => {
    const localApplicationId = options?.localApplicationId ?? "sample-app";
    const teamMemberRef = options?.teamMemberRef ?? "sample-agent";
    const bundleRoot = path.join(packageRootPath, "applications", localApplicationId);

    await writeFile(
      path.join(bundleRoot, "application.json"),
      JSON.stringify(
        {
          manifestVersion: "3",
          id: localApplicationId,
          name: "Sample App",
          description: "Sample description",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "2",
          },
          backend: {
            bundleManifest: "backend/bundle.json",
          },
          resourceSlots: [
            {
              slotKey: "draftingTeam",
              name: "Drafting Team",
              allowedResourceKinds: ["AGENT_TEAM"],
              supportedLaunchDefaults: {
                runtimeKind: true,
                llmModelIdentifier: true,
                workspaceRootPath: true,
              },
              defaultResourceRef: {
                owner: "bundle",
                kind: "AGENT_TEAM",
                localId: "sample-team",
              },
            },
          ],
          ...(options?.manifestOverrides ?? {}),
        },
        null,
        2,
      ),
    );
    await writeFile(
      path.join(bundleRoot, "ui", "index.html"),
      "<!doctype html><html><body>ok</body></html>\n",
    );
    await writeFile(
      path.join(bundleRoot, "backend", "bundle.json"),
      JSON.stringify(
        {
          contractVersion: "1",
          entryModule: "backend/dist/entry.mjs",
          moduleFormat: "esm",
          distribution: "self-contained",
          targetRuntime: { engine: "node", semver: ">=22 <23" },
          sdkCompatibility: {
            backendDefinitionContractVersion: "2",
            frontendSdkContractVersion: "2",
          },
          supportedExposures: {
            queries: true,
            commands: true,
            routes: true,
            graphql: true,
            notifications: true,
            eventHandlers: true,
          },
          migrationsDir: "backend/migrations",
          assetsDir: "backend/assets",
        },
        null,
        2,
      ),
    );
    await writeFile(
      path.join(bundleRoot, "backend", "dist", "entry.mjs"),
      "export default { definitionContractVersion: '2' }\n",
    );
    await fs.mkdir(path.join(bundleRoot, "backend", "migrations"), { recursive: true });
    await fs.mkdir(path.join(bundleRoot, "backend", "assets"), { recursive: true });
    await writeFile(
      path.join(bundleRoot, "agent-teams", "sample-team", "team.md"),
      [
        "---",
        "name: Sample Team",
        "description: Sample team",
        "category: Demo",
        "---",
        "",
        "Coordinate the bundled sample agent.",
      ].join("\n"),
    );
    await writeFile(
      path.join(bundleRoot, "agent-teams", "sample-team", "agents", "sample-agent", "agent.md"),
      [
        "---",
        "name: Sample Agent",
        "description: Sample agent",
        "category: Demo",
        "role: Helper",
        "---",
        "",
        "Help the bundled application.",
      ].join("\n"),
    );
    await writeFile(
      path.join(bundleRoot, "agent-teams", "sample-team", "agents", "sample-agent", "agent-config.json"),
      JSON.stringify({ defaultLaunchConfig: { runtimeKind: "autobyteus" } }, null, 2),
    );
    await writeFile(
      path.join(bundleRoot, "agent-teams", "sample-team", "team-config.json"),
      JSON.stringify(
        {
          coordinatorMemberName: "lead",
          defaultLaunchConfig: options?.teamDefaultLaunchConfig ?? { runtimeKind: "autobyteus" },
          members: [
            {
              memberName: "lead",
              ref: teamMemberRef,
              refType: "agent",
              refScope: "team_local",
            },
          ],
        },
        null,
        2,
      ),
    );
  };

  it("treats an empty managed built-in application root as a valid steady state", async () => {
    const provider = buildProvider();

    await expect(provider.listBundles()).resolves.toEqual([]);
    await expect(provider.getCatalogSnapshot()).resolves.toMatchObject({
      applications: [],
      diagnostics: [],
    });
  });

  it("lists valid bundles from the managed built-in application root with manifest resource slots", async () => {
    await writeBundle();
    const provider = buildProvider();

    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      id: buildCanonicalApplicationId(BUILT_IN_APPLICATION_PACKAGE_ID, "sample-app"),
      localApplicationId: "sample-app",
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      resourceSlots: [
        {
          slotKey: "draftingTeam",
          allowedResourceKinds: ["AGENT_TEAM"],
          allowedResourceOwners: ["bundle", "shared"],
          supportedLaunchDefaults: {
            runtimeKind: true,
            llmModelIdentifier: true,
            workspaceRootPath: true,
          },
          defaultResourceRef: {
            owner: "bundle",
            kind: "AGENT_TEAM",
            localId: "sample-team",
          },
        },
      ],
      localAgentIds: [],
      localTeamIds: ["sample-team"],
      backend: {
        entryModuleRelativePath: "backend/dist/entry.mjs",
        manifestRelativePath: "backend/bundle.json",
      },
    });

    const [bundle] = bundles;
    expect(provider.buildApplicationOwnedAgentSources(bundle!)).toEqual([]);
    expect(provider.buildApplicationOwnedTeamSources(bundle!)).toEqual([
      expect.objectContaining({
        definitionId: buildCanonicalApplicationOwnedTeamId(
          BUILT_IN_APPLICATION_PACKAGE_ID,
          "sample-app",
          "sample-team",
        ),
        applicationId: bundle!.id,
      }),
    ]);
  });

  it("surfaces malformed manifests as diagnostics instead of crashing discovery", async () => {
    await writeBundle();
    await writeFile(
      path.join(builtInRoot, "applications", "broken-app", "application.json"),
      JSON.stringify(
        {
          manifestVersion: "3",
          id: "broken-app",
          name: "Broken App",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "2",
          },
          backend: {
            bundleManifest: "backend/bundle.json",
          },
          resourceSlots: [
            {
              slotKey: "broken slot key",
              name: "Broken Slot",
              allowedResourceKinds: ["AGENT_TEAM"],
            },
          ],
        },
        null,
        2,
      ),
    );

    const snapshot = await buildProvider().getCatalogSnapshot();

    expect(snapshot.applications).toHaveLength(1);
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]).toMatchObject({
      localApplicationId: "broken-app",
    });
    expect(snapshot.diagnostics[0]?.message).toContain("slotKey");
  });

  it("fails package validation when a discovered resource-slot default does not resolve", async () => {
    await writeBundle(builtInRoot, {
      manifestOverrides: {
        resourceSlots: [
          {
            slotKey: "draftingTeam",
            name: "Drafting Team",
            allowedResourceKinds: ["AGENT_TEAM"],
            defaultResourceRef: {
              owner: "bundle",
              kind: "AGENT_TEAM",
              localId: "missing-team",
            },
          },
        ],
      },
    });
    const provider = buildProvider();

    await expect(
      provider.validatePackageRoot(builtInRoot, BUILT_IN_APPLICATION_PACKAGE_ID),
    ).rejects.toThrow("does not resolve to a discovered bundle-owned agent_team");
  });

  it("rejects bundles whose application-owned team references a missing local agent", async () => {
    await writeBundle(builtInRoot, { teamMemberRef: "missing-agent" });
    const provider = buildProvider();

    await expect(provider.validatePackageRoot(builtInRoot, BUILT_IN_APPLICATION_PACKAGE_ID)).rejects.toThrow(
      "must reference a local agent inside its own agents/ folder",
    );
  });

  it("ignores nested packaging mirrors under a discovered package root", async () => {
    await writeBundle();
    const nestedMirrorRoot = path.join(
      builtInRoot,
      "applications",
      "sample-app",
      "dist",
      "importable-package",
      "applications",
      "sample-app",
    );
    await writeFile(
      path.join(nestedMirrorRoot, "application.json"),
      JSON.stringify(
        {
          manifestVersion: "3",
          id: "sample-app",
          name: "Nested Mirror",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "2",
          },
          backend: {
            bundleManifest: "backend/bundle.json",
          },
        },
        null,
        2,
      ),
    );

    const provider = buildProvider();
    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.localApplicationId).toBe("sample-app");
  });

  it("preserves built-in application ids when the same root path is also configured as an additional package root", async () => {
    await writeBundle();
    const provider = buildProvider({
      additionalRootPaths: [builtInRoot],
      registryRecords: [
        {
          packageId: "github:example/override",
          rootPath: builtInRoot,
        },
      ],
    });

    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      id: buildCanonicalApplicationId(BUILT_IN_APPLICATION_PACKAGE_ID, "sample-app"),
      applicationRootPath: path.join(builtInRoot, "applications", "sample-app"),
    });
  });
});
