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

describe("JSON file persistence contract e2e (no mocks)", () => {
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

  it("persists agent/team/mcp JSON contracts on disk through GraphQL APIs", async () => {
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
          activePromptVersion
          toolNames
        }
      }
    `;
    const createdAgent = await execGraphql<{
      createAgentDefinition: {
        id: string;
        name: string;
        role: string;
        description: string;
        activePromptVersion: number;
        toolNames: string[];
      };
    }>(createAgentMutation, {
      input: {
        name: agentName,
        role: "assistant",
        description: "Agent contract test description",
        toolNames: ["send_message_to"],
      },
    });

    expect(createdAgent.createAgentDefinition.id).toBe(expectedAgentId);
    const agentJsonPath = path.join(agentDir, "agent.json");
    const agentJsonRaw = await fs.readFile(agentJsonPath, "utf-8");
    const agentRecord = JSON.parse(agentJsonRaw) as Record<string, unknown>;
    expect(agentRecord).toMatchObject({
      name: agentName,
      role: "assistant",
      description: "Agent contract test description",
      activePromptVersion: 1,
      toolNames: ["send_message_to"],
    });
    expect(Array.isArray(agentRecord.inputProcessorNames)).toBe(true);
    expect(Array.isArray(agentRecord.llmResponseProcessorNames)).toBe(true);
    expect(Array.isArray(agentRecord.systemPromptProcessorNames)).toBe(true);
    expect(Array.isArray(agentRecord.toolExecutionResultProcessorNames)).toBe(true);
    expect(Array.isArray(agentRecord.toolInvocationPreprocessorNames)).toBe(true);
    expect(Array.isArray(agentRecord.lifecycleProcessorNames)).toBe(true);
    expect(Array.isArray(agentRecord.skillNames)).toBe(true);
    const agentFiles = await fs.readdir(agentDir);
    expect(agentFiles.some((name) => name.endsWith(".yaml") || name.endsWith(".yml"))).toBe(false);

    const updateAgentMutation = `
      mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
        updateAgentDefinition(input: $input) {
          id
        }
      }
    `;
    await execGraphql(updateAgentMutation, {
      input: {
        id: createdAgent.createAgentDefinition.id,
        description: "Agent contract test description",
        toolNames: ["send_message_to"],
      },
    });
    const agentJsonRawAfterNoop = await fs.readFile(agentJsonPath, "utf-8");
    expect(agentJsonRawAfterNoop).toBe(agentJsonRaw);

    await execGraphql(updateAgentMutation, {
      input: {
        id: createdAgent.createAgentDefinition.id,
        name: `${agentName} renamed`,
      },
    });
    const renamedAgentJsonPath = path.join(dataDir, "agents", expectedAgentId, "agent.json");
    const renamedAgentJson = JSON.parse(await fs.readFile(renamedAgentJsonPath, "utf-8")) as Record<
      string,
      unknown
    >;
    expect(renamedAgentJson.name).toBe(`${agentName} renamed`);
    expect(createdAgent.createAgentDefinition.id).toBe(expectedAgentId);

    const teamName = `Professor Team ${unique}`;
    const expectedTeamId = slugify(teamName, "team");
    const teamDir = path.join(dataDir, "agent-teams", expectedTeamId);
    cleanupPaths.add(teamDir);

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
        name: teamName,
        description: "Team contract test description",
        coordinatorMemberName: "leader",
        nodes: [
          {
            memberName: "leader",
            referenceId: createdAgent.createAgentDefinition.id,
            referenceType: "AGENT",
          },
        ],
      },
    });
    expect(createdTeam.createAgentTeamDefinition.id).toBe(expectedTeamId);

    const teamJsonPath = path.join(teamDir, "team.json");
    const teamJsonRaw = await fs.readFile(teamJsonPath, "utf-8");
    const teamRecord = JSON.parse(teamJsonRaw) as Record<string, unknown>;
    expect(teamRecord).toMatchObject({
      name: teamName,
      description: "Team contract test description",
      coordinatorMemberName: "leader",
      members: [{ memberName: "leader", agentId: expectedAgentId }],
    });
    const teamFiles = await fs.readdir(teamDir);
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
    const renamedTeamJsonPath = path.join(dataDir, "agent-teams", expectedTeamId, "team.json");
    const renamedTeamJson = JSON.parse(await fs.readFile(renamedTeamJsonPath, "utf-8")) as Record<
      string,
      unknown
    >;
    expect(renamedTeamJson.name).toBe(`${teamName} renamed`);
    expect((renamedTeamJson.members as Array<Record<string, unknown>>)[0]?.agentId).toBe(expectedAgentId);
    expect(createdTeam.createAgentTeamDefinition.id).toBe(expectedTeamId);

    const teamJsonRawAfterRename = await fs.readFile(teamJsonPath, "utf-8");
    await execGraphql(updateTeamMutation, {
      input: {
        id: createdTeam.createAgentTeamDefinition.id,
        name: `${teamName} renamed`,
      },
    });
    const teamJsonRawAfterNoop = await fs.readFile(teamJsonPath, "utf-8");
    expect(teamJsonRawAfterNoop).toBe(teamJsonRawAfterRename);

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

  it("reconstructs prompt markdown versions from sync import and keeps API cache coherent", async () => {
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
      },
    });
    const agentId = createdAgent.createAgentDefinition.id;
    const agentDir = path.join(dataDir, "agents", agentId);
    cleanupPaths.add(agentDir);

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
    const promptV1 = `You are agent ${unique} prompt v1.`;
    const promptV2 = `You are agent ${unique} prompt v2.`;
    const importResult = await execGraphql<{
      importSyncBundle: {
        success: boolean;
        summary: { processed: number; created: number; updated: number };
        failures: Array<{ key: string; message: string }>;
      };
    }>(importMutation, {
      input: {
        scope: ["AGENT_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            agent_definition: [
              {
                agentId,
                agent: {
                  name: createdAgent.createAgentDefinition.name,
                  role: "assistant",
                  description: "updated-description",
                  avatarUrl: null,
                  activePromptVersion: 2,
                  toolNames: ["send_message_to"],
                  inputProcessorNames: [],
                  llmResponseProcessorNames: [],
                  systemPromptProcessorNames: [],
                  toolExecutionResultProcessorNames: [],
                  toolInvocationPreprocessorNames: [],
                  lifecycleProcessorNames: [],
                  skillNames: [],
                },
                promptVersions: {
                  "1": promptV1,
                  "2": promptV2,
                },
              },
            ],
          },
          tombstones: {},
        },
      },
    });

    expect(importResult.importSyncBundle.success).toBe(true);
    expect(importResult.importSyncBundle.summary.processed).toBe(1);
    expect(importResult.importSyncBundle.summary.updated).toBe(1);
    expect(importResult.importSyncBundle.failures).toHaveLength(0);

    const promptV1Path = path.join(agentDir, "prompt-v1.md");
    const promptV2Path = path.join(agentDir, "prompt-v2.md");
    const [promptV1Content, promptV2Content] = await Promise.all([
      fs.readFile(promptV1Path, "utf-8"),
      fs.readFile(promptV2Path, "utf-8"),
    ]);
    expect(promptV1Content).toBe(promptV1);
    expect(promptV2Content).toBe(promptV2);

    const agentJson = JSON.parse(await fs.readFile(path.join(agentDir, "agent.json"), "utf-8")) as Record<
      string,
      unknown
    >;
    expect(agentJson.activePromptVersion).toBe(2);
    expect(agentJson.description).toBe("updated-description");

    const agentQuery = `
      query AgentDefinition($id: String!) {
        agentDefinition(id: $id) {
          id
          description
          activePromptVersion
        }
      }
    `;
    const queriedAgent = await execGraphql<{
      agentDefinition:
        | {
            id: string;
            description: string;
            activePromptVersion: number;
          }
        | null;
    }>(agentQuery, { id: agentId });
    expect(queriedAgent.agentDefinition?.description).toBe("updated-description");
    expect(queriedAgent.agentDefinition?.activePromptVersion).toBe(2);

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
        scope: ["AGENT_DEFINITION"],
        selection: {
          agentDefinitionIds: [agentId],
          includeDependencies: true,
        },
      },
    });

    const agentEntities = exported.exportSyncBundle.entities.agent_definition ?? [];
    expect(agentEntities).toHaveLength(1);
    expect(agentEntities[0]).toMatchObject({
      agentId,
      promptVersions: {
        "1": promptV1,
        "2": promptV2,
      },
    });
  });
});
