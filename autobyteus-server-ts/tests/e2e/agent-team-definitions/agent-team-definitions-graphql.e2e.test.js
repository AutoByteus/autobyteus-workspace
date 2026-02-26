import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
describe("Agent team definitions GraphQL e2e", () => {
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
    it("creates, updates, and deletes agent team definitions", async () => {
        const unique = `team_def_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const teamName = `team_${unique}`;
        const createMutation = `
      mutation CreateTeam($input: CreateAgentTeamDefinitionInput!) {
        createAgentTeamDefinition(input: $input) {
          id
          name
          description
          role
          coordinatorMemberName
          nodes {
            memberName
            referenceId
            referenceType
          }
        }
      }
    `;
        const created = await execGraphql(createMutation, {
            input: {
                name: teamName,
                description: "Team definition for e2e",
                role: "Coordinator",
                coordinatorMemberName: "leader",
                nodes: [
                    {
                        memberName: "leader",
                        referenceId: "agent-1",
                        referenceType: "AGENT",
                    },
                    {
                        memberName: "helper",
                        referenceId: "agent-2",
                        referenceType: "AGENT",
                    },
                ],
            },
        });
        expect(created.createAgentTeamDefinition.name).toBe(teamName);
        expect(created.createAgentTeamDefinition.nodes.length).toBe(2);
        const updateMutation = `
      mutation UpdateTeam($input: UpdateAgentTeamDefinitionInput!) {
        updateAgentTeamDefinition(input: $input) {
          id
          description
          role
        }
      }
    `;
        const updated = await execGraphql(updateMutation, {
            input: {
                id: created.createAgentTeamDefinition.id,
                description: "Updated team description",
                role: "UpdatedRole",
            },
        });
        expect(updated.updateAgentTeamDefinition.description).toBe("Updated team description");
        expect(updated.updateAgentTeamDefinition.role).toBe("UpdatedRole");
        const query = `
      query GetTeam($id: String!) {
        agentTeamDefinition(id: $id) {
          id
          name
        }
      }
    `;
        const fetched = await execGraphql(query, { id: created.createAgentTeamDefinition.id });
        expect(fetched.agentTeamDefinition?.id).toBe(created.createAgentTeamDefinition.id);
        const deleteMutation = `
      mutation DeleteTeam($id: String!) {
        deleteAgentTeamDefinition(id: $id) {
          success
          message
        }
      }
    `;
        const deleted = await execGraphql(deleteMutation, { id: created.createAgentTeamDefinition.id });
        expect(deleted.deleteAgentTeamDefinition.success).toBe(true);
        const afterDelete = await execGraphql(query, { id: created.createAgentTeamDefinition.id });
        expect(afterDelete.agentTeamDefinition).toBeNull();
    });
});
