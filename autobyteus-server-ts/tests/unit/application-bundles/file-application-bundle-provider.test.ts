import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { FileAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { DefinitionSourceRegistry } from "../../../src/collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../../../src/collaboration-definition-admission/services/definition-admission-service.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
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
          manifestVersion: "5",
          id: localApplicationId,
          name: "Sample App",
          description: "Sample description",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "6",
          },
          backend: {
            bundleManifest: "backend/bundle.json",
          },
          executionResourceSlots: [
            {
              slotKey: "draftingTeam",
              name: "Drafting Team",
              allowedExecutionResourceKinds: ["AGENT_TEAM"],
              supportedLaunchConfig: {
                AGENT_TEAM: {
                  runtimeKind: true,
                  llmModelIdentifier: true,
                  workspaceRootPath: true,
                },
              },
              defaultExecutionResourceRef: {
                source: "bundle",
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
            backendDefinitionContractVersion: "7",
            frontendSdkContractVersion: "6",
          },
          supportedExposures: {
            queries: true,
            commands: true,
            routes: true,
            graphql: true,
            notifications: true,
            eventHandlers: true,
            webSockets: false,
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
      "export default { definitionContractVersion: '7' }\n",
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
          defaultLaunchConfig: options?.teamDefaultLaunchConfig ?? {
            runtimeKind: "autobyteus",
            llmModelIdentifier: null,
            llmConfig: null,
          },
          members: [
            {
              memberName: "lead",
              ref: teamMemberRef,
              refScope: "team_local",
            },
          ],
          handoffs: [],
          avatarUrl: null,
        },
        null,
        2,
      ),
    );
  };


  it.each(["omitted", "null", "supplied", "agent-non-string"])("reads %s avatars via real application discovery, providers and scoped admission", async mode => {
    await writeBundle();
    const applicationRoot = path.join(builtInRoot, "applications", "sample-app");
    const teamFile = path.join(applicationRoot, "agent-teams", "sample-team", "team-config.json");
    const localAgentFile = path.join(applicationRoot, "agent-teams", "sample-team", "agents", "sample-agent", "agent-config.json");
    const directAgentFile = path.join(applicationRoot, "agents", "direct", "agent-config.json");
    const image = "https://example.test/avatar.svg";
    const agentConfig = mode === "omitted" ? {} : { avatarUrl: mode === "agent-non-string" ? 42 : mode === "null" ? null : image };
    const teamConfig = JSON.parse(await fs.readFile(teamFile, "utf8"));
    if (mode === "omitted") delete teamConfig.avatarUrl;
    else teamConfig.avatarUrl = mode === "supplied" ? image : null;
    await writeFile(teamFile, JSON.stringify(teamConfig));
    await writeFile(localAgentFile, JSON.stringify(agentConfig));
    await writeFile(directAgentFile, JSON.stringify(agentConfig));
    await writeFile(path.join(applicationRoot, "agents", "direct", "agent.md"), "---\nname: Direct\ndescription: Test\n---\n\nExact instructions.\n");
    const files = [teamFile, localAgentFile, directAgentFile];
    const before = await Promise.all(files.map(file => fs.readFile(file)));
    const bundleProvider = buildProvider();
    const snapshot = await bundleProvider.getCatalogSnapshot();
    expect(snapshot.diagnostics).toEqual([]);
    const [bundle] = await bundleProvider.listBundles();
    expect(bundle).toBeDefined();
    const agentSources = bundleProvider.buildApplicationOwnedAgentSources(bundle!);
    const teamSources = bundleProvider.buildApplicationOwnedTeamSources(bundle!);
    expect(agentSources).toHaveLength(1); expect(teamSources).toHaveLength(1);
    const appSources = {
      getApplicationOwnedAgentSourceById: async (id: string) => agentSources.find(source => source.definitionId === id) ?? null,
      getApplicationOwnedTeamSourceById: async (id: string) => teamSources.find(source => source.definitionId === id) ?? null,
    } as unknown as ApplicationBundleService;
    const config = {
      getAgentsDir: () => path.join(appDataRoot, "agents"), getAgentTeamsDir: () => path.join(appDataRoot, "agent-teams"),
      getAgentOrgsDir: () => path.join(appDataRoot, "agent-orgs"), getAdditionalAgentPackageRoots: () => [],
    } as AppConfig;
    const agents = new FileAgentDefinitionProvider({ appConfig: config, applicationBundleService: appSources });
    const teams = new FileAgentTeamDefinitionProvider({ appConfig: config, applicationBundleService: appSources });
    const orgs = new FileAgentOrgDefinitionProvider(config);
    const agentId = agentSources[0]!.definitionId, teamId = teamSources[0]!.definitionId;
    const localId = buildTeamLocalAgentDefinitionId(teamId, "sample-agent");
    const expectedAvatar = mode === "supplied" ? image : null;
    // Agent and Team as application-owned Org placements; parent itself omits avatar.
    await writeFile(path.join(config.getAgentOrgsDir(), "app-org", "org.md"), "---\nname: App Org\ndescription: Test\n---\n\nExact instructions.\n");
    await writeFile(path.join(config.getAgentOrgsDir(), "app-org", "org-config.json"), JSON.stringify({
      members: [
        { memberName: "direct", ref: agentId, refType: "agent", refScope: "application_owned" },
        { memberName: "team", ref: teamId, refType: "agent_team", refScope: "application_owned" },
      ], handoffs: [], defaultLaunchConfig: null,
    }));
    const admission = new DefinitionAdmissionService({
      registry: new DefinitionSourceRegistry({ appConfig: config, implementationPackageRoots: [], listImplementationOwnedTeamSources: async () => teamSources }),
      agents: { getFreshAgentDefinitionById: id => agents.getById(id) },
      teams: { getFreshDefinitionById: id => teams.getById(id) },
      orgs: { getDefinitionById: id => orgs.getById(id) },
    });
    for (let reload = 0; reload < 2; reload++) {
      expect(await agents.getById(agentId)).toMatchObject({ id: agentId, avatarUrl: expectedAvatar, ownershipScope: "application_owned" });
      expect(await agents.getById(localId)).toMatchObject({ id: localId, avatarUrl: expectedAvatar, ownershipScope: "team_local", ownerTeamId: teamId });
      expect(await teams.getById(teamId)).toMatchObject({ id: teamId, avatarUrl: expectedAvatar, ownershipScope: "application_owned" });
      expect((await admission.requireAvailable("agent_team", teamId)).status).toBe("available");
      expect((await admission.requireAvailable("agent_org", "app-org")).status).toBe("available");
      expect(await bundleProvider.getCatalogSnapshot()).toMatchObject({ diagnostics: [] });
    }
    for (let i = 0; i < files.length; i++) expect(await fs.readFile(files[i]!)).toEqual(before[i]);

    // Malformed present Team image still fails actual application resource admission.
    await writeFile(teamFile, JSON.stringify({ ...teamConfig, avatarUrl: 42 }));
    expect((await bundleProvider.getCatalogSnapshot()).diagnostics.length).toBeGreaterThan(0);
    await expect(teams.getById(teamId)).rejects.toThrow(/avatarUrl/);
    await expect(admission.requireAvailable("agent_team", teamId)).rejects.toThrow(/avatarUrl/);
  });

  it("treats an empty managed built-in application root as a valid steady state", async () => {
    const provider = buildProvider();

    await expect(provider.listBundles()).resolves.toEqual([]);
    await expect(provider.getCatalogSnapshot()).resolves.toMatchObject({
      applications: [],
      diagnostics: [],
    });
  });

  it("lists valid bundles from the managed built-in application root with manifest execution resource slots", async () => {
    await writeBundle();
    const provider = buildProvider();

    const bundles = await provider.listBundles();

    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({
      id: buildCanonicalApplicationId(BUILT_IN_APPLICATION_PACKAGE_ID, "sample-app"),
      localApplicationId: "sample-app",
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      executionResourceSlots: [
        {
          slotKey: "draftingTeam",
          allowedExecutionResourceKinds: ["AGENT_TEAM"],
          allowedExecutionResourceSources: ["bundle", "shared"],
          supportedLaunchConfig: {
            AGENT_TEAM: {
              runtimeKind: true,
              llmModelIdentifier: true,
              workspaceRootPath: true,
            },
          },
          defaultExecutionResourceRef: {
            source: "bundle",
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

  it("surfaces retired frontend SDK compatibility versions as diagnostics", async () => {
    const retiredFrontendSdkVersion = String(Number("1") + 1);
    await writeBundle(builtInRoot, {
      manifestOverrides: {
        ui: {
          entryHtml: "ui/index.html",
          frontendSdkContractVersion: retiredFrontendSdkVersion,
        },
      },
    });

    const snapshot = await buildProvider().getCatalogSnapshot();

    expect(snapshot.applications).toHaveLength(0);
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]?.message).toContain(
      `Unsupported ui.frontendSdkContractVersion '${retiredFrontendSdkVersion}'.`,
    );
  });

  it("surfaces retired backend bundle frontend SDK compatibility versions as diagnostics", async () => {
    const retiredFrontendSdkVersion = String(Number("1") + 1);
    await writeBundle();
    await writeFile(
      path.join(builtInRoot, "applications", "sample-app", "backend", "bundle.json"),
      JSON.stringify(
        {
          contractVersion: "1",
          entryModule: "backend/dist/entry.mjs",
          moduleFormat: "esm",
          distribution: "self-contained",
          targetRuntime: { engine: "node", semver: ">=22 <23" },
          sdkCompatibility: {
            backendDefinitionContractVersion: "7",
            frontendSdkContractVersion: retiredFrontendSdkVersion,
          },
          supportedExposures: {
            queries: true,
            commands: true,
            routes: true,
            graphql: true,
            notifications: true,
            eventHandlers: true,
            webSockets: false,
          },
        },
        null,
        2,
      ),
    );

    const snapshot = await buildProvider().getCatalogSnapshot();

    expect(snapshot.applications).toHaveLength(0);
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]?.message).toContain(
      `Unsupported frontendSdkContractVersion '${retiredFrontendSdkVersion}'.`,
    );
  });

  it("rejects an explicit v3 backend-definition compatibility fixture during discovery", async () => {
    await writeBundle();
    const backendManifestPath = path.join(
      builtInRoot,
      "applications",
      "sample-app",
      "backend",
      "bundle.json",
    );
    const manifest = JSON.parse(await fs.readFile(backendManifestPath, "utf8"));
    manifest.sdkCompatibility.backendDefinitionContractVersion = "3";
    await writeFile(backendManifestPath, JSON.stringify(manifest, null, 2));

    const snapshot = await buildProvider().getCatalogSnapshot();

    expect(snapshot.applications).toHaveLength(0);
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]?.message).toContain(
      "Unsupported backendDefinitionContractVersion '3'.",
    );
  });

  it("surfaces malformed manifests as diagnostics instead of crashing discovery", async () => {
    await writeBundle();
    await writeFile(
      path.join(builtInRoot, "applications", "broken-app", "application.json"),
      JSON.stringify(
        {
          manifestVersion: "5",
          id: "broken-app",
          name: "Broken App",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "6",
          },
          backend: {
            bundleManifest: "backend/bundle.json",
          },
          executionResourceSlots: [
            {
              slotKey: "broken slot key",
              name: "Broken Slot",
              allowedExecutionResourceKinds: ["AGENT_TEAM"],
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

  it("surfaces legacy top-level resourceSlots as diagnostics instead of silently dropping slots", async () => {
    await writeBundle(builtInRoot, {
      manifestOverrides: {
        executionResourceSlots: undefined,
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
      },
    });

    const snapshot = await buildProvider().getCatalogSnapshot();

    expect(snapshot.applications).toHaveLength(0);
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]?.message).toContain(
      "application manifest.resourceSlots is no longer supported",
    );
  });

  it.each([
    {
      name: "allowedResourceKinds",
      legacySlotFields: {
        allowedResourceKinds: ["AGENT_TEAM"],
      },
      expectedMessage: "executionResourceSlots[0].allowedResourceKinds is no longer supported",
    },
    {
      name: "allowedResourceOwners",
      legacySlotFields: {
        allowedResourceOwners: ["bundle"],
      },
      expectedMessage: "executionResourceSlots[0].allowedResourceOwners is no longer supported",
    },
    {
      name: "defaultResourceRef",
      legacySlotFields: {
        defaultResourceRef: {
          owner: "bundle",
          kind: "AGENT_TEAM",
          localId: "sample-team",
        },
      },
      expectedMessage: "executionResourceSlots[0].defaultResourceRef is no longer supported",
    },
    {
      name: "defaultExecutionResourceRef.owner",
      legacySlotFields: {
        defaultExecutionResourceRef: {
          owner: "bundle",
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "sample-team",
        },
      },
      expectedMessage: "executionResourceSlots[0].defaultExecutionResourceRef.owner is no longer supported",
    },
  ])("surfaces legacy slot field $name as diagnostics", async ({ legacySlotFields, expectedMessage }) => {
    await writeBundle(builtInRoot, {
      manifestOverrides: {
        executionResourceSlots: [
          {
            slotKey: "draftingTeam",
            name: "Drafting Team",
            allowedExecutionResourceKinds: ["AGENT_TEAM"],
            ...legacySlotFields,
          },
        ],
      },
    });

    const snapshot = await buildProvider().getCatalogSnapshot();

    expect(snapshot.applications).toHaveLength(0);
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]?.message).toContain(expectedMessage);
  });

  it("fails package validation when a discovered resource-slot default does not resolve", async () => {
    await writeBundle(builtInRoot, {
      manifestOverrides: {
        executionResourceSlots: [
          {
            slotKey: "draftingTeam",
            name: "Drafting Team",
            allowedExecutionResourceKinds: ["AGENT_TEAM"],
            defaultExecutionResourceRef: {
              source: "bundle",
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

  it.each(["missing", "null", "valid"])("uses tolerant Team resource reading for %s defaults without changing package bytes", async mode => {
    await writeBundle();
    const file = path.join(builtInRoot, "applications/sample-app/agent-teams/sample-team/team-config.json");
    const input = JSON.parse(await fs.readFile(file, "utf8"));
    input.schemaVersion = "unused metadata";
    input.members = input.members.map((member: object) => ({ ...member, refType: "agent", extra: { opaque: true } }));
    if (mode === "missing") delete input.defaultLaunchConfig;
    if (mode === "null") input.defaultLaunchConfig = null;
    if (mode === "valid") input.defaultLaunchConfig = { runtimeKind: "autobyteus", llmModelIdentifier: "model", llmConfig: { nested: [true] }, metadata: true };
    await fs.writeFile(file, JSON.stringify(input));
    const before = await fs.readFile(file);
    await expect(buildProvider().validatePackageRoot(builtInRoot, BUILT_IN_APPLICATION_PACKAGE_ID)).resolves.toBeUndefined();
    expect((await buildProvider().getCatalogSnapshot()).applications).toHaveLength(1);
    expect(await fs.readFile(file)).toEqual(before);
    input.defaultLaunchConfig = { runtimeKind: false };
    await fs.writeFile(file, JSON.stringify(input));
    await expect(buildProvider().validatePackageRoot(builtInRoot, BUILT_IN_APPLICATION_PACKAGE_ID)).rejects.toThrow();
  });

  it("rejects bundles whose application-owned team references a missing local agent", async () => {
    await writeBundle(builtInRoot, { teamMemberRef: "missing-agent" });
    const provider = buildProvider();

    await expect(provider.validatePackageRoot(builtInRoot, BUILT_IN_APPLICATION_PACKAGE_ID)).rejects.toThrow(
      "references unavailable local Agent",
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
          manifestVersion: "5",
          id: "sample-app",
          name: "Nested Mirror",
          ui: {
            entryHtml: "ui/index.html",
            frontendSdkContractVersion: "6",
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
