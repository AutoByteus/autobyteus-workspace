import "reflect-metadata";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

function slugify(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildAgentMd(input: {
  name: string;
  description: string;
  category?: string;
  role?: string;
  instructions: string;
}): string {
  const lines = ["---", `name: ${input.name}`, `description: ${input.description}`];
  if (input.category) {
    lines.push(`category: ${input.category}`);
  }
  if (input.role) {
    lines.push(`role: ${input.role}`);
  }
  lines.push("---", "", input.instructions);
  return lines.join("\n");
}

function buildTeamMd(input: {
  name: string;
  description: string;
  category?: string;
  instructions: string;
}): string {
  const lines = ["---", `name: ${input.name}`, `description: ${input.description}`];
  if (input.category) {
    lines.push(`category: ${input.category}`);
  }
  lines.push("---", "", input.instructions);
  return lines.join("\n");
}

describe("JSON file persistence contract e2e (md-centric, no mocks)", () => {
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

  it("persists agent/team/mcp contracts with agent.md+agent-config.json and team.md+team-config.json", async () => {
    const unique = `ac_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const dataDir = appConfigProvider.config.getAppDataDir();

    const agentName = `Professor Agent ${unique}`;
    const expectedAgentId = slugify(agentName, "agent");
    const agentDir = path.join(dataDir, "agents", expectedAgentId);
    cleanupPaths.add(agentDir);

    const createAgentMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
          role
          description
          category
          instructions
          toolNames
          skillNames
        }
      }
    `;
    const createdAgent = await execGraphql<{
      createAgentDefinition: {
        id: string;
        name: string;
        role: string | null;
        description: string;
        category: string | null;
        instructions: string;
        toolNames: string[];
        skillNames: string[];
      };
    }>(createAgentMutation, {
      input: {
        name: agentName,
        role: "assistant",
        description: "Agent contract test description",
        category: "contract",
        instructions: "Contract agent instructions",
        toolNames: ["send_message_to"],
        skillNames: ["skill_contract"],
      },
    });

    expect(createdAgent.createAgentDefinition.id).toBe(expectedAgentId);

    const agentMdPath = path.join(agentDir, "agent.md");
    const agentConfigPath = path.join(agentDir, "agent-config.json");
    const [agentMdRaw, agentConfigRaw, agentFiles] = await Promise.all([
      fs.readFile(agentMdPath, "utf-8"),
      fs.readFile(agentConfigPath, "utf-8"),
      fs.readdir(agentDir),
    ]);

    expect(agentMdRaw).toContain(`name: ${agentName}`);
    expect(agentMdRaw).toContain("description: Agent contract test description");
    expect(agentMdRaw).toContain("category: contract");
    expect(agentMdRaw).toContain("Contract agent instructions");

    const agentConfig = JSON.parse(agentConfigRaw) as Record<string, unknown>;
    expect(agentConfig).toMatchObject({
      toolNames: ["send_message_to"],
      skillNames: ["skill_contract"],
      avatarUrl: null,
    });
    expect(Array.isArray(agentConfig.inputProcessorNames)).toBe(true);
    expect(Array.isArray(agentConfig.llmResponseProcessorNames)).toBe(true);
    expect(Array.isArray(agentConfig.systemPromptProcessorNames)).toBe(true);
    expect(Array.isArray(agentConfig.toolExecutionResultProcessorNames)).toBe(true);
    expect(Array.isArray(agentConfig.toolInvocationPreprocessorNames)).toBe(true);
    expect(Array.isArray(agentConfig.lifecycleProcessorNames)).toBe(true);
    expect(agentFiles.some((name) => /^prompt-v\d+\.md$/.test(name))).toBe(false);
    expect(agentFiles.some((name) => name.endsWith(".yaml") || name.endsWith(".yml"))).toBe(false);

    const updateAgentMutation = `
      mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
        updateAgentDefinition(input: $input) {
          id
          name
          description
          instructions
        }
      }
    `;
    const unchangedMd = await fs.readFile(agentMdPath, "utf-8");
    await execGraphql(updateAgentMutation, {
      input: {
        id: createdAgent.createAgentDefinition.id,
        name: agentName,
        description: "Agent contract test description",
        instructions: "Contract agent instructions",
      },
    });
    const unchangedMdAfterNoop = await fs.readFile(agentMdPath, "utf-8");
    expect(unchangedMdAfterNoop).toBe(unchangedMd);

    await execGraphql(updateAgentMutation, {
      input: {
        id: createdAgent.createAgentDefinition.id,
        name: `${agentName} renamed`,
      },
    });
    const renamedAgentMd = await fs.readFile(agentMdPath, "utf-8");
    expect(renamedAgentMd).toContain(`name: ${agentName} renamed`);

    const teamName = `Professor Team ${unique}`;
    const expectedTeamId = slugify(teamName, "team");
    const teamDir = path.join(dataDir, "agent-teams", expectedTeamId);
    cleanupPaths.add(teamDir);

    const createTeamMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
          description
          category
          instructions
          coordinatorMemberName
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;
    const createdTeam = await execGraphql<{
      createAgentTeamDefinition: {
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
        coordinatorMemberName: string;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(createTeamMutation, {
      input: {
        name: teamName,
        description: "Team contract test description",
        category: "contract",
        instructions: "Team contract instructions",
        coordinatorMemberName: "leader",
        nodes: [
          {
            memberName: "leader",
            ref: createdAgent.createAgentDefinition.id,
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });

    expect(createdTeam.createAgentTeamDefinition.id).toBe(expectedTeamId);

    const teamMdPath = path.join(teamDir, "team.md");
    const teamConfigPath = path.join(teamDir, "team-config.json");
    const [teamMdRaw, teamConfigRaw, teamFiles] = await Promise.all([
      fs.readFile(teamMdPath, "utf-8"),
      fs.readFile(teamConfigPath, "utf-8"),
      fs.readdir(teamDir),
    ]);

    expect(teamMdRaw).toContain(`name: ${teamName}`);
    expect(teamMdRaw).toContain("description: Team contract test description");
    expect(teamMdRaw).toContain("category: contract");
    expect(teamMdRaw).toContain("Team contract instructions");

    const teamConfig = JSON.parse(teamConfigRaw) as Record<string, unknown>;
    expect(teamConfig).toMatchObject({
      coordinatorMemberName: "leader",
      members: [
        { memberName: "leader", ref: expectedAgentId, refType: "agent", refScope: "shared" },
      ],
      avatarUrl: null,
    });
    expect(teamFiles.some((name) => name.endsWith(".yaml") || name.endsWith(".yml"))).toBe(false);

    const updateTeamMutation = `
      mutation UpdateAgentTeamDefinition($input: UpdateAgentTeamDefinitionInput!) {
        updateAgentTeamDefinition(input: $input) {
          id
          name
        }
      }
    `;
    await execGraphql(updateTeamMutation, {
      input: {
        id: createdTeam.createAgentTeamDefinition.id,
        name: `${teamName} renamed`,
      },
    });
    const renamedTeamMd = await fs.readFile(teamMdPath, "utf-8");
    expect(renamedTeamMd).toContain(`name: ${teamName} renamed`);

    const serverId = `stdio_${unique}`;
    const mcpsJsonPath = path.join(dataDir, "mcps.json");
    cleanupPaths.add(mcpsJsonPath);

    const configureMcpMutation = `
      mutation ConfigureMcpServer($input: McpServerInput!) {
        configureMcpServer(input: $input) {
          savedConfig {
            ... on StdioMcpServerConfig {
              serverId
              command
            }
          }
        }
      }
    `;
    await execGraphql(configureMcpMutation, {
      input: {
        serverId,
        transportType: "STDIO",
        enabled: true,
        stdioConfig: {
          command: "node",
          args: ["-e", "console.log('ok')"],
          env: { TEST_ENV: "1" },
        },
      },
    });

    const mcpFile = JSON.parse(await fs.readFile(mcpsJsonPath, "utf-8")) as Record<string, unknown>;
    const mcpServers = (mcpFile.mcpServers ?? {}) as Record<string, Record<string, unknown>>;
    expect(mcpServers[serverId]).toMatchObject({
      command: "node",
      args: ["-e", "console.log('ok')"],
      env: { TEST_ENV: "1" },
    });
    expect(mcpServers[serverId]).not.toHaveProperty("transport_type");
  });

  it("imports md/config sync payloads and keeps API cache coherent", async () => {
    const unique = `sync_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const dataDir = appConfigProvider.config.getAppDataDir();

    const createAgentMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
        }
      }
    `;
    const createdAgent = await execGraphql<{
      createAgentDefinition: {
        id: string;
        name: string;
      };
    }>(createAgentMutation, {
      input: {
        name: `Sync Agent ${unique}`,
        role: "assistant",
        description: "old-description",
        instructions: "old-instructions",
      },
    });

    const createTeamMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
        }
      }
    `;
    const createdTeam = await execGraphql<{
      createAgentTeamDefinition: {
        id: string;
        name: string;
      };
    }>(createTeamMutation, {
      input: {
        name: `Sync Team ${unique}`,
        description: "old-team-description",
        instructions: "old-team-instructions",
        coordinatorMemberName: "lead",
        nodes: [
          {
            memberName: "lead",
            ref: createdAgent.createAgentDefinition.id,
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });

    const agentId = createdAgent.createAgentDefinition.id;
    const teamId = createdTeam.createAgentTeamDefinition.id;
    const agentDir = path.join(dataDir, "agents", agentId);
    const teamDir = path.join(dataDir, "agent-teams", teamId);
    cleanupPaths.add(agentDir);
    cleanupPaths.add(teamDir);

    const importMutation = `
      mutation ImportSyncBundle($input: ImportNodeSyncBundleInput!) {
        importSyncBundle(input: $input) {
          success
          summary {
            processed
            created
            updated
          }
          failures {
            key
            message
          }
        }
      }
    `;

    const importedAgentMd = buildAgentMd({
      name: createdAgent.createAgentDefinition.name,
      role: "assistant",
      description: "updated-description",
      category: "sync",
      instructions: "updated-instructions",
    });
    const importedAgentConfig = JSON.stringify(
      {
        toolNames: ["send_message_to"],
        skillNames: ["sync_skill"],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        avatarUrl: null,
      },
      null,
      2,
    );

    const importedTeamMd = buildTeamMd({
      name: createdTeam.createAgentTeamDefinition.name,
      description: "updated-team-description",
      category: "sync",
      instructions: "updated-team-instructions",
    });
    const importedTeamConfig = JSON.stringify(
      {
        coordinatorMemberName: "lead",
        members: [{ memberName: "lead", ref: agentId, refType: "agent", refScope: "shared" }],
        avatarUrl: null,
      },
      null,
      2,
    );

    const importResult = await execGraphql<{
      importSyncBundle: {
        success: boolean;
        summary: { processed: number; created: number; updated: number };
        failures: Array<{ key: string; message: string }>;
      };
    }>(importMutation, {
      input: {
        scope: ["AGENT_DEFINITION", "AGENT_TEAM_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            agent_definition: [
              {
                agentId,
                files: {
                  agentMd: importedAgentMd,
                  agentConfigJson: importedAgentConfig,
                },
              },
            ],
            agent_team_definition: [
              {
                teamId,
                files: {
                  teamMd: importedTeamMd,
                  teamConfigJson: importedTeamConfig,
                },
              },
            ],
          },
          tombstones: {},
        },
      },
    });

    expect(importResult.importSyncBundle.success).toBe(true);
    expect(importResult.importSyncBundle.summary.processed).toBe(2);
    expect(importResult.importSyncBundle.summary.updated).toBe(2);
    expect(importResult.importSyncBundle.failures).toHaveLength(0);

    const [agentMdDisk, agentConfigDisk, teamMdDisk, teamConfigDisk] = await Promise.all([
      fs.readFile(path.join(agentDir, "agent.md"), "utf-8"),
      fs.readFile(path.join(agentDir, "agent-config.json"), "utf-8"),
      fs.readFile(path.join(teamDir, "team.md"), "utf-8"),
      fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ]);

    expect(agentMdDisk).toBe(importedAgentMd);
    expect(JSON.parse(agentConfigDisk)).toEqual(JSON.parse(importedAgentConfig));
    expect(teamMdDisk).toBe(importedTeamMd);
    expect(JSON.parse(teamConfigDisk)).toEqual(JSON.parse(importedTeamConfig));

    const agentQuery = `
      query AgentDefinition($id: String!) {
        agentDefinition(id: $id) {
          id
          description
          instructions
          toolNames
          skillNames
        }
      }
    `;
    const queriedAgent = await execGraphql<{
      agentDefinition:
        | {
            id: string;
            description: string;
            instructions: string;
            toolNames: string[];
            skillNames: string[];
          }
        | null;
    }>(agentQuery, { id: agentId });
    expect(queriedAgent.agentDefinition?.description).toBe("updated-description");
    expect(queriedAgent.agentDefinition?.instructions).toBe("updated-instructions");
    expect(queriedAgent.agentDefinition?.toolNames).toEqual(["send_message_to"]);
    expect(queriedAgent.agentDefinition?.skillNames).toEqual(["sync_skill"]);

    const exportQuery = `
      query ExportSyncBundle($input: ExportNodeSyncBundleInput!) {
        exportSyncBundle(input: $input) {
          entities
        }
      }
    `;
    const exported = await execGraphql<{
      exportSyncBundle: {
        entities: Record<string, Array<Record<string, unknown>>>;
      };
    }>(exportQuery, {
      input: {
        scope: ["AGENT_DEFINITION", "AGENT_TEAM_DEFINITION"],
        selection: {
          agentDefinitionIds: [agentId],
          agentTeamDefinitionIds: [teamId],
          includeDependencies: true,
        },
      },
    });

    const agentEntities = exported.exportSyncBundle.entities.agent_definition ?? [];
    const teamEntities = exported.exportSyncBundle.entities.agent_team_definition ?? [];
    expect(agentEntities).toHaveLength(1);
    expect(teamEntities).toHaveLength(1);

    const exportedAgentFiles = agentEntities[0]?.files as
      | { agentMd?: string; agentConfigJson?: string }
      | undefined;
    const exportedTeamFiles = teamEntities[0]?.files as
      | { teamMd?: string; teamConfigJson?: string }
      | undefined;

    expect(exportedAgentFiles?.agentMd).toBe(importedAgentMd);
    expect(JSON.parse(exportedAgentFiles?.agentConfigJson ?? "{}")).toEqual(
      JSON.parse(importedAgentConfig),
    );
    expect(exportedTeamFiles?.teamMd).toBe(importedTeamMd);
    expect(JSON.parse(exportedTeamFiles?.teamConfigJson ?? "{}")).toEqual(
      JSON.parse(importedTeamConfig),
    );
  });
});
