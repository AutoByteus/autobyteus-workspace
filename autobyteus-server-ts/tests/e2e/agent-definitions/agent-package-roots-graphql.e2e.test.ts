import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
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
  await fs.writeFile(path.join(dirPath, "agent-config.json"), JSON.stringify({}, null, 2), "utf-8");
};

const writeBundledSkill = async (
  rootPath: string,
  agentId: string,
  description = "Bundled skill",
): Promise<void> => {
  const dirPath = path.join(rootPath, "agents", agentId);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(
    path.join(dirPath, "SKILL.md"),
    `---\nname: ${agentId}\ndescription: ${description}\n---\n\nBundled skill content\n`,
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
  await fs.writeFile(path.join(dirPath, "agent-config.json"), JSON.stringify({}, null, 2), "utf-8");
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

describe("Agent package root GraphQL e2e", () => {
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

    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = "";
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

  it("adds and removes agent package roots and aggregates agent/team reads with precedence", async () => {
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const defaultRoot = appConfigProvider.config.getAppDataDir();
    const externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), `definition-source-${unique}-`));
    cleanupPaths.add(externalRoot);

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
    await writeBundledSkill(externalRoot, externalAgentId);
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

    const addResult = await execGraphql<{
      addAgentPackageRoot: Array<{
        path: string;
        sharedAgentCount: number;
        teamLocalAgentCount: number;
        agentTeamCount: number;
        isDefault: boolean;
      }>;
    }>(
      `
        mutation AddAgentPackageRoot($path: String!) {
          addAgentPackageRoot(path: $path) {
            path
            sharedAgentCount
            teamLocalAgentCount
            agentTeamCount
            isDefault
          }
        }
      `,
      { path: externalRoot },
    );

    const addedExternal = addResult.addAgentPackageRoot.find((entry) => entry.path === externalRoot);
    expect(addedExternal).toBeDefined();
    expect(addedExternal?.sharedAgentCount).toBe(2);
    expect(addedExternal?.teamLocalAgentCount).toBe(1);
    expect(addedExternal?.agentTeamCount).toBe(2);
    expect(addedExternal?.isDefault).toBe(false);

    const copiedAgentPath = path.join(defaultRoot, "agents", externalAgentId);
    const copiedTeamPath = path.join(defaultRoot, "agent-teams", externalTeamId);
    await expect(fs.access(copiedAgentPath)).rejects.toBeDefined();
    await expect(fs.access(copiedTeamPath)).rejects.toBeDefined();

    const listResult = await execGraphql<{
      agents: Array<{ id: string; name: string }>;
      teams: Array<{ id: string; name: string }>;
      duplicateAgent: { id: string; name: string } | null;
      duplicateTeam: { id: string; name: string } | null;
    }>(`
      query PackageRootReads {
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

    const updateImportedResult = await execGraphql<{
      updateAgentDefinition: { id: string; description: string; skillNames: string[] };
      updateAgentTeamDefinition: { id: string; description: string };
    }>(
      `
        mutation UpdateImportedDefinitions(
          $agentInput: UpdateAgentDefinitionInput!
          $teamInput: UpdateAgentTeamDefinitionInput!
        ) {
          updateAgentDefinition(input: $agentInput) {
            id
            description
            skillNames
          }
          updateAgentTeamDefinition(input: $teamInput) {
            id
            description
          }
        }
      `,
      {
        agentInput: {
          id: externalAgentId,
          description: "External agent updated in place",
          toolNames: ["tool-a"],
        },
        teamInput: {
          id: externalTeamId,
          description: "External team updated in place",
        },
      },
    );

    expect(updateImportedResult.updateAgentDefinition.description).toBe(
      "External agent updated in place",
    );
    expect(updateImportedResult.updateAgentDefinition.skillNames).toEqual([]);
    expect(updateImportedResult.updateAgentTeamDefinition.description).toBe(
      "External team updated in place",
    );

    const externalAgentMd = await fs.readFile(
      path.join(externalRoot, "agents", externalAgentId, "agent.md"),
      "utf-8",
    );
    const externalTeamMd = await fs.readFile(
      path.join(externalRoot, "agent-teams", externalTeamId, "team.md"),
      "utf-8",
    );
    const externalAgentConfig = JSON.parse(
      await fs.readFile(path.join(externalRoot, "agents", externalAgentId, "agent-config.json"), "utf-8"),
    ) as Record<string, unknown>;

    expect(externalAgentMd).toContain("External agent updated in place");
    expect(externalTeamMd).toContain("External team updated in place");
    expect(externalAgentConfig.toolNames).toEqual(["tool-a"]);

    const deleteImportedResult = await execGraphql<{
      deleteAgentDefinition: { success: boolean };
      deleteAgentTeamDefinition: { success: boolean };
    }>(
      `
        mutation DeleteImportedDefinitions($agentId: String!, $teamId: String!) {
          deleteAgentDefinition(id: $agentId) { success }
          deleteAgentTeamDefinition(id: $teamId) { success }
        }
      `,
      { agentId: externalAgentId, teamId: externalTeamId },
    );

    expect(deleteImportedResult.deleteAgentDefinition.success).toBe(true);
    expect(deleteImportedResult.deleteAgentTeamDefinition.success).toBe(true);

    const postDeleteList = await execGraphql<{
      agents: Array<{ id: string }>;
      teams: Array<{ id: string }>;
    }>(`
      query PostDeleteReads {
        agents: agentDefinitions { id }
        teams: agentTeamDefinitions { id }
      }
    `);

    expect(postDeleteList.agents.some((entry) => entry.id === externalAgentId)).toBe(false);
    expect(postDeleteList.teams.some((entry) => entry.id === externalTeamId)).toBe(false);
    await expect(fs.access(path.join(externalRoot, "agents", externalAgentId))).rejects.toBeDefined();
    await expect(
      fs.access(path.join(externalRoot, "agent-teams", externalTeamId)),
    ).rejects.toBeDefined();

    const removeResult = await execGraphql<{
      removeAgentPackageRoot: Array<{ path: string }>;
    }>(
      `
        mutation RemoveAgentPackageRoot($path: String!) {
          removeAgentPackageRoot(path: $path) {
            path
          }
        }
      `,
      { path: externalRoot },
    );

    expect(removeResult.removeAgentPackageRoot.some((entry) => entry.path === externalRoot)).toBe(false);

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
  });

  it("rejects invalid agent package root paths and unsupported url-like inputs", async () => {
    const emptyRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-root-empty-"));
    cleanupPaths.add(emptyRoot);

    const invalidUrl = await runGraphql(
      `
        mutation AddAgentPackageRoot($path: String!) {
          addAgentPackageRoot(path: $path) { path }
        }
      `,
      { path: "https://github.com/example/definitions" },
    );
    expect(invalidUrl.errors?.length ?? 0).toBeGreaterThan(0);
    expect(invalidUrl.errors?.[0]?.message).toContain("absolute");

    const emptyRootResult = await runGraphql(
      `
        mutation AddAgentPackageRoot($path: String!) {
          addAgentPackageRoot(path: $path) { path }
        }
      `,
      { path: emptyRoot },
    );
    expect(emptyRootResult.errors?.length ?? 0).toBeGreaterThan(0);
    expect(emptyRootResult.errors?.[0]?.message).toContain("agents");

    const notFoundResult = await runGraphql(
      `
        mutation AddAgentPackageRoot($path: String!) {
          addAgentPackageRoot(path: $path) { path }
        }
      `,
      { path: path.join(os.tmpdir(), "agent-package-root-does-not-exist") },
    );
    expect(notFoundResult.errors?.length ?? 0).toBeGreaterThan(0);
    expect(notFoundResult.errors?.[0]?.message).toContain("not found");
  });
});
