import "reflect-metadata";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("Agent team definitions GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const cleanupPaths = new Set<string>();
  const emptyApplicationBundleProvider = {
    listBundles: async () => [],
    validatePackageRoot: async () => undefined,
    buildApplicationOwnedAgentSources: () => [],
    buildApplicationOwnedTeamSources: () => [],
  };

  beforeAll(async () => {
    ApplicationBundleService.resetInstance();
    ApplicationBundleService.getInstance({
      provider: emptyApplicationBundleProvider,
      builtInMaterializer: {
        ensureMaterialized: async () => undefined,
        getBundledSourceRootPath: () => appConfigProvider.config.getAppRootDir(),
      },
    });
    (AgentTeamDefinitionService as unknown as { instance: AgentTeamDefinitionService | null }).instance = null;
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
    ApplicationBundleService.resetInstance();
    ApplicationBundleService.getInstance({
      provider: emptyApplicationBundleProvider,
      builtInMaterializer: {
        ensureMaterialized: async () => undefined,
        getBundledSourceRootPath: () => appConfigProvider.config.getAppRootDir(),
      },
    });
    (AgentTeamDefinitionService as unknown as { instance: AgentTeamDefinitionService | null }).instance = null;
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

  it("creates, updates, lists templates, and deletes agent team definitions", async () => {
    const unique = uniqueId("team_def");
    const dataDir = appConfigProvider.config.getAppDataDir();

    const createMutation = `
      mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
          description
          category
          instructions
          avatarUrl
          coordinatorMemberName
          defaultLaunchConfig {
            llmModelIdentifier
            runtimeKind
            llmConfig
          }
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;

    const created = await execGraphql<{
      createAgentTeamDefinition: {
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
        avatarUrl: string | null;
        coordinatorMemberName: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(createMutation, {
      input: {
        name: `team_${unique}`,
        description: "Team definition for e2e",
        category: "software-engineering",
        instructions: "You coordinate the md-centric team.",
        avatarUrl: "http://localhost:8000/rest/files/images/e2e-team-avatar.png",
        coordinatorMemberName: "leader",
        defaultLaunchConfig: {
          runtimeKind: "autobyteus",
          llmModelIdentifier: "gpt-5.4-mini",
          llmConfig: {
            reasoning_effort: "medium",
          },
        },
        nodes: [
          {
            memberName: "leader",
            ref: "agent-1",
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "helper",
            ref: "team-2",
            refType: "AGENT_TEAM",
          },
        ],
      },
    });

    cleanupPaths.add(path.join(dataDir, "agent-teams", created.createAgentTeamDefinition.id));

    expect(created.createAgentTeamDefinition.category).toBe("software-engineering");
    expect(created.createAgentTeamDefinition.instructions).toContain("md-centric team");
    expect(created.createAgentTeamDefinition.defaultLaunchConfig).toEqual({
      runtimeKind: "autobyteus",
      llmModelIdentifier: "gpt-5.4-mini",
      llmConfig: {
        reasoning_effort: "medium",
      },
    });
    expect(created.createAgentTeamDefinition.nodes).toHaveLength(2);
    expect(created.createAgentTeamDefinition.nodes[0]?.ref).toBe("agent-1");

    const teamDir = path.join(dataDir, "agent-teams", created.createAgentTeamDefinition.id);
    const [teamMdRaw, teamConfigRaw] = await Promise.all([
      fs.readFile(path.join(teamDir, "team.md"), "utf-8"),
      fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ]);

    expect(teamMdRaw).toContain(`name: team_${unique}`);
    expect(teamMdRaw).toContain("category: software-engineering");
    expect(teamMdRaw).toContain("You coordinate the md-centric team.");
    expect(JSON.parse(teamConfigRaw)).toMatchObject({
      coordinatorMemberName: "leader",
      defaultLaunchConfig: {
        runtimeKind: "autobyteus",
        llmModelIdentifier: "gpt-5.4-mini",
        llmConfig: {
          reasoning_effort: "medium",
        },
      },
      members: [
        { memberName: "leader", ref: "agent-1", refType: "agent", refScope: "shared" },
        { memberName: "helper", ref: "team-2", refType: "agent_team" },
      ],
    });

    const updateMutation = `
      mutation UpdateTeam($input: UpdateAgentTeamDefinitionInput!) {
        updateAgentTeamDefinition(input: $input) {
          id
          description
          category
          instructions
          avatarUrl
          coordinatorMemberName
          defaultLaunchConfig {
            llmModelIdentifier
            runtimeKind
            llmConfig
          }
          nodes {
            memberName
            ref
            refType
            refScope
          }
        }
      }
    `;
    const updated = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        description: string;
        category: string | null;
        instructions: string;
        avatarUrl: string | null;
        coordinatorMemberName: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentTeamDefinition.id,
        description: "Updated team description",
        category: "platform",
        instructions: "You coordinate the updated md-centric team.",
        avatarUrl: "",
        coordinatorMemberName: "helper",
        defaultLaunchConfig: {
          runtimeKind: "codex",
          llmModelIdentifier: "gpt-5.4",
          llmConfig: {
            reasoning_effort: "high",
          },
        },
        nodes: [
          {
            memberName: "helper",
            ref: "agent-2",
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "subteam",
            ref: "team-3",
            refType: "AGENT_TEAM",
          },
        ],
      },
    });

    expect(updated.updateAgentTeamDefinition.description).toBe("Updated team description");
    expect(updated.updateAgentTeamDefinition.category).toBe("platform");
    expect(updated.updateAgentTeamDefinition.avatarUrl).toBeNull();
    expect(updated.updateAgentTeamDefinition.coordinatorMemberName).toBe("helper");
    expect(updated.updateAgentTeamDefinition.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });
    expect(updated.updateAgentTeamDefinition.nodes[1]?.refType).toBe("AGENT_TEAM");

    const updatedConfigAfterWrite = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      coordinatorMemberName: string;
      defaultLaunchConfig: Record<string, unknown> | null;
      members: Array<{
        memberName: string;
        ref: string;
        refType: "agent" | "agent_team";
        refScope?: "shared" | "team_local";
      }>;
    };

    expect(updatedConfigAfterWrite.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });

    const preserved = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        description: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentTeamDefinition.id,
        description: "Updated without clearing launch defaults",
      },
    });

    expect(preserved.updateAgentTeamDefinition.description).toBe(
      "Updated without clearing launch defaults",
    );
    expect(preserved.updateAgentTeamDefinition.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });
    const preservedConfigAfterWrite = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      defaultLaunchConfig?: Record<string, unknown> | null;
    };
    expect(preservedConfigAfterWrite.defaultLaunchConfig).toEqual({
      runtimeKind: "codex",
      llmModelIdentifier: "gpt-5.4",
      llmConfig: {
        reasoning_effort: "high",
      },
    });

    const cleared = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        defaultLaunchConfig: {
          llmModelIdentifier: string | null;
          runtimeKind: string | null;
          llmConfig: Record<string, unknown> | null;
        } | null;
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentTeamDefinition.id,
        defaultLaunchConfig: null,
      },
    });

    expect(cleared.updateAgentTeamDefinition.defaultLaunchConfig).toBeNull();
    const clearedConfigAfterWrite = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      defaultLaunchConfig?: Record<string, unknown> | null;
    };
    expect(clearedConfigAfterWrite.defaultLaunchConfig).toBeNull();

    const templateId = `_template_${unique}`;
    const templateDir = path.join(dataDir, "agent-teams", templateId);
    cleanupPaths.add(templateDir);
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(
      path.join(templateDir, "team.md"),
      [
        "---",
        "name: Template Team",
        "description: Template team description",
        "category: template",
        "---",
        "",
        "Template team instructions",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(templateDir, "team-config.json"),
      JSON.stringify(
        {
          coordinatorMemberName: "lead",
          members: [
            { memberName: "lead", ref: "template-agent", refType: "agent", refScope: "shared" },
          ],
          avatarUrl: null,
        },
        null,
        2,
      ),
      "utf-8",
    );

    const listQuery = `
      query TeamLists {
        agentTeamDefinitions {
          id
        }
        agentTeamTemplates {
          id
          name
          description
          category
          instructions
        }
      }
    `;

    const listed = await execGraphql<{
      agentTeamDefinitions: Array<{ id: string }>;
      agentTeamTemplates: Array<{
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
      }>;
    }>(listQuery);

    expect(listed.agentTeamDefinitions.some((entry) => entry.id === templateId)).toBe(false);
    const template = listed.agentTeamTemplates.find((entry) => entry.id === templateId);
    expect(template).toBeDefined();
    expect(template?.name).toBe("Template Team");
    expect(template?.category).toBe("template");
    expect(template?.instructions).toBe("Template team instructions");

    const deleteMutation = `
      mutation DeleteTeam($id: String!) {
        deleteAgentTeamDefinition(id: $id) {
          success
          message
        }
      }
    `;
    const deleted = await execGraphql<{ deleteAgentTeamDefinition: { success: boolean } }>(
      deleteMutation,
      { id: created.createAgentTeamDefinition.id },
    );
    expect(deleted.deleteAgentTeamDefinition.success).toBe(true);

    const query = `
      query GetTeam($id: String!) {
        agentTeamDefinition(id: $id) {
          id
        }
      }
    `;
    const afterDelete = await execGraphql<{
      agentTeamDefinition: { id: string } | null;
    }>(query, { id: created.createAgentTeamDefinition.id });
    expect(afterDelete.agentTeamDefinition).toBeNull();
  });

  it("round-trips TEAM_LOCAL members through create, read, and update GraphQL flows", async () => {
    const unique = uniqueId("team_local_graphql");
    const dataDir = appConfigProvider.config.getAppDataDir();

    const createMutation = `
      mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
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

    const created = await execGraphql<{
      createAgentTeamDefinition: {
        id: string;
        name: string;
        coordinatorMemberName: string;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(createMutation, {
      input: {
        name: `team_local_${unique}`,
        description: "team-local persistence",
        instructions: "Use the team-local reviewer when coordinating work.",
        coordinatorMemberName: "local_reviewer",
        nodes: [
          {
            memberName: "local_reviewer",
            ref: "reviewer",
            refType: "AGENT",
            refScope: "TEAM_LOCAL",
          },
        ],
      },
    });

    const teamId = created.createAgentTeamDefinition.id;
    const teamDir = path.join(dataDir, "agent-teams", teamId);
    cleanupPaths.add(teamDir);

    expect(created.createAgentTeamDefinition.nodes).toEqual([
      {
        memberName: "local_reviewer",
        ref: "reviewer",
        refType: "AGENT",
        refScope: "TEAM_LOCAL",
      },
    ]);

    const createdConfig = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      coordinatorMemberName: string;
      members: Array<{
        memberName: string;
        ref: string;
        refType: "agent" | "agent_team";
        refScope?: "shared" | "team_local";
      }>;
    };

    expect(createdConfig).toMatchObject({
      coordinatorMemberName: "local_reviewer",
      members: [
        {
          memberName: "local_reviewer",
          ref: "reviewer",
          refType: "agent",
          refScope: "team_local",
        },
      ],
    });

    const getQuery = `
      query TeamById($id: String!) {
        agentTeamDefinition(id: $id) {
          id
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

    const fetched = await execGraphql<{
      agentTeamDefinition: {
        id: string;
        coordinatorMemberName: string;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      } | null;
    }>(getQuery, { id: teamId });

    expect(fetched.agentTeamDefinition?.nodes).toEqual([
      {
        memberName: "local_reviewer",
        ref: "reviewer",
        refType: "AGENT",
        refScope: "TEAM_LOCAL",
      },
    ]);

    const updateMutation = `
      mutation UpdateTeam($input: UpdateAgentTeamDefinitionInput!) {
        updateAgentTeamDefinition(input: $input) {
          id
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

    const updated = await execGraphql<{
      updateAgentTeamDefinition: {
        id: string;
        coordinatorMemberName: string;
        nodes: Array<{
          memberName: string;
          ref: string;
          refType: "AGENT" | "AGENT_TEAM";
          refScope?: "SHARED" | "TEAM_LOCAL" | null;
        }>;
      };
    }>(updateMutation, {
      input: {
        id: teamId,
        coordinatorMemberName: "shared_lead",
        nodes: [
          {
            memberName: "shared_lead",
            ref: "agent-1",
            refType: "AGENT",
            refScope: "SHARED",
          },
          {
            memberName: "local_reviewer",
            ref: "reviewer_v2",
            refType: "AGENT",
            refScope: "TEAM_LOCAL",
          },
        ],
      },
    });

    expect(updated.updateAgentTeamDefinition.coordinatorMemberName).toBe("shared_lead");
    expect(updated.updateAgentTeamDefinition.nodes).toEqual([
      {
        memberName: "shared_lead",
        ref: "agent-1",
        refType: "AGENT",
        refScope: "SHARED",
      },
      {
        memberName: "local_reviewer",
        ref: "reviewer_v2",
        refType: "AGENT",
        refScope: "TEAM_LOCAL",
      },
    ]);

    const updatedConfig = JSON.parse(
      await fs.readFile(path.join(teamDir, "team-config.json"), "utf-8"),
    ) as {
      coordinatorMemberName: string;
      members: Array<{
        memberName: string;
        ref: string;
        refType: "agent" | "agent_team";
        refScope?: "shared" | "team_local";
      }>;
    };

    expect(updatedConfig).toMatchObject({
      coordinatorMemberName: "shared_lead",
      members: [
        {
          memberName: "shared_lead",
          ref: "agent-1",
          refType: "agent",
          refScope: "shared",
        },
        {
          memberName: "local_reviewer",
          ref: "reviewer_v2",
          refType: "agent",
          refScope: "team_local",
        },
      ],
    });
  });

  it("exposes md-centric team GraphQL output contract", async () => {
    const introspection = await execGraphql<{
      teamType: {
        fields: Array<{
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType?: { kind: string; name: string | null } | null;
          };
        }>;
      } | null;
    }>(`
      query TeamSchemaContract {
        teamType: __type(name: "AgentTeamDefinition") {
          fields {
            name
            type {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    `);

    const fields = introspection.teamType?.fields ?? [];
    const instructions = fields.find((field) => field.name === "instructions");
    const category = fields.find((field) => field.name === "category");
    const nodes = fields.find((field) => field.name === "nodes");
    const coordinator = fields.find((field) => field.name === "coordinatorMemberName");
    const role = fields.find((field) => field.name === "role");

    expect(instructions?.type.kind).toBe("NON_NULL");
    expect(instructions?.type.ofType?.name).toBe("String");
    expect(category?.type.kind).toBe("SCALAR");
    expect(category?.type.name).toBe("String");
    expect(nodes?.type.kind).toBe("NON_NULL");
    expect(nodes?.type.ofType?.kind).toBe("LIST");
    expect(coordinator?.type.kind).toBe("NON_NULL");
    expect(coordinator?.type.ofType?.name).toBe("String");

    // REQ-014 permits role removal or optional retention.
    if (role) {
      expect(role.type.kind).not.toBe("NON_NULL");
    }
  });

  it("returns validation error when coordinatorMemberName is not present in nodes", async () => {
    const unique = uniqueId("team_invalid_coordinator");
    const createMutation = `
      mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
        }
      }
    `;

    const result = await runGraphql(createMutation, {
      input: {
        name: `team_${unique}`,
        description: "invalid coordinator test",
        instructions: "team instructions",
        coordinatorMemberName: "missing_leader",
        nodes: [
          {
            memberName: "helper",
            ref: "agent-1",
            refType: "AGENT",
            refScope: "SHARED",
          },
        ],
      },
    });

    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain("Coordinator member name must match");
  });
});
