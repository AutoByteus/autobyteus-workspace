import "reflect-metadata";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

describe("Prompts GraphQL e2e", () => {
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

  it("creates, updates, and deletes prompts", async () => {
    const unique = `prompt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const category = `Category_${unique}`;
    const promptName = `Prompt_${unique}`;

    const createMutation = `
      mutation CreatePrompt($input: CreatePromptInput!) {
        createPrompt(input: $input) {
          id
          name
          category
          promptContent
          isActive
          version
        }
      }
    `;

    const created = await execGraphql<{
      createPrompt: {
        id: string;
        name: string;
        category: string;
        promptContent: string;
        isActive: boolean;
        version: number;
      };
    }>(createMutation, {
      input: {
        name: promptName,
        category,
        promptContent: "Hello world",
        description: "Prompt for e2e",
        suitableForModels: "default",
      },
    });

    expect(created.createPrompt.name).toBe(promptName);
    expect(created.createPrompt.category).toBe(category);
    expect(created.createPrompt.isActive).toBe(true);
    expect(created.createPrompt.version).toBe(1);

    const addRevisionMutation = `
      mutation AddRevision($input: AddNewPromptRevisionInput!) {
        addNewPromptRevision(input: $input) {
          id
          version
          isActive
          promptContent
        }
      }
    `;

    const revised = await execGraphql<{
      addNewPromptRevision: {
        id: string;
        version: number;
        isActive: boolean;
        promptContent: string;
      };
    }>(addRevisionMutation, {
      input: {
        id: created.createPrompt.id,
        newPromptContent: "Hello world v2",
      },
    });

    expect(revised.addNewPromptRevision.version).toBeGreaterThan(1);
    expect(revised.addNewPromptRevision.isActive).toBe(false);

    const markActiveMutation = `
      mutation MarkActive($input: MarkActivePromptInput!) {
        markActivePrompt(input: $input) {
          id
          isActive
        }
      }
    `;

    const activated = await execGraphql<{
      markActivePrompt: { id: string; isActive: boolean };
    }>(markActiveMutation, { input: { id: revised.addNewPromptRevision.id } });
    expect(activated.markActivePrompt.isActive).toBe(true);

    const categoriesQuery = `
      query Categories {
        availablePromptCategories {
          category
          names
        }
      }
    `;
    const categories = await execGraphql<{
      availablePromptCategories: Array<{ category: string; names: string[] }>;
    }>(categoriesQuery);
    const match = categories.availablePromptCategories.find((entry) => entry.category === category);
    expect(match?.names.includes(promptName)).toBe(true);

    const detailsByNameQuery = `
      query DetailsByName($category: String!, $name: String!) {
        promptDetailsByNameAndCategory(category: $category, name: $name) {
          promptContent
          description
        }
      }
    `;
    const detailsByName = await execGraphql<{
      promptDetailsByNameAndCategory: { promptContent: string; description: string | null } | null;
    }>(detailsByNameQuery, { category, name: promptName });
    expect(detailsByName.promptDetailsByNameAndCategory?.promptContent).toBe("Hello world v2");

    const updateMutation = `
      mutation UpdatePrompt($input: UpdatePromptInput!) {
        updatePrompt(input: $input) {
          id
          promptContent
        }
      }
    `;
    const updated = await execGraphql<{ updatePrompt: { id: string; promptContent: string } }>(
      updateMutation,
      {
        input: {
          id: revised.addNewPromptRevision.id,
          promptContent: "Hello world v2 updated",
        },
      },
    );
    expect(updated.updatePrompt.promptContent).toBe("Hello world v2 updated");

    const detailsQuery = `
      query Details($id: String!) {
        promptDetails(id: $id) {
          id
          promptContent
        }
      }
    `;
    const details = await execGraphql<{ promptDetails: { id: string; promptContent: string } | null }>(
      detailsQuery,
      { id: revised.addNewPromptRevision.id },
    );
    expect(details.promptDetails?.promptContent).toBe("Hello world v2 updated");

    const deleteMutation = `
      mutation DeletePrompt($input: DeletePromptInput!) {
        deletePrompt(input: $input) {
          success
          message
        }
      }
    `;
    const deleteResult = await execGraphql<{ deletePrompt: { success: boolean } }>(
      deleteMutation,
      { input: { id: revised.addNewPromptRevision.id } },
    );
    expect(deleteResult.deletePrompt.success).toBe(true);

    const deletedDetails = await execGraphql<{
      promptDetails: { id: string; promptContent: string } | null;
    }>(detailsQuery, { id: revised.addNewPromptRevision.id });
    expect(deletedDetails.promptDetails).toBeNull();
  });
});
