import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const workspaceManager = getWorkspaceManager();

describe("Workspaces GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let initialIds: Set<string>;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  beforeEach(() => {
    initialIds = new Set(workspaceManager.getAllWorkspaces().map((ws) => ws.workspaceId));
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-workspace-"));
    fs.mkdirSync(path.join(tempRoot, "test_ws_root"), { recursive: true });
  });

  const closeWithTimeout = async (workspace: { close: () => Promise<void> }) => {
    await Promise.race([
      workspace.close(),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  };

  afterEach(async () => {
    const workspaces = workspaceManager.getAllWorkspaces();
    for (const workspace of workspaces) {
      if (!initialIds.has(workspace.workspaceId)) {
        await closeWithTimeout(workspace);
        (workspaceManager as any).activeWorkspaces?.delete?.(workspace.workspaceId);
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }, 20000);

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

  it("creates and lists workspaces", async () => {
    const rootPath = path.join(tempRoot, "test_ws_root");

    const createMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
          name
          absolutePath
        }
      }
    `;

    const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          name
          absolutePath
        }
      }
    `;

    const created = await execGraphql<{
      createWorkspace: { workspaceId: string; name: string; absolutePath: string | null };
    }>(createMutation, { input: { rootPath } });

    expect(created.createWorkspace.workspaceId).toBeTruthy();
    expect(created.createWorkspace.absolutePath).toBe(rootPath);

    const newId = created.createWorkspace.workspaceId;
    const listResult = await execGraphql<{
      workspaces: Array<{ workspaceId: string; absolutePath: string | null }>;
    }>(listQuery);

    const found = listResult.workspaces.find((ws) => ws.workspaceId === newId);
    expect(found).toBeTruthy();
    expect(found?.absolutePath).toBe(rootPath);
  });
});
