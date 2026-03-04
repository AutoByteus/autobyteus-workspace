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
    source: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("supports prompt list/query/create/revision/activate/update/delete flows", async () => {
    const unique = `prompt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const category = `Category_${unique}`;
    const name = `Prompt_${unique}`;

    const created = await execGraphql<{
      createPrompt: {
        id: string;
        name: string;
        category: string;
        promptContent: string;
        isActive: boolean;
        version: number;
      };
    }>(
      `
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
      `,
      {
        input: {
          name,
          category,
          promptContent: "Hello world",
        },
      },
    );

    expect(created.createPrompt.name).toBe(name);
    expect(created.createPrompt.category).toBe(category);
    expect(created.createPrompt.promptContent).toBe("Hello world");
    expect(created.createPrompt.isActive).toBe(true);
    expect(created.createPrompt.version).toBe(1);

    const listed = await execGraphql<{
      prompts: Array<{ id: string; name: string; category: string }>;
    }>(
      `
        query ListPrompts {
          prompts {
            id
            name
            category
          }
        }
      `,
    );
    expect(
      listed.prompts.some(
        (prompt) =>
          prompt.id === created.createPrompt.id &&
          prompt.name === name &&
          prompt.category === category,
      ),
    ).toBe(true);

    const revised = await execGraphql<{
      addNewPromptRevision: { id: string; version: number; isActive: boolean; promptContent: string };
    }>(
      `
        mutation AddRevision($input: AddNewPromptRevisionInput!) {
          addNewPromptRevision(input: $input) {
            id
            version
            isActive
            promptContent
          }
        }
      `,
      {
        input: {
          id: created.createPrompt.id,
          newPromptContent: "Hello world v2",
        },
      },
    );

    expect(revised.addNewPromptRevision.version).toBeGreaterThan(1);
    expect(revised.addNewPromptRevision.isActive).toBe(false);
    expect(revised.addNewPromptRevision.promptContent).toBe("Hello world v2");

    const activated = await execGraphql<{
      markActivePrompt: { id: string; isActive: boolean };
    }>(
      `
        mutation MarkActive($input: MarkActivePromptInput!) {
          markActivePrompt(input: $input) {
            id
            isActive
          }
        }
      `,
      { input: { id: revised.addNewPromptRevision.id } },
    );
    expect(activated.markActivePrompt.id).toBe(revised.addNewPromptRevision.id);
    expect(activated.markActivePrompt.isActive).toBe(true);

    const categories = await execGraphql<{
      availablePromptCategories: Array<{ category: string; names: string[] }>;
    }>(
      `
        query Categories {
          availablePromptCategories {
            category
            names
          }
        }
      `,
    );
    const categoryRow = categories.availablePromptCategories.find((entry) => entry.category === category);
    expect(categoryRow?.names.includes(name)).toBe(true);

    const detailsByName = await execGraphql<{
      promptDetailsByNameAndCategory: { promptContent: string } | null;
    }>(
      `
        query DetailsByName($category: String!, $name: String!) {
          promptDetailsByNameAndCategory(category: $category, name: $name) {
            promptContent
          }
        }
      `,
      { category, name },
    );
    expect(detailsByName.promptDetailsByNameAndCategory?.promptContent).toBe("Hello world v2");

    const updated = await execGraphql<{
      updatePrompt: { id: string; promptContent: string };
    }>(
      `
        mutation UpdatePrompt($input: UpdatePromptInput!) {
          updatePrompt(input: $input) {
            id
            promptContent
          }
        }
      `,
      {
        input: {
          id: revised.addNewPromptRevision.id,
          promptContent: "Hello world v2 updated",
        },
      },
    );
    expect(updated.updatePrompt.id).toBe(revised.addNewPromptRevision.id);
    expect(updated.updatePrompt.promptContent).toBe("Hello world v2 updated");

    const details = await execGraphql<{
      promptDetails: { id: string; promptContent: string } | null;
    }>(
      `
        query Details($id: String!) {
          promptDetails(id: $id) {
            id
            promptContent
          }
        }
      `,
      { id: revised.addNewPromptRevision.id },
    );
    expect(details.promptDetails?.id).toBe(revised.addNewPromptRevision.id);
    expect(details.promptDetails?.promptContent).toBe("Hello world v2 updated");

    const deleted = await execGraphql<{
      deletePrompt: { success: boolean; message: string };
    }>(
      `
        mutation DeletePrompt($input: DeletePromptInput!) {
          deletePrompt(input: $input) {
            success
            message
          }
        }
      `,
      { input: { id: revised.addNewPromptRevision.id } },
    );
    expect(deleted.deletePrompt.success).toBe(true);

    const afterDelete = await execGraphql<{
      promptDetails: { id: string; promptContent: string } | null;
    }>(
      `
        query DetailsAfterDelete($id: String!) {
          promptDetails(id: $id) {
            id
            promptContent
          }
        }
      `,
      { id: revised.addNewPromptRevision.id },
    );
    expect(afterDelete.promptDetails).toBeNull();
  });
});
