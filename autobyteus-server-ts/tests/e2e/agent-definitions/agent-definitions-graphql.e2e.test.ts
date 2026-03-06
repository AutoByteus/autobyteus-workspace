import "reflect-metadata";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe("Agent definitions GraphQL e2e", () => {
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

  const runGraphql = async (query: string, variables?: Record<string, unknown>) =>
    graphql({
      schema,
      source: query,
      variableValues: variables,
    });

  it("creates, updates, duplicates, lists templates, and deletes agent definitions", async () => {
    const unique = uniqueId("agent_def");
    const dataDir = appConfigProvider.config.getAppDataDir();

    const createMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
          role
          description
          category
          instructions
          avatarUrl
          toolNames
          skillNames
        }
      }
    `;

    const created = await execGraphql<{
      createAgentDefinition: {
        id: string;
        name: string;
        role: string | null;
        description: string;
        category: string | null;
        instructions: string;
        avatarUrl: string | null;
        toolNames: string[];
        skillNames: string[];
      };
    }>(createMutation, {
      input: {
        name: `agent_${unique}`,
        role: "assistant",
        description: "Agent definition for e2e",
        category: "software-engineering",
        instructions: "You are an md-centric e2e validation agent.",
        avatarUrl: "http://localhost:8000/rest/files/images/e2e-avatar.png",
        toolNames: ["tool_a", "tool_b"],
        skillNames: ["skill_one"],
      },
    });

    cleanupPaths.add(path.join(dataDir, "agents", created.createAgentDefinition.id));

    expect(created.createAgentDefinition.name).toBe(`agent_${unique}`);
    expect(created.createAgentDefinition.category).toBe("software-engineering");
    expect(created.createAgentDefinition.instructions).toContain("md-centric e2e validation");
    expect(created.createAgentDefinition.toolNames).toEqual(["tool_a", "tool_b"]);

    const createdAgentDir = path.join(dataDir, "agents", created.createAgentDefinition.id);
    const [agentMdRaw, agentConfigRaw, agentFiles] = await Promise.all([
      fs.readFile(path.join(createdAgentDir, "agent.md"), "utf-8"),
      fs.readFile(path.join(createdAgentDir, "agent-config.json"), "utf-8"),
      fs.readdir(createdAgentDir),
    ]);

    expect(agentMdRaw).toContain(`name: agent_${unique}`);
    expect(agentMdRaw).toContain("category: software-engineering");
    expect(agentMdRaw).toContain("You are an md-centric e2e validation agent.");
    expect(JSON.parse(agentConfigRaw)).toMatchObject({
      toolNames: ["tool_a", "tool_b"],
      skillNames: ["skill_one"],
    });
    expect(agentFiles.some((fileName) => /^prompt-v\d+\.md$/.test(fileName))).toBe(false);

    const updateMutation = `
      mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
        updateAgentDefinition(input: $input) {
          id
          description
          category
          instructions
          avatarUrl
          skillNames
        }
      }
    `;
    const updated = await execGraphql<{
      updateAgentDefinition: {
        id: string;
        description: string;
        category: string | null;
        instructions: string;
        avatarUrl: string | null;
        skillNames: string[];
      };
    }>(updateMutation, {
      input: {
        id: created.createAgentDefinition.id,
        description: "Updated description",
        category: "platform",
        instructions: "You are the updated md-centric e2e validation agent.",
        avatarUrl: "",
        skillNames: ["skill_one", "skill_two"],
      },
    });

    expect(updated.updateAgentDefinition.description).toBe("Updated description");
    expect(updated.updateAgentDefinition.category).toBe("platform");
    expect(updated.updateAgentDefinition.avatarUrl).toBeNull();
    expect(updated.updateAgentDefinition.skillNames).toContain("skill_two");

    const duplicateMutation = `
      mutation DuplicateAgentDefinition($input: DuplicateAgentDefinitionInput!) {
        duplicateAgentDefinition(input: $input) {
          id
          name
          description
          category
          instructions
          toolNames
          skillNames
        }
      }
    `;
    const duplicated = await execGraphql<{
      duplicateAgentDefinition: {
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
        toolNames: string[];
        skillNames: string[];
      };
    }>(duplicateMutation, {
      input: {
        sourceId: created.createAgentDefinition.id,
        newName: `agent_${unique}_copy`,
      },
    });

    cleanupPaths.add(path.join(dataDir, "agents", duplicated.duplicateAgentDefinition.id));

    const duplicatedDir = path.join(dataDir, "agents", duplicated.duplicateAgentDefinition.id);
    const [sourceConfigRaw, duplicatedConfigRaw, duplicatedMdRaw] = await Promise.all([
      fs.readFile(path.join(createdAgentDir, "agent-config.json"), "utf-8"),
      fs.readFile(path.join(duplicatedDir, "agent-config.json"), "utf-8"),
      fs.readFile(path.join(duplicatedDir, "agent.md"), "utf-8"),
    ]);

    expect(JSON.parse(duplicatedConfigRaw)).toEqual(JSON.parse(sourceConfigRaw));
    expect(duplicatedMdRaw).toContain(`name: agent_${unique}_copy`);
    expect(duplicatedMdRaw).toContain("You are the updated md-centric e2e validation agent.");

    const templateId = `_template_${unique}`;
    const templateDir = path.join(dataDir, "agents", templateId);
    cleanupPaths.add(templateDir);
    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(
      path.join(templateDir, "agent.md"),
      [
        "---",
        "name: Template Agent",
        "description: Template description",
        "category: template",
        "---",
        "",
        "Template instructions",
      ].join("\n"),
      "utf-8",
    );
    await fs.writeFile(
      path.join(templateDir, "agent-config.json"),
      JSON.stringify({ toolNames: [], skillNames: [] }, null, 2),
      "utf-8",
    );

    const listQuery = `
      query AgentLists {
        agentDefinitions {
          id
        }
        agentTemplates {
          id
          name
          description
          category
          instructions
        }
      }
    `;

    const listed = await execGraphql<{
      agentDefinitions: Array<{ id: string }>;
      agentTemplates: Array<{
        id: string;
        name: string;
        description: string;
        category: string | null;
        instructions: string;
      }>;
    }>(listQuery);

    expect(listed.agentDefinitions.some((entry) => entry.id === templateId)).toBe(false);
    const template = listed.agentTemplates.find((entry) => entry.id === templateId);
    expect(template).toBeDefined();
    expect(template?.name).toBe("Template Agent");
    expect(template?.instructions).toBe("Template instructions");

    const deleteMutation = `
      mutation DeleteAgentDefinition($id: String!) {
        deleteAgentDefinition(id: $id) {
          success
        }
      }
    `;

    await execGraphql(deleteMutation, { id: duplicated.duplicateAgentDefinition.id });
    const deleted = await execGraphql<{ deleteAgentDefinition: { success: boolean } }>(
      deleteMutation,
      { id: created.createAgentDefinition.id },
    );
    expect(deleted.deleteAgentDefinition.success).toBe(true);
  });

  it("returns GraphQL validation error for removed prompt query", async () => {
    const result = await runGraphql(`query RemovedPromptApi { prompts { id } }`);
    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain('Cannot query field "prompts"');
  });

  it("exposes md-centric agent GraphQL/output and input contracts", async () => {
    const introspection = await execGraphql<{
      agentType: {
        fields: Array<{
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType?: { kind: string; name: string | null } | null;
          };
        }>;
      } | null;
      createInput: {
        inputFields: Array<{
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType?: { kind: string; name: string | null } | null;
          };
        }>;
      } | null;
      updateInput: {
        inputFields: Array<{
          name: string;
          type: {
            kind: string;
            name: string | null;
            ofType?: { kind: string; name: string | null } | null;
          };
        }>;
      } | null;
    }>(`
      query AgentSchemaContracts {
        agentType: __type(name: "AgentDefinition") {
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
        createInput: __type(name: "CreateAgentDefinitionInput") {
          inputFields {
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
        updateInput: __type(name: "UpdateAgentDefinitionInput") {
          inputFields {
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

    const outputFields = introspection.agentType?.fields ?? [];
    const createFields = introspection.createInput?.inputFields ?? [];
    const updateFields = introspection.updateInput?.inputFields ?? [];

    const instructionsOutput = outputFields.find((field) => field.name === "instructions");
    const categoryOutput = outputFields.find((field) => field.name === "category");
    const roleOutput = outputFields.find((field) => field.name === "role");

    expect(instructionsOutput?.type.kind).toBe("NON_NULL");
    expect(instructionsOutput?.type.ofType?.name).toBe("String");
    expect(categoryOutput?.type.kind).toBe("SCALAR");
    expect(categoryOutput?.type.name).toBe("String");
    expect(roleOutput?.type.kind).toBe("SCALAR");
    expect(roleOutput?.type.name).toBe("String");
    expect(outputFields.some((field) => field.name === "activePromptVersion")).toBe(false);

    const createInstructions = createFields.find((field) => field.name === "instructions");
    const createCategory = createFields.find((field) => field.name === "category");
    expect(createInstructions?.type.kind).toBe("NON_NULL");
    expect(createInstructions?.type.ofType?.name).toBe("String");
    expect(createCategory?.type.kind).toBe("SCALAR");
    expect(createCategory?.type.name).toBe("String");
    expect(createFields.some((field) => field.name === "activePromptVersion")).toBe(false);

    const updateInstructions = updateFields.find((field) => field.name === "instructions");
    const updateCategory = updateFields.find((field) => field.name === "category");
    expect(updateInstructions?.type.kind).toBe("SCALAR");
    expect(updateInstructions?.type.name).toBe("String");
    expect(updateCategory?.type.kind).toBe("SCALAR");
    expect(updateCategory?.type.name).toBe("String");
    expect(updateFields.some((field) => field.name === "activePromptVersion")).toBe(false);
  });

  it("returns GraphQL validation error for removed activePromptVersion field", async () => {
    const result = await runGraphql(`
      query RemovedField {
        agentDefinitions {
          id
          activePromptVersion
        }
      }
    `);
    expect(result.errors?.length ?? 0).toBeGreaterThan(0);
    expect(result.errors?.[0]?.message).toContain('Cannot query field "activePromptVersion"');
  });

});
