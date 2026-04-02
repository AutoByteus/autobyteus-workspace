import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

  it("imports agent payload via sync endpoint and applies update on repeat import", async () => {
    const unique = uniqueId("sync_agent");
    const agentId = `agent_${unique}`;
    const agentName = `Agent_${unique}`;

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
        scope: ["AGENT_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            agent_definition: [
              {
                agentId,
                files: {
                  agentMd: buildAgentMd({
                    name: agentName,
                    role: "assistant",
                    description: "sync-import-v1",
                    category: "sync",
                    instructions: "sync agent instructions v1",
                  }),
                  agentConfigJson: JSON.stringify({
                    toolNames: ["tool_a"],
                    skillNames: ["skill_a"],
                    inputProcessorNames: [],
                    llmResponseProcessorNames: [],
                    systemPromptProcessorNames: [],
                    toolExecutionResultProcessorNames: [],
                    toolInvocationPreprocessorNames: [],
                    lifecycleProcessorNames: [],
                    avatarUrl: null,
                  }),
                },
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
        scope: ["AGENT_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            agent_definition: [
              {
                agentId,
                files: {
                  agentMd: buildAgentMd({
                    name: agentName,
                    role: "assistant",
                    description: "sync-import-v2",
                    category: "sync",
                    instructions: "sync agent instructions v2",
                  }),
                  agentConfigJson: JSON.stringify({
                    toolNames: ["tool_a", "tool_b"],
                    skillNames: ["skill_a", "skill_b"],
                    inputProcessorNames: [],
                    llmResponseProcessorNames: [],
                    systemPromptProcessorNames: [],
                    toolExecutionResultProcessorNames: [],
                    toolInvocationPreprocessorNames: [],
                    lifecycleProcessorNames: [],
                    avatarUrl: null,
                  }),
                },
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
      query AgentDefinition($id: String!) {
        agentDefinition(id: $id) {
          id
          name
          description
          instructions
          toolNames
          skillNames
        }
      }
    `;

    const details = await execGraphql<{
      agentDefinition:
        | {
            id: string;
            name: string;
            description: string;
            instructions: string;
            toolNames: string[];
            skillNames: string[];
          }
        | null;
    }>(detailsQuery, { id: agentId });

    expect(details.agentDefinition?.name).toBe(agentName);
    expect(details.agentDefinition?.description).toBe("sync-import-v2");
    expect(details.agentDefinition?.instructions).toBe("sync agent instructions v2");
    expect(details.agentDefinition?.toolNames).toEqual(["tool_a", "tool_b"]);
    expect(details.agentDefinition?.skillNames).toEqual(["skill_a", "skill_b"]);

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
    expect(agentEntities[0]?.agentId).toBe(agentId);
    expect(agentEntities[0]).not.toHaveProperty("agent");
    expect(agentEntities[0]).not.toHaveProperty("promptVersions");
    const exportedFiles = agentEntities[0]?.files as
      | { agentMd?: string; agentConfigJson?: string }
      | undefined;
    expect(typeof exportedFiles?.agentMd).toBe("string");
    expect(typeof exportedFiles?.agentConfigJson).toBe("string");
    expect(exportedFiles?.agentMd).toContain("sync agent instructions v2");
  });

  it("exports only selected team dependency closure from exportSyncBundle endpoint", async () => {
    const unique = uniqueId("sync_selective");

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
          instructions: "agent a instructions",
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
          instructions: "agent b instructions",
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
          instructions: "team selective instructions",
          coordinatorMemberName: "leader",
          nodes: [
            {
              memberName: "leader",
              ref: agentA.createAgentDefinition.id,
              refType: "AGENT",
              refScope: "SHARED",
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
        scope: ["AGENT_DEFINITION", "AGENT_TEAM_DEFINITION", "MCP_SERVER_CONFIGURATION"],
        selection: {
          agentTeamDefinitionIds: [createdTeam.createAgentTeamDefinition.id],
          includeDependencies: true,
        },
      },
    });

    const agentEntities = exported.exportSyncBundle.entities.agent_definition ?? [];
    const teamEntities = exported.exportSyncBundle.entities.agent_team_definition ?? [];
    const mcpEntities = exported.exportSyncBundle.entities.mcp_server_configuration ?? [];

    expect(teamEntities.map((team) => team.teamId)).toEqual([createdTeam.createAgentTeamDefinition.id]);
    expect(agentEntities.map((agent) => agent.agentId)).toContain(agentA.createAgentDefinition.id);
    expect(agentEntities.map((agent) => agent.agentId)).not.toContain(agentB.createAgentDefinition.id);
    expect(mcpEntities).toHaveLength(0);
  });

  it("exports full scope when no selection is provided", async () => {
    const unique = uniqueId("sync_full");

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
        instructions: "full sync agent instructions",
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
        instructions: "full sync team instructions",
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
        scope: ["AGENT_DEFINITION", "AGENT_TEAM_DEFINITION", "MCP_SERVER_CONFIGURATION"],
      },
    });

    const agents = exported.exportSyncBundle.entities.agent_definition ?? [];
    const teams = exported.exportSyncBundle.entities.agent_team_definition ?? [];
    const mcps = exported.exportSyncBundle.entities.mcp_server_configuration ?? [];

    expect(agents.some((a) => a.agentId === createdAgent.createAgentDefinition.id)).toBe(true);
    expect(teams.some((t) => t.teamId === createdTeam.createAgentTeamDefinition.id)).toBe(true);
    expect(Array.isArray(mcps)).toBe(true);
  });

  it("overwrites existing agent fields on sync import when conflictPolicy=SOURCE_WINS", async () => {
    const unique = uniqueId("sync_overwrite");
    const agentName = `agent_${unique}`;

    const createAgentMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
          toolNames
          description
          instructions
        }
      }
    `;
    const existingAgent = await execGraphql<{
      createAgentDefinition: {
        id: string;
        name: string;
        toolNames: string[];
        description: string;
        instructions: string;
      };
    }>(createAgentMutation, {
      input: {
        name: agentName,
        role: "assistant",
        description: "target-old-description",
        instructions: "target-old-instructions",
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
                agentId: existingAgent.createAgentDefinition.id,
                files: {
                  agentMd: buildAgentMd({
                    name: agentName,
                    role: "assistant",
                    description: "source-new-description",
                    instructions: "source-new-instructions",
                  }),
                  agentConfigJson: JSON.stringify({
                    toolNames: ["tool_old", "tool_new"],
                    inputProcessorNames: [],
                    llmResponseProcessorNames: [],
                    systemPromptProcessorNames: [],
                    toolExecutionResultProcessorNames: [],
                    toolInvocationPreprocessorNames: [],
                    lifecycleProcessorNames: [],
                    skillNames: [],
                    avatarUrl: null,
                  }),
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

    const agentQuery = `
      query AgentDefinition($id: String!) {
        agentDefinition(id: $id) {
          id
          name
          description
          instructions
          toolNames
        }
      }
    `;
    const updatedAgent = await execGraphql<{
      agentDefinition: {
        id: string;
        name: string;
        description: string;
        instructions: string;
        toolNames: string[];
      } | null;
    }>(agentQuery, { id: existingAgent.createAgentDefinition.id });

    expect(updatedAgent.agentDefinition?.name).toBe(agentName);
    expect(updatedAgent.agentDefinition?.description).toBe("source-new-description");
    expect(updatedAgent.agentDefinition?.instructions).toBe("source-new-instructions");
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
        scope: ["AGENT_DEFINITION"],
        selection: {
          agentDefinitionIds: [uniqueId("missing_agent_id")],
          includeDependencies: true,
        },
      },
    });

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain(
      "Selected agent definition ID was not found on source node",
    );
  });

  it("fails selective team export when a selected team references a missing local agent", async () => {
    const unique = uniqueId("missing_local_sync");
    const teamId = `team_${unique}`;
    const missingLocalAgentId = `reviewer_${unique}`;

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
        scope: ["AGENT_TEAM_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
        bundle: {
          watermark: new Date().toISOString(),
          entities: {
            agent_team_definition: [
              {
                teamId,
                files: {
                  teamMd: buildTeamMd({
                    name: `Broken Team ${unique}`,
                    description: "team with missing local agent",
                    category: "sync",
                    instructions: "broken local team instructions",
                  }),
                  teamConfigJson: JSON.stringify({
                    coordinatorMemberName: "leader",
                    members: [
                      {
                        memberName: "leader",
                        ref: missingLocalAgentId,
                        refType: "agent",
                        refScope: "team_local",
                      },
                    ],
                    avatarUrl: null,
                  }),
                },
                localAgents: [],
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

    const exportQuery = `
      query ExportSyncBundle($input: ExportNodeSyncBundleInput!) {
        exportSyncBundle(input: $input) {
          watermark
        }
      }
    `;

    const result = await runGraphql(exportQuery, {
      input: {
        scope: ["AGENT_TEAM_DEFINITION"],
        selection: {
          agentTeamDefinitionIds: [teamId],
          includeDependencies: false,
        },
      },
    });

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain(
      `Team 'Broken Team ${unique}' references missing local agent '${missingLocalAgentId}'.`,
    );
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

  it("exports and imports team file payloads with files.teamMd/teamConfigJson", async () => {
    const unique = uniqueId("sync_team");
    const teamId = `team_${unique}`;
    const agentId = `agent_${unique}`;

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
        summary: { processed: number; created: number; updated: number };
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
                  agentMd: buildAgentMd({
                    name: `Agent ${unique}`,
                    role: "assistant",
                    description: "team sync dependency agent",
                    instructions: "dependency agent instructions",
                  }),
                  agentConfigJson: JSON.stringify({
                    toolNames: [],
                    skillNames: [],
                    inputProcessorNames: [],
                    llmResponseProcessorNames: [],
                    systemPromptProcessorNames: [],
                    toolExecutionResultProcessorNames: [],
                    toolInvocationPreprocessorNames: [],
                    lifecycleProcessorNames: [],
                    avatarUrl: null,
                  }),
                },
              },
            ],
            agent_team_definition: [
              {
                teamId,
                files: {
                  teamMd: buildTeamMd({
                    name: `Team ${unique}`,
                    description: "team sync import",
                    category: "sync",
                    instructions: "team sync instructions",
                  }),
                  teamConfigJson: JSON.stringify({
                    coordinatorMemberName: "leader",
                    members: [
                      { memberName: "leader", ref: agentId, refType: "agent", refScope: "shared" },
                    ],
                    avatarUrl: null,
                  }),
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
    expect(importResult.importSyncBundle.summary.created).toBe(2);

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
        scope: ["AGENT_TEAM_DEFINITION"],
        selection: {
          agentTeamDefinitionIds: [teamId],
          includeDependencies: true,
        },
      },
    });

    const teamEntities = exported.exportSyncBundle.entities.agent_team_definition ?? [];
    expect(teamEntities).toHaveLength(1);
    expect(teamEntities[0]?.teamId).toBe(teamId);
    expect(teamEntities[0]).not.toHaveProperty("team");

    const files = teamEntities[0]?.files as
      | { teamMd?: string; teamConfigJson?: string }
      | undefined;
    expect(typeof files?.teamMd).toBe("string");
    expect(typeof files?.teamConfigJson).toBe("string");
    expect(files?.teamMd).toContain("team sync instructions");
  });
});
