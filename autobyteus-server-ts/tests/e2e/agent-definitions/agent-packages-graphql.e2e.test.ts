import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { GitHubAgentPackageInstaller } from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import type { GitHubRepositorySource } from "../../../src/agent-packages/types.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { buildGitHubPackageId } from "../../../src/agent-packages/utils/package-root-summary.js";

const createAgentMd = (name: string, description: string, instructions: string): string =>
  ["---", `name: ${name}`, `description: ${description}`, "---", "", instructions].join("\n");

const createTeamMd = (name: string, description: string, instructions: string): string =>
  ["---", `name: ${name}`, `description: ${description}`, "---", "", instructions].join("\n");

const writeAgentDefinition = async (
  rootPath: string,
  agentId: string,
  payload: { name: string; description: string; instructions: string },
): Promise<void> => {
  const dirPath = path.join(rootPath, "agents", agentId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "agent.md"),
    createAgentMd(payload.name, payload.description, payload.instructions),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dirPath, "agent-config.json"),
    JSON.stringify({}, null, 2),
    "utf-8",
  );
};

const writeTeamLocalAgentDefinition = async (
  rootPath: string,
  teamId: string,
  agentId: string,
  payload: { name: string; description: string; instructions: string },
): Promise<void> => {
  const dirPath = path.join(rootPath, "agent-teams", teamId, "agents", agentId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "agent.md"),
    createAgentMd(payload.name, payload.description, payload.instructions),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dirPath, "agent-config.json"),
    JSON.stringify({}, null, 2),
    "utf-8",
  );
};

const writeTeamDefinition = async (
  rootPath: string,
  teamId: string,
  payload: {
    name: string;
    description: string;
    instructions: string;
    coordinator: string;
    memberRef: string;
    memberRefScope?: "shared" | "team_local";
  },
): Promise<void> => {
  const dirPath = path.join(rootPath, "agent-teams", teamId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "team.md"),
    createTeamMd(payload.name, payload.description, payload.instructions),
    "utf-8",
  );
  await fs.writeFile(
    path.join(dirPath, "team-config.json"),
    JSON.stringify(
      {
        coordinatorMemberName: payload.coordinator,
        members: [
          {
            memberName: payload.coordinator,
            ref: payload.memberRef,
            refType: "agent",
            refScope: payload.memberRefScope ?? "shared",
          },
        ],
      },
      null,
      2,
    ),
    "utf-8",
  );
};

const parseAdditionalRoots = (): string[] => {
  const raw = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS ?? "";
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

const createTestRootSettingsStore = (defaultRoot: string): AgentPackageRootSettingsStore =>
  new AgentPackageRootSettingsStore(
    {
      getAppDataDir: () => defaultRoot,
      getAdditionalAgentPackageRoots: () => parseAdditionalRoots(),
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

const createTestRegistryStore = (registryRoot: string): AgentPackageRegistryStore =>
  new AgentPackageRegistryStore({
    getAppDataDir: () => registryRoot,
  });

const createRevisionBackedGitHubInstaller = (input: {
  dataRoot: string;
  owner: string;
  repo: string;
  getRevision: () => string;
  fixtureRootsByRevision: Record<string, string>;
  defaultBranch?: string;
}): GitHubAgentPackageInstaller => {
  const defaultBranch = input.defaultBranch ?? "main";

  return new GitHubAgentPackageInstaller({
    config: {
      getAppDataDir: () => input.dataRoot,
      getDownloadDir: () => path.join(input.dataRoot, "downloads"),
    },
    fetchImpl: async (resource) => {
      const requestUrl = typeof resource === "string"
        ? resource
        : resource instanceof URL
          ? resource.toString()
          : resource.url;

      if (requestUrl.includes("/branches/")) {
        return new Response(
          JSON.stringify({
            commit: { sha: input.getRevision() },
          }),
          {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          default_branch: defaultBranch,
          html_url: `https://github.com/${input.owner}/${input.repo}`,
          private: false,
          name: input.repo,
          owner: { login: input.owner },
        }),
        {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
        },
      );
    },
    downloadFileFromUrlImpl: async (archiveUrl, downloadDir) => {
      await fs.mkdir(downloadDir, { recursive: true });
      const revision = decodeURIComponent(
        archiveUrl.split("/").filter(Boolean).at(-1) ?? input.getRevision(),
      );
      const archivePath = path.join(downloadDir, `${revision}.tar.gz`);
      await fs.writeFile(archivePath, revision, "utf-8");
      return archivePath;
    },
    extractArchiveImpl: async (archivePath, outputDir) => {
      const revision = (await fs.readFile(archivePath, "utf-8")).trim();
      const fixtureRoot = input.fixtureRootsByRevision[revision];
      if (!fixtureRoot) {
        throw new Error(`No test fixture package exists for revision ${revision}.`);
      }

      await fs.mkdir(outputDir, { recursive: true });
      await fs.cp(fixtureRoot, path.join(outputDir, `${input.repo}-${revision}`), {
        recursive: true,
      });
    },
  });
};

describe("Agent packages GraphQL e2e", () => {
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

    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    AgentPackageService.resetInstance();
    await AgentDefinitionService.getInstance().refreshCache();
    await AgentTeamDefinitionService.getInstance().refreshCache();
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
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

  const runGraphql = async (query: string, variables?: Record<string, unknown>) =>
    graphql({
      schema,
      source: query,
      variableValues: variables,
    });

  it("imports and removes a linked local package while preserving runtime discovery behavior", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-local-${unique}-`));

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(externalRoot);

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
    });

    const duplicateAgentId = `duplicate-agent-${unique}`;
    const duplicateTeamId = `duplicate-team-${unique}`;
    const externalAgentId = `external-agent-${unique}`;
    const externalTeamId = `external-team-${unique}`;
    const defaultAgentId = `default-agent-${unique}`;
    const defaultTeamId = `default-team-${unique}`;

    await writeAgentDefinition(defaultRoot, defaultAgentId, {
      name: "Default Agent",
      description: "Default-only agent",
      instructions: "default instructions",
    });
    await writeAgentDefinition(defaultRoot, duplicateAgentId, {
      name: "Default Duplicate Agent",
      description: "Default precedence agent",
      instructions: "default duplicate instructions",
    });
    await writeTeamDefinition(defaultRoot, defaultTeamId, {
      name: "Default Team",
      description: "Default-only team",
      instructions: "default team instructions",
      coordinator: "coordinator",
      memberRef: defaultAgentId,
    });
    await writeTeamDefinition(defaultRoot, duplicateTeamId, {
      name: "Default Duplicate Team",
      description: "Default precedence team",
      instructions: "default duplicate team instructions",
      coordinator: "coordinator",
      memberRef: duplicateAgentId,
    });

    cleanupPaths.add(path.join(defaultRoot, "agents", defaultAgentId));
    cleanupPaths.add(path.join(defaultRoot, "agents", duplicateAgentId));
    cleanupPaths.add(path.join(defaultRoot, "agent-teams", defaultTeamId));
    cleanupPaths.add(path.join(defaultRoot, "agent-teams", duplicateTeamId));

    await writeAgentDefinition(externalRoot, externalAgentId, {
      name: "External Agent",
      description: "External-only agent",
      instructions: "external instructions",
    });
    await writeAgentDefinition(externalRoot, duplicateAgentId, {
      name: "External Duplicate Agent",
      description: "External duplicate agent",
      instructions: "external duplicate instructions",
    });
    await writeTeamDefinition(externalRoot, externalTeamId, {
      name: "External Team",
      description: "External-only team",
      instructions: "external team instructions",
      coordinator: "coordinator",
      memberRef: externalAgentId,
    });
    await writeTeamLocalAgentDefinition(externalRoot, externalTeamId, `local-agent-${unique}`, {
      name: "External Local Agent",
      description: "Team-local agent",
      instructions: "team-local instructions",
    });
    await writeTeamDefinition(externalRoot, duplicateTeamId, {
      name: "External Duplicate Team",
      description: "External duplicate team",
      instructions: "external duplicate team instructions",
      coordinator: "coordinator",
      memberRef: duplicateAgentId,
    });

    const importResult = await execGraphql<{
      importAgentPackage: Array<{
        packageId: string;
        path: string;
        sourceKind: string;
        sharedAgentCount: number;
        teamLocalAgentCount: number;
        agentTeamCount: number;
        isDefault: boolean;
        isRemovable: boolean;
      }>;
    }>(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
            path
            sourceKind
            sharedAgentCount
            teamLocalAgentCount
            agentTeamCount
            isDefault
            isRemovable
          }
        }
      `,
      {
        input: {
          sourceKind: "LOCAL_PATH",
          source: externalRoot,
        },
      },
    );

    const linkedPackage = importResult.importAgentPackage.find(
      (entry) => entry.path === externalRoot,
    );
    expect(linkedPackage).toBeDefined();
    expect(linkedPackage?.sourceKind).toBe("LOCAL_PATH");
    expect(linkedPackage?.sharedAgentCount).toBe(2);
    expect(linkedPackage?.teamLocalAgentCount).toBe(1);
    expect(linkedPackage?.agentTeamCount).toBe(2);
    expect(linkedPackage?.isDefault).toBe(false);
    expect(linkedPackage?.isRemovable).toBe(true);
    expect(
      importResult.importAgentPackage.some(
        (entry) => entry.isDefault && entry.isRemovable === false,
      ),
    ).toBe(true);

    const listResult = await execGraphql<{
      agents: Array<{ id: string; name: string }>;
      teams: Array<{ id: string; name: string }>;
      duplicateAgent: { id: string; name: string } | null;
      duplicateTeam: { id: string; name: string } | null;
    }>(`
      query PackageReads {
        agents: agentDefinitions { id name }
        teams: agentTeamDefinitions { id name }
        duplicateAgent: agentDefinition(id: "${duplicateAgentId}") { id name }
        duplicateTeam: agentTeamDefinition(id: "${duplicateTeamId}") { id name }
      }
    `);

    expect(listResult.agents.some((entry) => entry.id === externalAgentId)).toBe(true);
    expect(listResult.teams.some((entry) => entry.id === externalTeamId)).toBe(true);
    expect(listResult.duplicateAgent?.name).toBe("Default Duplicate Agent");
    expect(listResult.duplicateTeam?.name).toBe("Default Duplicate Team");

    const copiedAgentPath = path.join(defaultRoot, "agents", externalAgentId);
    const copiedTeamPath = path.join(defaultRoot, "agent-teams", externalTeamId);
    await expect(fs.access(copiedAgentPath)).rejects.toBeDefined();
    await expect(fs.access(copiedTeamPath)).rejects.toBeDefined();

    const removeResult = await execGraphql<{
      removeAgentPackage: Array<{ path: string }>;
    }>(
      `
        mutation RemoveAgentPackage($packageId: String!) {
          removeAgentPackage(packageId: $packageId) {
            path
          }
        }
      `,
      { packageId: linkedPackage?.packageId },
    );

    expect(
      removeResult.removeAgentPackage.some((entry) => entry.path === externalRoot),
    ).toBe(false);

    const postRemoveList = await execGraphql<{
      agents: Array<{ id: string }>;
      teams: Array<{ id: string }>;
    }>(`
      query PostRemoveReads {
        agents: agentDefinitions { id }
        teams: agentTeamDefinitions { id }
      }
    `);

    expect(postRemoveList.agents.some((entry) => entry.id === externalAgentId)).toBe(false);
    expect(postRemoveList.teams.some((entry) => entry.id === externalTeamId)).toBe(false);
    await expect(
      fs.access(path.join(externalRoot, "agents", externalAgentId, "agent.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(externalRoot, "agent-teams", externalTeamId, "team.md")),
    ).resolves.toBeUndefined();
  });

  it("reloads a linked local package through GraphQL and refreshes package-derived reads", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-reload-${unique}-`));
    const markerPath = path.join(externalRoot, "local-marker.txt");

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(externalRoot);

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
    });

    const firstAgentId = `reload-agent-first-${unique}`;
    const secondAgentId = `reload-agent-second-${unique}`;
    await writeAgentDefinition(externalRoot, firstAgentId, {
      name: "Reload First Agent",
      description: "Visible before reload",
      instructions: "first reload instructions",
    });
    await fs.writeFile(markerPath, "user-owned local file", "utf-8");

    const importResult = await execGraphql<{
      importAgentPackage: Array<{
        packageId: string;
        path: string;
        sharedAgentCount: number;
        updateInfo: {
          status: string;
          canReload: boolean;
          canUpdate: boolean;
        };
      }>;
    }>(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
            path
            sharedAgentCount
            updateInfo {
              status
              canReload
              canUpdate
            }
          }
        }
      `,
      {
        input: {
          sourceKind: "LOCAL_PATH",
          source: externalRoot,
        },
      },
    );

    const linkedPackage = importResult.importAgentPackage.find(
      (entry) => entry.path === externalRoot,
    );
    expect(linkedPackage?.sharedAgentCount).toBe(1);
    expect(linkedPackage?.updateInfo).toMatchObject({
      status: "RELOAD_AVAILABLE",
      canReload: true,
      canUpdate: false,
    });

    await writeAgentDefinition(externalRoot, secondAgentId, {
      name: "Reload Second Agent",
      description: "Visible after reload",
      instructions: "second reload instructions",
    });

    const reloadResult = await execGraphql<{
      reloadAgentPackage: Array<{
        packageId: string;
        path: string;
        sharedAgentCount: number;
        updateInfo: {
          status: string;
          canReload: boolean;
          canUpdate: boolean;
        };
      }>;
    }>(
      `
        mutation ReloadAgentPackage($packageId: String!) {
          reloadAgentPackage(packageId: $packageId) {
            packageId
            path
            sharedAgentCount
            updateInfo {
              status
              canReload
              canUpdate
            }
          }
        }
      `,
      { packageId: linkedPackage?.packageId },
    );

    const reloadedPackage = reloadResult.reloadAgentPackage.find(
      (entry) => entry.path === externalRoot,
    );
    expect(reloadedPackage?.sharedAgentCount).toBe(2);
    expect(reloadedPackage?.updateInfo).toMatchObject({
      status: "RELOAD_AVAILABLE",
      canReload: true,
      canUpdate: false,
    });

    const refreshedReads = await execGraphql<{
      agents: Array<{ id: string; name: string }>;
    }>(`
      query ReloadedAgentReads {
        agents: agentDefinitions { id name }
      }
    `);

    expect(refreshedReads.agents.some((entry) => entry.id === firstAgentId)).toBe(true);
    expect(refreshedReads.agents.some((entry) => entry.id === secondAgentId)).toBe(true);
    await expect(fs.readFile(markerPath, "utf-8")).resolves.toBe("user-owned local file");
    await expect(
      fs.access(path.join(defaultRoot, "agents", secondAgentId, "agent.md")),
    ).rejects.toBeDefined();
  });

  it("imports and removes a managed GitHub package through the package-oriented GraphQL contract", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const managedBase = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-managed-${unique}-`));

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(managedBase);

    class MockGitHubInstaller extends GitHubAgentPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(managedBase, "agent-packages", "github", installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await writeAgentDefinition(installDir, `github-agent-${unique}`, {
          name: "GitHub Agent",
          description: "Imported from GitHub",
          instructions: "github instructions",
        });
        await writeTeamDefinition(installDir, `github-team-${unique}`, {
          name: "GitHub Team",
          description: "Imported team",
          instructions: "github team instructions",
          coordinator: "coordinator",
          memberRef: `github-agent-${unique}`,
        });

        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
      installer: new MockGitHubInstaller(),
    });

    const sourceUrl = `https://github.com/AutoByteus/mock-agent-package-${unique}`;

    const importResult = await execGraphql<{
      importAgentPackage: Array<{
        packageId: string;
        path: string;
        sourceKind: string;
        source: string;
        updateInfo: {
          status: string;
          canCheck: boolean;
          canUpdate: boolean;
          canReload: boolean;
          message: string;
        };
      }>;
    }>(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
            path
            sourceKind
            source
            updateInfo {
              status
              canCheck
              canUpdate
              canReload
              message
            }
          }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: sourceUrl,
        },
      },
    );

    const managedPackage = importResult.importAgentPackage.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );

    expect(managedPackage).toBeDefined();
    expect(managedPackage?.source).toBe(sourceUrl);
    expect(managedPackage?.path).toContain(
      path.join("agent-packages", "github", `autobyteus__mock-agent-package-${unique}`),
    );
    expect(managedPackage?.updateInfo).toMatchObject({
      status: "UNKNOWN",
      canCheck: true,
      canUpdate: true,
      canReload: false,
    });
    expect(managedPackage?.updateInfo.message).toContain("Update to latest");

    const duplicateImport = await runGraphql(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
          }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: sourceUrl,
        },
      },
    );
    expect(duplicateImport.errors?.length ?? 0).toBeGreaterThan(0);
    expect(duplicateImport.errors?.[0]?.message).toContain("already exists");
    expect(duplicateImport.errors?.[0]?.message).toContain(
      "Use the existing package row to check for updates or update to latest",
    );

    await expect(
      fs.access(path.join(managedPackage?.path ?? "", "agents", `github-agent-${unique}`, "agent.md")),
    ).resolves.toBeUndefined();

    await execGraphql<{
      removeAgentPackage: Array<{ packageId: string }>;
    }>(
      `
        mutation RemoveAgentPackage($packageId: String!) {
          removeAgentPackage(packageId: $packageId) {
            packageId
          }
        }
      `,
      { packageId: managedPackage?.packageId },
    );

    await expect(fs.access(managedPackage?.path ?? "")).rejects.toBeDefined();
  });

  it("checks and updates a managed GitHub package through GraphQL with staged directory replacement", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-github-data-${unique}-`));
    const oldFixtureRoot = path.join(dataRoot, "fixtures", "old");
    const newFixtureRoot = path.join(dataRoot, "fixtures", "new");

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(dataRoot);

    const owner = "AutoByteus";
    const repo = `mock-agent-package-update-${unique}`;
    const oldRevision = "old-sha";
    const newRevision = "new-sha";
    const oldAgentId = `github-update-old-agent-${unique}`;
    const newAgentId = `github-update-new-agent-${unique}`;
    const extraNewAgentId = `github-update-extra-agent-${unique}`;
    const newTeamId = `github-update-new-team-${unique}`;
    let remoteRevision = oldRevision;

    await writeAgentDefinition(oldFixtureRoot, oldAgentId, {
      name: "Old GitHub Agent",
      description: "Old managed package agent",
      instructions: "old github instructions",
    });
    await writeAgentDefinition(newFixtureRoot, newAgentId, {
      name: "New GitHub Agent",
      description: "New managed package agent",
      instructions: "new github instructions",
    });
    await writeAgentDefinition(newFixtureRoot, extraNewAgentId, {
      name: "Extra New GitHub Agent",
      description: "New managed package extra agent",
      instructions: "extra new github instructions",
    });
    await writeTeamDefinition(newFixtureRoot, newTeamId, {
      name: "New GitHub Team",
      description: "New managed package team",
      instructions: "new github team instructions",
      coordinator: "coordinator",
      memberRef: newAgentId,
    });

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
      installer: createRevisionBackedGitHubInstaller({
        dataRoot,
        owner,
        repo,
        getRevision: () => remoteRevision,
        fixtureRootsByRevision: {
          [oldRevision]: oldFixtureRoot,
          [newRevision]: newFixtureRoot,
        },
      }),
    });

    const sourceUrl = `https://github.com/${owner}/${repo}`;
    const importResult = await execGraphql<{
      importAgentPackage: Array<{
        packageId: string;
        path: string;
        sourceKind: string;
        sharedAgentCount: number;
        agentTeamCount: number;
        updateInfo: {
          status: string;
          canCheck: boolean;
          canUpdate: boolean;
          installedRevision: string | null;
          latestRevision: string | null;
        };
      }>;
    }>(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
            path
            sourceKind
            sharedAgentCount
            agentTeamCount
            updateInfo {
              status
              canCheck
              canUpdate
              installedRevision
              latestRevision
            }
          }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: sourceUrl,
        },
      },
    );

    const importedPackage = importResult.importAgentPackage.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );
    expect(importedPackage?.sharedAgentCount).toBe(1);
    expect(importedPackage?.updateInfo).toMatchObject({
      status: "UP_TO_DATE",
      canCheck: true,
      canUpdate: false,
      installedRevision: oldRevision,
      latestRevision: oldRevision,
    });

    remoteRevision = newRevision;
    const checkResult = await execGraphql<{
      checkAgentPackageUpdates: Array<{
        packageId: string;
        updateInfo: {
          status: string;
          canUpdate: boolean;
          installedRevision: string | null;
          latestRevision: string | null;
        };
      }>;
    }>(
      `
        mutation CheckAgentPackageUpdates($packageIds: [String!]) {
          checkAgentPackageUpdates(packageIds: $packageIds) {
            packageId
            updateInfo {
              status
              canUpdate
              installedRevision
              latestRevision
            }
          }
        }
      `,
      { packageIds: [importedPackage?.packageId] },
    );

    const checkedPackage = checkResult.checkAgentPackageUpdates.find(
      (entry) => entry.packageId === importedPackage?.packageId,
    );
    expect(checkedPackage?.updateInfo).toMatchObject({
      status: "UPDATE_AVAILABLE",
      canUpdate: true,
      installedRevision: oldRevision,
      latestRevision: newRevision,
    });

    const updateResult = await execGraphql<{
      updateAgentPackage: Array<{
        packageId: string;
        path: string;
        sharedAgentCount: number;
        agentTeamCount: number;
        updateInfo: {
          status: string;
          canUpdate: boolean;
          installedRevision: string | null;
          latestRevision: string | null;
        };
      }>;
    }>(
      `
        mutation UpdateAgentPackage($packageId: String!) {
          updateAgentPackage(packageId: $packageId) {
            packageId
            path
            sharedAgentCount
            agentTeamCount
            updateInfo {
              status
              canUpdate
              installedRevision
              latestRevision
            }
          }
        }
      `,
      { packageId: importedPackage?.packageId },
    );

    const updatedPackage = updateResult.updateAgentPackage.find(
      (entry) => entry.packageId === importedPackage?.packageId,
    );
    expect(updatedPackage?.sharedAgentCount).toBe(2);
    expect(updatedPackage?.agentTeamCount).toBe(1);
    expect(updatedPackage?.updateInfo).toMatchObject({
      status: "UP_TO_DATE",
      canUpdate: false,
      installedRevision: newRevision,
      latestRevision: newRevision,
    });
    await expect(
      fs.access(path.join(updatedPackage?.path ?? "", "agents", newAgentId, "agent.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(updatedPackage?.path ?? "", "agents", oldAgentId, "agent.md")),
    ).rejects.toBeDefined();

    const refreshedReads = await execGraphql<{
      agents: Array<{ id: string; name: string }>;
      teams: Array<{ id: string; name: string }>;
    }>(`
      query UpdatedGitHubPackageReads {
        agents: agentDefinitions { id name }
        teams: agentTeamDefinitions { id name }
      }
    `);

    expect(refreshedReads.agents.some((entry) => entry.id === newAgentId)).toBe(true);
    expect(refreshedReads.agents.some((entry) => entry.id === extraNewAgentId)).toBe(true);
    expect(refreshedReads.agents.some((entry) => entry.id === oldAgentId)).toBe(false);
    expect(refreshedReads.teams.some((entry) => entry.id === newTeamId)).toBe(true);
  });

  it("allows legacy managed GitHub records with unknown revision to update to latest through GraphQL", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-legacy-data-${unique}-`));
    const owner = "AutoByteus";
    const repo = `legacy-agent-package-${unique}`;
    const normalizedSource = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
    const sourceUrl = `https://github.com/${owner}/${repo}`;
    const latestRevision = "latest-legacy-sha";
    const legacyInstallDir = path.join(dataRoot, "agent-packages", "github", "autobyteus__legacy-package");
    const latestFixtureRoot = path.join(dataRoot, "fixtures", "latest");
    const legacyAgentId = `legacy-installed-agent-${unique}`;
    const latestAgentId = `legacy-latest-agent-${unique}`;

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(dataRoot);

    await writeAgentDefinition(legacyInstallDir, legacyAgentId, {
      name: "Legacy Installed Agent",
      description: "Installed before revision metadata existed",
      instructions: "legacy installed instructions",
    });
    await writeAgentDefinition(latestFixtureRoot, latestAgentId, {
      name: "Latest Legacy Agent",
      description: "Latest replacement for legacy package",
      instructions: "latest legacy instructions",
    });

    const registryStore = createTestRegistryStore(registryRoot);
    await fs.mkdir(path.dirname(registryStore.getRegistryPath()), { recursive: true });
    await fs.writeFile(
      registryStore.getRegistryPath(),
      JSON.stringify(
        [
          {
            packageId: buildGitHubPackageId(normalizedSource),
            rootPath: legacyInstallDir,
            sourceKind: "GITHUB_REPOSITORY",
            source: sourceUrl,
            normalizedSource,
            managedInstallPath: legacyInstallDir,
            createdAt: "2026-05-21T00:00:00.000Z",
            updatedAt: "2026-05-21T00:00:00.000Z",
          },
        ],
        null,
        2,
      ),
      "utf-8",
    );
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = legacyInstallDir;

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore,
      installer: createRevisionBackedGitHubInstaller({
        dataRoot,
        owner,
        repo,
        getRevision: () => latestRevision,
        fixtureRootsByRevision: {
          [latestRevision]: latestFixtureRoot,
        },
      }),
    });

    const listResult = await execGraphql<{
      agentPackages: Array<{
        packageId: string;
        path: string;
        sourceKind: string;
        updateInfo: {
          status: string;
          canUpdate: boolean;
          installedRevision: string | null;
          latestRevision: string | null;
          message: string;
        };
      }>;
    }>(`
      query AgentPackages {
        agentPackages {
          packageId
          path
          sourceKind
          updateInfo {
            status
            canUpdate
            installedRevision
            latestRevision
            message
          }
        }
      }
    `);

    const legacyPackage = listResult.agentPackages.find(
      (entry) => entry.packageId === buildGitHubPackageId(normalizedSource),
    );
    expect(legacyPackage?.updateInfo).toMatchObject({
      status: "UNKNOWN",
      canUpdate: true,
      installedRevision: null,
      latestRevision: null,
    });
    expect(legacyPackage?.updateInfo.message).toContain("Update to latest");

    const updateResult = await execGraphql<{
      updateAgentPackage: Array<{
        packageId: string;
        sharedAgentCount: number;
        updateInfo: {
          status: string;
          canUpdate: boolean;
          installedRevision: string | null;
          latestRevision: string | null;
        };
      }>;
    }>(
      `
        mutation UpdateLegacyPackage($packageId: String!) {
          updateAgentPackage(packageId: $packageId) {
            packageId
            sharedAgentCount
            updateInfo {
              status
              canUpdate
              installedRevision
              latestRevision
            }
          }
        }
      `,
      { packageId: legacyPackage?.packageId },
    );

    const updatedPackage = updateResult.updateAgentPackage.find(
      (entry) => entry.packageId === legacyPackage?.packageId,
    );
    expect(updatedPackage?.sharedAgentCount).toBe(1);
    expect(updatedPackage?.updateInfo).toMatchObject({
      status: "UP_TO_DATE",
      canUpdate: false,
      installedRevision: latestRevision,
      latestRevision,
    });
    await expect(
      fs.access(path.join(legacyInstallDir, "agents", latestAgentId, "agent.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(legacyInstallDir, "agents", legacyAgentId, "agent.md")),
    ).rejects.toBeDefined();
  });

  it("rolls back managed GitHub directory replacement and persists failed status on GraphQL update failure", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-rollback-data-${unique}-`));
    const oldFixtureRoot = path.join(dataRoot, "fixtures", "old");
    const newFixtureRoot = path.join(dataRoot, "fixtures", "new");
    const owner = "AutoByteus";
    const repo = `rollback-agent-package-${unique}`;
    const oldRevision = "rollback-old-sha";
    const newRevision = "rollback-new-sha";
    const oldAgentId = `rollback-old-agent-${unique}`;
    const newAgentId = `rollback-new-agent-${unique}`;
    let remoteRevision = oldRevision;
    let failRefresh = false;

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(dataRoot);

    await writeAgentDefinition(oldFixtureRoot, oldAgentId, {
      name: "Rollback Old Agent",
      description: "Previous installed package",
      instructions: "old rollback instructions",
    });
    await writeAgentDefinition(newFixtureRoot, newAgentId, {
      name: "Rollback New Agent",
      description: "Replacement package that should roll back",
      instructions: "new rollback instructions",
    });

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
      installer: createRevisionBackedGitHubInstaller({
        dataRoot,
        owner,
        repo,
        getRevision: () => remoteRevision,
        fixtureRootsByRevision: {
          [oldRevision]: oldFixtureRoot,
          [newRevision]: newFixtureRoot,
        },
      }),
      refreshAgentDefinitions: async () => {
        if (failRefresh) {
          throw new Error("cache refresh failed");
        }
        await AgentDefinitionService.getInstance().refreshCache();
      },
      refreshAgentTeams: async () => {
        await AgentTeamDefinitionService.getInstance().refreshCache();
      },
    });

    const sourceUrl = `https://github.com/${owner}/${repo}`;
    const importResult = await execGraphql<{
      importAgentPackage: Array<{
        packageId: string;
        path: string;
        sourceKind: string;
      }>;
    }>(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
            path
            sourceKind
          }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: sourceUrl,
        },
      },
    );
    const managedPackage = importResult.importAgentPackage.find(
      (entry) => entry.sourceKind === "GITHUB_REPOSITORY",
    );

    remoteRevision = newRevision;
    await execGraphql(
      `
        mutation CheckRollbackPackage($packageIds: [String!]) {
          checkAgentPackageUpdates(packageIds: $packageIds) {
            packageId
          }
        }
      `,
      { packageIds: [managedPackage?.packageId] },
    );

    failRefresh = true;
    const updateFailure = await runGraphql(
      `
        mutation UpdateRollbackPackage($packageId: String!) {
          updateAgentPackage(packageId: $packageId) {
            packageId
          }
        }
      `,
      { packageId: managedPackage?.packageId },
    );
    expect(updateFailure.errors?.[0]?.message).toContain("cache refresh failed");

    const postFailureList = await execGraphql<{
      agentPackages: Array<{
        packageId: string;
        updateInfo: {
          status: string;
          installedRevision: string | null;
          latestRevision: string | null;
          lastError: string | null;
        };
      }>;
    }>(`
      query PostFailurePackages {
        agentPackages {
          packageId
          updateInfo {
            status
            installedRevision
            latestRevision
            lastError
          }
        }
      }
    `);
    const failedPackage = postFailureList.agentPackages.find(
      (entry) => entry.packageId === managedPackage?.packageId,
    );
    expect(failedPackage?.updateInfo).toMatchObject({
      status: "UPDATE_FAILED",
      installedRevision: oldRevision,
      latestRevision: newRevision,
      lastError: "cache refresh failed",
    });
    await expect(
      fs.access(path.join(managedPackage?.path ?? "", "agents", oldAgentId, "agent.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(managedPackage?.path ?? "", "agents", newAgentId, "agent.md")),
    ).rejects.toBeDefined();
  });

  it("returns local-clone guidance when direct private GitHub import metadata is unavailable", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-private-data-${unique}-`));

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(dataRoot);

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
      installer: new GitHubAgentPackageInstaller({
        config: {
          getAppDataDir: () => dataRoot,
          getDownloadDir: () => path.join(dataRoot, "downloads"),
        },
        fetchImpl: async () =>
          new Response(JSON.stringify({ message: "Not Found" }), {
            status: 404,
            statusText: "Not Found",
            headers: { "Content-Type": "application/json" },
          }),
      }),
    });

    const privateImport = await runGraphql(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) { packageId }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: `https://github.com/AutoByteus/private-agent-package-${unique}`,
        },
      },
    );

    expect(privateImport.errors?.[0]?.message).toContain("not found or not public");
    expect(privateImport.errors?.[0]?.message).toContain(
      "For private repositories, clone locally and import the local path",
    );
  });

  it("rejects invalid import input and invalid managed package shape", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const registryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-registry-${unique}-`));
    const emptyRoot = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-empty-${unique}-`));
    const invalidManagedBase = await fs.mkdtemp(path.join(os.tmpdir(), `agent-packages-invalid-${unique}-`));

    cleanupPaths.add(registryRoot);
    cleanupPaths.add(emptyRoot);
    cleanupPaths.add(invalidManagedBase);

    class InvalidGitHubInstaller extends GitHubAgentPackageInstaller {
      override getManagedInstallDir(installKey: string): string {
        return path.join(invalidManagedBase, "agent-packages", "github", installKey);
      }

      override async installPackage(source: GitHubRepositorySource): Promise<{
        rootPath: string;
        managedInstallPath: string;
        canonicalSourceUrl: string;
      }> {
        const installDir = this.getManagedInstallDir(source.installKey);
        await fs.mkdir(installDir, { recursive: true });
        await fs.writeFile(path.join(installDir, "README.md"), "not a package", "utf-8");
        return {
          rootPath: installDir,
          managedInstallPath: installDir,
          canonicalSourceUrl: source.canonicalUrl,
        };
      }
    }

    AgentPackageService.getInstance({
      rootSettingsStore: createTestRootSettingsStore(defaultRoot),
      registryStore: createTestRegistryStore(registryRoot),
      installer: new InvalidGitHubInstaller(),
    });

    const invalidLocalImport = await runGraphql(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) { packageId }
        }
      `,
      {
        input: {
          sourceKind: "LOCAL_PATH",
          source: emptyRoot,
        },
      },
    );
    expect(invalidLocalImport.errors?.length ?? 0).toBeGreaterThan(0);
    expect(invalidLocalImport.errors?.[0]?.message).toContain("agents");

    const invalidGitHubUrl = await runGraphql(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) { packageId }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: "https://gitlab.com/example/agents",
        },
      },
    );
    expect(invalidGitHubUrl.errors?.length ?? 0).toBeGreaterThan(0);
    expect(invalidGitHubUrl.errors?.[0]?.message).toContain("github.com");

    const invalidManagedPackage = await runGraphql(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) { packageId }
        }
      `,
      {
        input: {
          sourceKind: "GITHUB_REPOSITORY",
          source: `https://github.com/AutoByteus/invalid-package-${unique}`,
        },
      },
    );
    expect(invalidManagedPackage.errors?.length ?? 0).toBeGreaterThan(0);
    expect(invalidManagedPackage.errors?.[0]?.message).toContain("agents");
  });
});
