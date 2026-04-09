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
      }>;
    }>(
      `
        mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
          importAgentPackage(input: $input) {
            packageId
            path
            sourceKind
            source
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
