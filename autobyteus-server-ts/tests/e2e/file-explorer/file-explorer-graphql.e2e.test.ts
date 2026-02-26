import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { WorkspaceConfig } from "autobyteus-ts";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const workspaceManager = getWorkspaceManager();

const createTempRoot = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-file-explorer-"));

const closeWithTimeout = async (workspace: { close: () => Promise<void> }) => {
  await Promise.race([
    workspace.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
};

describe("File explorer GraphQL e2e", () => {
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
    tempRoot = createTempRoot();
  });

  afterEach(async () => {
    const workspaces = workspaceManager.getAllWorkspaces();
    for (const workspace of workspaces) {
      if (!initialIds.has(workspace.workspaceId)) {
        await closeWithTimeout(workspace);
        (workspaceManager as any).activeWorkspaces?.delete?.(workspace.workspaceId);
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
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

  it("returns immediate children for folderChildren", async () => {
    const folder1 = path.join(tempRoot, "folder1");
    const nestedFolder = path.join(folder1, "nested_folder");
    const folder2 = path.join(tempRoot, "folder2");

    fs.mkdirSync(nestedFolder, { recursive: true });
    fs.mkdirSync(folder2, { recursive: true });

    fs.writeFileSync(path.join(nestedFolder, "deep_file.txt"), "deep content");
    fs.writeFileSync(path.join(folder1, "file_in_folder1.txt"), "folder1 content");
    fs.writeFileSync(path.join(folder2, "another_file.txt"), "folder2 content");
    fs.writeFileSync(path.join(tempRoot, "root_file.txt"), "root content");

    const workspace = await workspaceManager.createWorkspace(
      new WorkspaceConfig({ rootPath: tempRoot }),
    );
    const fileExplorer = await workspace.getFileExplorer();
    await fileExplorer.buildWorkspaceDirectoryTree();

    const query = `
      query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
        folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
      }
    `;

    const data = await execGraphql<{ folderChildren: string }>(query, {
      workspaceId: workspace.workspaceId,
      folderPath: "folder1",
    });

    const payload = JSON.parse(data.folderChildren) as {
      name: string;
      is_file: boolean;
      children: Array<{ name: string; children: unknown[] }>;
    };

    expect(payload.name).toBe("folder1");
    expect(payload.is_file).toBe(false);

    const childNames = payload.children.map((child) => child.name);
    expect(childNames).toContain("nested_folder");
    expect(childNames).toContain("file_in_folder1.txt");

    const nestedChild = payload.children.find((child) => child.name === "nested_folder");
    expect(nestedChild?.children).toEqual([]);
  });

  it("returns error for invalid workspace", async () => {
    const query = `
      query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
        folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
      }
    `;

    const data = await execGraphql<{ folderChildren: string }>(query, {
      workspaceId: "invalid_workspace_id",
      folderPath: "folder1",
    });

    const payload = JSON.parse(data.folderChildren) as { error?: string };
    expect(payload.error).toContain("Workspace not found");
  });
});
