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
  }) =>
    new FileApplicationBundleProvider(
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

  const writeBundle = async (
    packageRootPath: string = builtInRoot,
    options?: {
      localApplicationId?: string;
      teamMemberRef?: string;
      teamDefaultLaunchConfig?: Record<string, unknown> | null;
    },
  ): Promise<void> => {
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

  it("lists valid bundles from the managed built-in application root", async () => {
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

  it("fails package validation and refresh when an application-owned agent definition is malformed", async () => {
    await writeBundle();
    await writeFile(
      path.join(builtInRoot, "applications", "sample-app", "agents", "sample-agent", "agent.md"),
      "# malformed agent definition\n",
    );
    const provider = buildProvider();

    await expect(
      provider.validatePackageRoot(builtInRoot, BUILT_IN_APPLICATION_PACKAGE_ID),
    ).rejects.toThrow("agent.md must start with '---' frontmatter delimiter");
    await expect(provider.listBundles()).rejects.toThrow(
      "agent.md must start with '---' frontmatter delimiter",
    );
  });

  it("rejects bundles whose application-owned team references a missing local agent", async () => {
    await writeBundle(builtInRoot, { teamMemberRef: "missing-agent" });
    const provider = buildProvider();

    await expect(provider.listBundles()).rejects.toThrow(
      "must reference a local agent inside its own agents/ folder",
    );
  });

  it("rejects bundles whose application-owned team local agent is malformed", async () => {
    await writeBundle();
    await writeFile(
      path.join(
        builtInRoot,
        "applications",
        "sample-app",
        "agent-teams",
        "sample-team",
        "agents",
        "sample-agent",
        "agent.md",
      ),
      "# malformed local agent definition\n",
    );
    const provider = buildProvider();

    await expect(provider.listBundles()).rejects.toThrow(
      "agent.md must start with '---' frontmatter delimiter",
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
