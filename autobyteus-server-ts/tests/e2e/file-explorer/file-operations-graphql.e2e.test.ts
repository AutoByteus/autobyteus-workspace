import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const workspaceManager = getWorkspaceManager();

const closeWithTimeout = async (workspace: { close: () => Promise<void> }) => {
  await Promise.race([
    workspace.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
};

describe("File operations GraphQL e2e", () => {
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
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-file-ops-"));
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

  it("handles file lifecycle via GraphQL", async () => {
    const rootPath = path.join(tempRoot, "file_ops_ws");
    fs.mkdirSync(rootPath, { recursive: true });

    const createWorkspaceMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
        }
      }
    `;

    const created = await execGraphql<{ createWorkspace: { workspaceId: string } }>(
      createWorkspaceMutation,
      { input: { rootPath } },
    );

    const workspaceId = created.createWorkspace.workspaceId;
    expect(workspaceId).toBeTruthy();

    const writeMutation = `
      mutation WriteFileContent($workspaceId: String!, $filePath: String!, $content: String!) {
        writeFileContent(workspaceId: $workspaceId, filePath: $filePath, content: $content)
      }
    `;

    const filePath = "test_lifecycle.txt";
    const content = "Hello, E2E World!";

    const writeResult = await execGraphql<{ writeFileContent: string }>(writeMutation, {
      workspaceId,
      filePath,
      content,
    });

    const writeEvent = JSON.parse(writeResult.writeFileContent) as { changes: Array<{ type: string }> };
    expect(writeEvent.changes.length).toBeGreaterThan(0);
    expect(["add", "modify"]).toContain(writeEvent.changes[0]?.type);

    const readQuery = `
      query GetFileContent($workspaceId: String!, $filePath: String!) {
        fileContent(workspaceId: $workspaceId, filePath: $filePath)
      }
    `;

    const readResult = await execGraphql<{ fileContent: string }>(readQuery, {
      workspaceId,
      filePath,
    });

    expect(readResult.fileContent).toBe(content);

    const deleteMutation = `
      mutation DeleteFileOrFolder($workspaceId: String!, $path: String!) {
        deleteFileOrFolder(workspaceId: $workspaceId, path: $path)
      }
    `;

    const deleteResult = await execGraphql<{ deleteFileOrFolder: string }>(deleteMutation, {
      workspaceId,
      path: filePath,
    });

    const deleteEvent = JSON.parse(deleteResult.deleteFileOrFolder) as {
      changes: Array<{ type: string; node_id?: string; parent_id?: string }>;
    };
    expect(deleteEvent.changes.length).toBeGreaterThan(0);
    expect(deleteEvent.changes[0]?.type).toBe("delete");
    expect(deleteEvent.changes[0]?.node_id).toBeTruthy();
    expect(deleteEvent.changes[0]?.parent_id).toBeTruthy();

    const readMissing = await execGraphql<{ fileContent: string }>(readQuery, {
      workspaceId,
      filePath,
    });
    expect(readMissing.fileContent).toContain("error");

    expect(fs.existsSync(path.join(rootPath, filePath))).toBe(false);
  });

  it("creates and renames a file", async () => {
    const rootPath = path.join(tempRoot, "rename_ws");
    fs.mkdirSync(rootPath, { recursive: true });

    const createWorkspaceMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
        }
      }
    `;

    const created = await execGraphql<{ createWorkspace: { workspaceId: string } }>(
      createWorkspaceMutation,
      { input: { rootPath } },
    );

    const workspaceId = created.createWorkspace.workspaceId;

    const createMutation = `
      mutation CreateFileOrFolder($workspaceId: String!, $path: String!, $isFile: Boolean!) {
        createFileOrFolder(workspaceId: $workspaceId, path: $path, isFile: $isFile)
      }
    `;

    const createResult = await execGraphql<{ createFileOrFolder: string }>(createMutation, {
      workspaceId,
      path: "rename-me.txt",
      isFile: true,
    });

    const createEvent = JSON.parse(createResult.createFileOrFolder) as { changes: Array<{ type: string }> };
    expect(createEvent.changes[0]?.type).toBe("add");

    const renameMutation = `
      mutation RenameFileOrFolder($workspaceId: String!, $targetPath: String!, $newName: String!) {
        renameFileOrFolder(workspaceId: $workspaceId, targetPath: $targetPath, newName: $newName)
      }
    `;

    const renameResult = await execGraphql<{ renameFileOrFolder: string }>(renameMutation, {
      workspaceId,
      targetPath: "rename-me.txt",
      newName: "renamed.txt",
    });

    const renameEvent = JSON.parse(renameResult.renameFileOrFolder) as { changes: Array<{ type: string }> };
    expect(renameEvent.changes[0]?.type).toBe("rename");
    expect(fs.existsSync(path.join(rootPath, "renamed.txt"))).toBe(true);
  });
});
