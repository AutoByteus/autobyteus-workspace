import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
describe("Agent definitions GraphQL e2e", () => {
    let schema;
    let graphql;
    beforeAll(async () => {
        schema = await buildGraphqlSchema();
        const require = createRequire(import.meta.url);
        const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
        const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
        const graphqlModule = await import(graphqlPath);
        graphql = graphqlModule.graphql;
    });
    const execGraphql = async (query, variables) => {
        const result = await graphql({
            schema,
            source: query,
            variableValues: variables,
        });
        if (result.errors?.length) {
            throw result.errors[0];
        }
        return result.data;
    };
    it("creates, updates, and deletes agent definitions", async () => {
        const unique = `agent_def_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const promptName = `Prompt_${unique}`;
        const promptCategory = `Category_${unique}`;
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
                category: promptCategory,
                promptContent: "System prompt content",
                description: "Prompt for agent definition test",
            },
        });
        const createMutation = `
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) {
          id
          name
          role
          description
          toolNames
          systemPromptCategory
          systemPromptName
          prompts {
            id
            name
            category
          }
        }
      }
    `;
        const created = await execGraphql(createMutation, {
            input: {
                name: `agent_${unique}`,
                role: "assistant",
                description: "Agent definition for e2e",
                systemPromptCategory: promptCategory,
                systemPromptName: promptName,
                toolNames: ["tool_a", "tool_b"],
                skillNames: ["skill_one"],
            },
        });
        expect(created.createAgentDefinition.name).toBe(`agent_${unique}`);
        expect(created.createAgentDefinition.systemPromptCategory).toBe(promptCategory);
        expect(created.createAgentDefinition.systemPromptName).toBe(promptName);
        expect(created.createAgentDefinition.prompts.length).toBeGreaterThan(0);
        expect(created.createAgentDefinition.prompts.some((prompt) => prompt.name === promptName && prompt.category === promptCategory)).toBe(true);
        const updateMutation = `
      mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
        updateAgentDefinition(input: $input) {
          id
          description
          skillNames
        }
      }
    `;
        const updated = await execGraphql(updateMutation, {
            input: {
                id: created.createAgentDefinition.id,
                description: "Updated description",
                skillNames: ["skill_one", "skill_two"],
            },
        });
        expect(updated.updateAgentDefinition.description).toBe("Updated description");
        expect(updated.updateAgentDefinition.skillNames).toContain("skill_two");
        const query = `
      query AgentDefinition($id: String!) {
        agentDefinition(id: $id) {
          id
          name
        }
      }
    `;
        const fetched = await execGraphql(query, { id: created.createAgentDefinition.id });
        expect(fetched.agentDefinition?.id).toBe(created.createAgentDefinition.id);
        const deleteMutation = `
      mutation DeleteAgentDefinition($id: String!) {
        deleteAgentDefinition(id: $id) {
          success
          message
        }
      }
    `;
        const deleted = await execGraphql(deleteMutation, { id: created.createAgentDefinition.id });
        expect(deleted.deleteAgentDefinition.success).toBe(true);
        const afterDelete = await execGraphql(query, { id: created.createAgentDefinition.id });
        expect(afterDelete.agentDefinition).toBeNull();
    });
});
