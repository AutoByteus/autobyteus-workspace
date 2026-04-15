import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILT_IN_APPLICATION_PACKAGE_ID,
  FileApplicationBundleProvider,
} from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { resolveBuiltInApplicationPackageRoot } from "../../../src/application-bundles/utils/built-in-application-package-root.js";
import {
  buildCanonicalApplicationId,
  buildCanonicalApplicationOwnedAgentId,
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

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-app-bundles-"));
    appRoot = path.join(tempRoot, "app-root");
    appDataRoot = path.join(tempRoot, "app-data");
    await fs.mkdir(appRoot, { recursive: true });
    await fs.mkdir(appDataRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  const buildProvider = (options?: {
    appRootDir?: string;
    additionalRootPaths?: string[];
    registryRecords?: Array<{ packageId: string; rootPath: string }>;
  }) =>
    new FileApplicationBundleProvider(
      {
        getAppRootDir: () => options?.appRootDir ?? appRoot,
      } as never,
      {
        getDefaultRootPath: () => appDataRoot,
        listAdditionalRootPaths: () => options?.additionalRootPaths ?? [],
      } as never,
      {
        listPackageRecords: async () => options?.registryRecords ?? [],
      } as never,
    );

  const writeBundle = async (
    packageRootPath: string = appRoot,
    options?: {
    localApplicationId?: string;
    teamMemberRef?: string;
  }): Promise<void> => {
    const localApplicationId = options?.localApplicationId ?? "sample-app";
    const teamMemberRef = options?.teamMemberRef ?? "sample-agent";
    const bundleRoot = path.join(packageRootPath, "applications", localApplicationId);

    await writeFile(
      path.join(bundleRoot, "application.json"),
      JSON.stringify(
        {
          manifestVersion: "2",
          id: localApplicationId,
          name: "Sample App",
          description: "Sample description",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "1",
          },
          runtimeTarget: { kind: "AGENT_TEAM", localId: "sample-team" },
          backend: {
            bundleManifest: "backend/bundle.json",
          },
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
            backendDefinitionContractVersion: "1",
            frontendSdkContractVersion: "1",
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
      "export default { definitionContractVersion: '1' }\n",
    );
    await fs.mkdir(path.join(bundleRoot, "backend", "migrations"), { recursive: true });
    await fs.mkdir(path.join(bundleRoot, "backend", "assets"), { recursive: true });
    await writeFile(
      path.join(bundleRoot, "agents", "sample-agent", "agent.md"),
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
      path.join(bundleRoot, "agents", "sample-agent", "agent-config.json"),
      JSON.stringify({ defaultLaunchConfig: { runtimeKind: "autobyteus" } }, null, 2),
    );
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
      path.join(bundleRoot, "agent-teams", "sample-team", "team-config.json"),
      JSON.stringify(
        {
          coordinatorMemberName: "lead",
          members: [
            {
              memberName: "lead",
              ref: teamMemberRef,
              refType: "agent",
              refScope: "application_owned",
            },
          ],
        },
        null,
        2,
      ),
    );
  };

  it("lists valid bundles from the built-in application root", async () => {
    await writeBundle();
    const provider = buildProvider();

    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      id: buildCanonicalApplicationId(BUILT_IN_APPLICATION_PACKAGE_ID, "sample-app"),
      localApplicationId: "sample-app",
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      runtimeTarget: {
        kind: "AGENT_TEAM",
        localId: "sample-team",
        definitionId: buildCanonicalApplicationOwnedTeamId(
          BUILT_IN_APPLICATION_PACKAGE_ID,
          "sample-app",
          "sample-team",
        ),
      },
      localAgentIds: ["sample-agent"],
      localTeamIds: ["sample-team"],
      backend: {
        entryModuleRelativePath: "backend/dist/entry.mjs",
        manifestRelativePath: "backend/bundle.json",
      },
    });

    const [bundle] = bundles;
    expect(provider.buildApplicationOwnedAgentSources(bundle!)).toEqual([
      expect.objectContaining({
        definitionId: buildCanonicalApplicationOwnedAgentId(
          BUILT_IN_APPLICATION_PACKAGE_ID,
          "sample-app",
          "sample-agent",
        ),
        applicationId: bundle!.id,
      }),
    ]);
  });

  it("fails package validation and refresh when an application-owned agent definition is malformed", async () => {
    await writeBundle();
    await writeFile(
      path.join(appRoot, "applications", "sample-app", "agents", "sample-agent", "agent.md"),
      "# malformed agent definition\n",
    );
    const provider = buildProvider();

    await expect(
      provider.validatePackageRoot(appRoot, BUILT_IN_APPLICATION_PACKAGE_ID),
    ).rejects.toThrow("agent.md must start with '---' frontmatter delimiter");
    await expect(provider.listBundles()).rejects.toThrow(
      "agent.md must start with '---' frontmatter delimiter",
    );
  });

  it("rejects bundles whose application-owned team references an agent outside the bundle", async () => {
    await writeBundle(appRoot, { teamMemberRef: "missing-agent" });
    const provider = buildProvider();

    await expect(provider.listBundles()).rejects.toThrow(
      "must reference an agent inside the same application bundle",
    );
  });

  it("ignores nested packaging mirrors under a discovered repo-local application root", async () => {
    await writeBundle();
    const nestedMirrorRoot = path.join(
      appRoot,
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
          manifestVersion: "2",
          id: "sample-app",
          name: "Nested Mirror",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "1",
          },
          runtimeTarget: { kind: "AGENT", localId: "sample-agent" },
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
    const builtInApplicationRoot = resolveBuiltInApplicationPackageRoot(appRoot);
    const provider = buildProvider({
      additionalRootPaths: [builtInApplicationRoot],
      registryRecords: [
        {
          packageId: "github:example/override",
          rootPath: builtInApplicationRoot,
        },
      ],
    });

    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      id: buildCanonicalApplicationId(BUILT_IN_APPLICATION_PACKAGE_ID, "sample-app"),
    });
  });

  it("discovers the built-in applications container by scanning upward from a deeper server root", async () => {
    const repoRoot = path.join(tempRoot, "repo-root");
    const serverRoot = path.join(repoRoot, "autobyteus-server-ts");
    await fs.mkdir(serverRoot, { recursive: true });
    await writeBundle(repoRoot);

    const provider = buildProvider({
      appRootDir: serverRoot,
    });

    const bundles = await provider.listBundles();

    expect(resolveBuiltInApplicationPackageRoot(serverRoot)).toBe(repoRoot);
    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      applicationRootPath: path.join(repoRoot, "applications", "sample-app"),
    });
  });
});
