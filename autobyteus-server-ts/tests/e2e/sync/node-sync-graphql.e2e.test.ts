import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("Node sync GraphQL endpoint e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
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

  const runGraphql = async (
    query: string,
    variables?: Record<string, unknown>,
  ) =>
    graphql({
      schema,
      source: query,
      variableValues: variables,
    });

  it("imports prompt payload via sync endpoint and applies update on repeat import", async () => {
    const unique = uniqueId("sync_prompt");
    const category = `cat_${unique}`;
    const name = `Prompt_${unique}`;

    const importMutation = `
      mutation ImportSyncBundle($input: ImportNodeSyncBundleInput!) {
        importSyncBundle(input: $input) {
          success
          appliedWatermark
          summary {
            processed
            created
            updated
            deleted
            skipped
          }
          failures {
            entityType
            key
            message
          }
        }
      }
    `;

    const createResult = await execGraphql<{
      importSyncBundle: {
        success: boolean;
        summary: { processed: number; created: number; updated: number };
        failures: Array<{ key: string; message: string }>;
      };
    }>(importMutation, {
      input: {
        scope: ["PROMPT"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            prompt: [
              {
                key: `${category}::${name}::1::default`,
                name,
                category,
                promptContent: "sync-import-v1",
                description: "created by sync endpoint e2e",
                suitableForModels: "default",
                version: 1,
                isActive: true,
              },
            ],
          },
          tombstones: {},
        },
      },
    });

    expect(createResult.importSyncBundle.success).toBe(true);
    expect(createResult.importSyncBundle.summary.processed).toBe(1);
    expect(createResult.importSyncBundle.summary.created).toBe(1);
    expect(createResult.importSyncBundle.failures).toHaveLength(0);

    const updateResult = await execGraphql<{
      importSyncBundle: {
        success: boolean;
        summary: { processed: number; created: number; updated: number };
        failures: Array<{ key: string; message: string }>;
      };
    }>(importMutation, {
      input: {
        scope: ["PROMPT"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            prompt: [
              {
                key: `${category}::${name}::1::default`,
                name,
                category,
                promptContent: "sync-import-v2",
                description: "updated by sync endpoint e2e",
                suitableForModels: "default",
                version: 1,
                isActive: true,
              },
            ],
          },
          tombstones: {},
        },
      },
    });

    expect(updateResult.importSyncBundle.success).toBe(true);
    expect(updateResult.importSyncBundle.summary.processed).toBe(1);
    expect(updateResult.importSyncBundle.summary.updated).toBe(1);
    expect(updateResult.importSyncBundle.failures).toHaveLength(0);

    const detailsQuery = `
      query PromptDetailsByNameAndCategory($category: String!, $name: String!) {
        promptDetailsByNameAndCategory(category: $category, name: $name) {
          promptContent
        }
      }
    `;

    const details = await execGraphql<{
      promptDetailsByNameAndCategory: { promptContent: string } | null;
    }>(detailsQuery, { category, name });

    expect(details.promptDetailsByNameAndCategory?.promptContent).toBe("sync-import-v2");
  });

  it("exports only selected team dependency closure from exportSyncBundle endpoint", async () => {
    const unique = uniqueId("sync_selective");
    const categoryA = `cat_a_${unique}`;
    const nameA = `PromptA_${unique}`;
    const categoryB = `cat_b_${unique}`;
    const nameB = `PromptB_${unique}`;

    const createPromptMutation = `
      mutation CreatePrompt($input: CreatePromptInput!) {
        createPrompt(input: $input) {
          id
        }
      }
    `;

    await execGraphql(createPromptMutation, {
      input: {
        name: nameA,
        category: categoryA,
        promptContent: "prompt-a",
        description: "selective sync prompt a",
      },
    });
    await execGraphql(createPromptMutation, {
      input: {
        name: nameB,
        category: categoryB,
        promptContent: "prompt-b",
        description: "selective sync prompt b",
      },
    });

    const createAgentMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
        }
      }
    `;

    const agentA = await execGraphql<{ createAgentDefinition: { id: string; name: string } }>(
      createAgentMutation,
      {
        input: {
          name: `agent_a_${unique}`,
          role: "assistant",
          description: "agent a",
          systemPromptCategory: categoryA,
          systemPromptName: nameA,
        },
      },
    );

    const agentB = await execGraphql<{ createAgentDefinition: { id: string; name: string } }>(
      createAgentMutation,
      {
        input: {
          name: `agent_b_${unique}`,
          role: "assistant",
          description: "agent b",
          systemPromptCategory: categoryB,
          systemPromptName: nameB,
        },
      },
    );

    const createTeamMutation = `
      mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
        }
      }
    `;

    const createdTeam = await execGraphql<{ createAgentTeamDefinition: { id: string; name: string } }>(
      createTeamMutation,
      {
        input: {
          name: `team_${unique}`,
          description: "team selective",
          coordinatorMemberName: "leader",
          nodes: [
            {
              memberName: "leader",
              referenceId: agentA.createAgentDefinition.id,
              referenceType: "AGENT",
            },
          ],
        },
      },
    );

    const exportQuery = `
      query ExportSyncBundle($input: ExportNodeSyncBundleInput!) {
        exportSyncBundle(input: $input) {
          watermark
          entities
          tombstones
        }
      }
    `;

    const exported = await execGraphql<{
      exportSyncBundle: {
        entities: Record<string, Array<Record<string, unknown>>>;
      };
    }>(exportQuery, {
      input: {
        scope: [
          "PROMPT",
          "AGENT_DEFINITION",
          "AGENT_TEAM_DEFINITION",
          "MCP_SERVER_CONFIGURATION",
        ],
        selection: {
          agentTeamDefinitionIds: [createdTeam.createAgentTeamDefinition.id],
          includeDependencies: true,
        },
      },
    });

    const promptEntities = exported.exportSyncBundle.entities.prompt ?? [];
    const agentEntities = exported.exportSyncBundle.entities.agent_definition ?? [];
    const teamEntities = exported.exportSyncBundle.entities.agent_team_definition ?? [];
    const mcpEntities = exported.exportSyncBundle.entities.mcp_server_configuration ?? [];

    expect(teamEntities.map((team) => team.name)).toEqual([createdTeam.createAgentTeamDefinition.name]);
    expect(agentEntities.map((agent) => agent.name)).toContain(agentA.createAgentDefinition.name);
    expect(agentEntities.map((agent) => agent.name)).not.toContain(agentB.createAgentDefinition.name);
    expect(promptEntities.map((prompt) => prompt.name)).toContain(nameA);
    expect(promptEntities.map((prompt) => prompt.name)).not.toContain(nameB);
    expect(mcpEntities).toHaveLength(0);
  });

  it("exports full scope when no selection is provided", async () => {
    const unique = uniqueId("sync_full");
    const category = `cat_${unique}`;
    const promptName = `Prompt_${unique}`;

    const createPromptMutation = `
      mutation CreatePrompt($input: CreatePromptInput!) {
        createPrompt(input: $input) {
          id
          name
          category
        }
      }
    `;
    await execGraphql(createPromptMutation, {
      input: {
        name: promptName,
        category,
        promptContent: "full sync prompt",
        description: "full sync prompt",
      },
    });

    const createAgentMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
        }
      }
    `;
    const createdAgent = await execGraphql<{
      createAgentDefinition: { id: string; name: string };
    }>(createAgentMutation, {
      input: {
        name: `agent_${unique}`,
        role: "assistant",
        description: "full sync agent",
        systemPromptCategory: category,
        systemPromptName: promptName,
        toolNames: ["tool_alpha"],
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
      createAgentTeamDefinition: { id: string; name: string };
    }>(createTeamMutation, {
      input: {
        name: `team_${unique}`,
        description: "full sync team",
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
        scope: [
          "PROMPT",
          "AGENT_DEFINITION",
          "AGENT_TEAM_DEFINITION",
          "MCP_SERVER_CONFIGURATION",
        ],
      },
    });

    const prompts = exported.exportSyncBundle.entities.prompt ?? [];
    const agents = exported.exportSyncBundle.entities.agent_definition ?? [];
    const teams = exported.exportSyncBundle.entities.agent_team_definition ?? [];
    const mcps = exported.exportSyncBundle.entities.mcp_server_configuration ?? [];

    expect(prompts.some((p) => p.name === promptName && p.category === category)).toBe(true);
    expect(agents.some((a) => a.name === createdAgent.createAgentDefinition.name)).toBe(true);
    expect(teams.some((t) => t.name === createdTeam.createAgentTeamDefinition.name)).toBe(true);
    expect(Array.isArray(mcps)).toBe(true);
  });

  it("overwrites existing agent fields on sync import when conflictPolicy=SOURCE_WINS", async () => {
    const unique = uniqueId("sync_overwrite");
    const category = `cat_${unique}`;
    const promptName = `Prompt_${unique}`;
    const agentName = `agent_${unique}`;

    const createPromptMutation = `
      mutation CreatePrompt($input: CreatePromptInput!) {
        createPrompt(input: $input) {
          id
        }
      }
    `;
    await execGraphql(createPromptMutation, {
      input: {
        name: promptName,
        category,
        promptContent: "overwrite prompt",
        description: "overwrite prompt",
      },
    });

    const createAgentMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
          toolNames
          description
        }
      }
    `;
    const existingAgent = await execGraphql<{
      createAgentDefinition: {
        id: string;
        name: string;
        toolNames: string[];
        description: string;
      };
    }>(createAgentMutation, {
      input: {
        name: agentName,
        role: "assistant",
        description: "target-old-description",
        systemPromptCategory: category,
        systemPromptName: promptName,
        toolNames: ["tool_old"],
      },
    });
    expect(existingAgent.createAgentDefinition.toolNames).toEqual(["tool_old"]);

    const importMutation = `
      mutation ImportSyncBundle($input: ImportNodeSyncBundleInput!) {
        importSyncBundle(input: $input) {
          success
          summary {
            processed
            created
            updated
            deleted
            skipped
          }
          failures {
            entityType
            key
            message
          }
        }
      }
    `;

    const importResult = await execGraphql<{
      importSyncBundle: {
        success: boolean;
        summary: { processed: number; updated: number; skipped: number };
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
                name: agentName,
                role: "assistant",
                description: "source-new-description",
                avatarUrl: null,
                systemPromptCategory: category,
                systemPromptName: promptName,
                toolNames: ["tool_old", "tool_new"],
                inputProcessorNames: [],
                llmResponseProcessorNames: [],
                systemPromptProcessorNames: [],
                toolExecutionResultProcessorNames: [],
                toolInvocationPreprocessorNames: [],
                lifecycleProcessorNames: [],
                skillNames: [],
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

    const agentQuery = `
      query AgentDefinition($id: String!) {
        agentDefinition(id: $id) {
          id
          name
          description
          toolNames
        }
      }
    `;
    const updatedAgent = await execGraphql<{
      agentDefinition: {
        id: string;
        name: string;
        description: string;
        toolNames: string[];
      } | null;
    }>(agentQuery, { id: existingAgent.createAgentDefinition.id });

    expect(updatedAgent.agentDefinition?.name).toBe(agentName);
    expect(updatedAgent.agentDefinition?.description).toBe("source-new-description");
    expect(updatedAgent.agentDefinition?.toolNames).toEqual(["tool_old", "tool_new"]);
  });

  it("returns endpoint error for invalid selective sync selector", async () => {
    const exportQuery = `
      query ExportSyncBundle($input: ExportNodeSyncBundleInput!) {
        exportSyncBundle(input: $input) {
          watermark
        }
      }
    `;

    const result = await runGraphql(exportQuery, {
      input: {
        scope: ["PROMPT", "AGENT_DEFINITION"],
        selection: {
          agentDefinitionIds: [uniqueId("missing_agent_id")],
          includeDependencies: true,
        },
      },
    });

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain("Selected agent id was not found on source node");
  });

  it("never returns MCP HTTP token/headers from sync export endpoint", async () => {
    const unique = uniqueId("sync_mcp");
    const serverId = `mcp_http_${unique}`;

    const configureMutation = `
      mutation ConfigureMcpServer($input: McpServerInput!) {
        configureMcpServer(input: $input) {
          savedConfig {
            ... on StreamableHttpMcpServerConfig {
              serverId
              transportType
              url
              token
              headers
            }
          }
        }
      }
    `;

    await execGraphql(configureMutation, {
      input: {
        serverId,
        transportType: "STREAMABLE_HTTP",
        enabled: true,
        streamableHttpConfig: {
          url: "http://localhost:8800/mcp",
          token: "sensitive-token",
          headers: {
            Authorization: "Bearer sensitive-token",
          },
        },
      },
    });

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
        scope: ["MCP_SERVER_CONFIGURATION"],
      },
    });

    const mcpEntities = exported.exportSyncBundle.entities.mcp_server_configuration ?? [];
    const syncedConfig = mcpEntities.find((entry) => entry.serverId === serverId);
    expect(syncedConfig).toBeDefined();
    expect(syncedConfig).not.toHaveProperty("token");
    expect(syncedConfig).not.toHaveProperty("headers");
  });

  it("ignores MCP HTTP token/headers when importing sync payload", async () => {
    const unique = uniqueId("sync_mcp_import");
    const serverId = `mcp_http_${unique}`;

    const importMutation = `
      mutation ImportSyncBundle($input: ImportNodeSyncBundleInput!) {
        importSyncBundle(input: $input) {
          success
          summary {
            processed
            created
            updated
            deleted
            skipped
          }
          failures {
            entityType
            key
            message
          }
        }
      }
    `;

    const importResult = await execGraphql<{
      importSyncBundle: {
        success: boolean;
        summary: { processed: number; created: number };
        failures: Array<{ key: string; message: string }>;
      };
    }>(importMutation, {
      input: {
        scope: ["MCP_SERVER_CONFIGURATION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            mcp_server_configuration: [
              {
                serverId,
                transportType: "streamable_http",
                enabled: true,
                url: "http://localhost:8811/mcp",
                token: "must-not-be-imported",
                headers: {
                  Authorization: "Bearer must-not-be-imported",
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
    expect(importResult.importSyncBundle.summary.created).toBe(1);
    expect(importResult.importSyncBundle.failures).toHaveLength(0);

    const mcpServersQuery = `
      query McpServers {
        mcpServers {
          ... on StreamableHttpMcpServerConfig {
            serverId
            transportType
            url
            token
            headers
          }
        }
      }
    `;

    const mcpServers = await execGraphql<{
      mcpServers: Array<{
        serverId?: string;
        transportType?: string;
        url?: string;
        token?: string | null;
        headers?: Record<string, string> | null;
      }>;
    }>(mcpServersQuery);

    const importedConfig = mcpServers.mcpServers.find((entry) => entry.serverId === serverId);
    expect(importedConfig).toBeDefined();
    expect(importedConfig?.token ?? null).toBeNull();
    expect(importedConfig?.headers ?? null).toBeNull();
  });
});
