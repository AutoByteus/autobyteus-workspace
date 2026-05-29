import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema, GraphQLError } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

const workspaceManager = getWorkspaceManager();

const closeWithTimeout = async (workspace: { close: () => Promise<void> }) => {
  await Promise.race([
    workspace.close(),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
};

describe("File explorer GraphQL path-boundary e2e", () => {
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
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-path-boundary-e2e-"));
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

  const runGraphql = async (query: string, variables?: Record<string, unknown>) =>
    graphql({
      schema,
      source: query,
      variableValues: variables,
    });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await runGraphql(query, variables);
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const expectGraphqlError = async (
    query: string,
    variables: Record<string, unknown>,
    expectedMessage: string,
  ): Promise<GraphQLError> => {
    const result = await runGraphql(query, variables);
    expect(result.errors?.length).toBeGreaterThan(0);
    const error = result.errors?.[0];
    expect(error?.message).toContain(expectedMessage);
    return error as GraphQLError;
  };

  const createWorkspace = async (rootPath: string): Promise<string> => {
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
    return created.createWorkspace.workspaceId;
  };

  const getExplorerDiagnostics = (workspaceId: string) => {
    const workspace = workspaceManager.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found in test: ${workspaceId}`);
    }

    const fileExplorer = (workspace as unknown as {
      fileExplorer?: {
        fileWatcher?: unknown;
        watcherLeaseCount?: number;
        toJson?: () => string | null;
      } | null;
    }).fileExplorer ?? null;

    return {
      watcher: fileExplorer?.fileWatcher ?? null,
      leaseCount: fileExplorer?.watcherLeaseCount ?? 0,
      treeJson: fileExplorer?.toJson?.() ?? null,
    };
  };

  it("rejects ignored folder projections before cached tree mutation", async () => {
    const workspaceRoot = path.join(tempRoot, "ignored_ws");
    fs.mkdirSync(path.join(workspaceRoot, ".git", "objects"), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, "node_modules", "pkg"), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, "ignored-by-gitignore"), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, ".gitignore"), "ignored-by-gitignore/\n");
    fs.writeFileSync(path.join(workspaceRoot, "visible.txt"), "visible");

    const workspaceId = await createWorkspace(workspaceRoot);

    const folderQuery = `
      query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
        folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
      }
    `;

    for (const folderPath of [".git", "node_modules", "ignored-by-gitignore"]) {
      const data = await execGraphql<{ folderChildren: string }>(folderQuery, {
        workspaceId,
        folderPath,
      });
      const payload = JSON.parse(data.folderChildren) as { error?: string };
      expect(payload.error).toContain("Access denied: Folder is ignored");
      expect(getExplorerDiagnostics(workspaceId)).toMatchObject({
        watcher: null,
        leaseCount: 0,
        treeJson: null,
      });
    }

    const rootData = await execGraphql<{ folderChildren: string }>(folderQuery, {
      workspaceId,
      folderPath: "",
    });
    const rootPayload = JSON.parse(rootData.folderChildren) as {
      children: Array<{ name: string }>;
    };
    const childNames = rootPayload.children.map((child) => child.name);
    expect(childNames).toContain("visible.txt");
    expect(childNames).not.toContain(".git");
    expect(childNames).not.toContain("node_modules");
    expect(childNames).not.toContain("ignored-by-gitignore");
    expect(getExplorerDiagnostics(workspaceId)).toMatchObject({
      watcher: null,
      leaseCount: 0,
    });
  });

  it("rejects same-prefix sibling escapes through folder, read, write, and rename APIs", async () => {
    const workspaceRoot = path.join(tempRoot, "ws");
    const siblingRoot = path.join(tempRoot, "ws-sibling");
    fs.mkdirSync(path.join(workspaceRoot, "sub"), { recursive: true });
    fs.mkdirSync(siblingRoot, { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, "sub", "rename-me.txt"), "content");
    fs.writeFileSync(path.join(siblingRoot, "leak.txt"), "sibling leak");

    const workspaceId = await createWorkspace(workspaceRoot);

    const folderQuery = `
      query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
        folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
      }
    `;
    const folderData = await execGraphql<{ folderChildren: string }>(folderQuery, {
      workspaceId,
      folderPath: "../ws-sibling",
    });
    const folderPayload = JSON.parse(folderData.folderChildren) as { error?: string };
    expect(folderPayload.error).toContain("Access denied: Path resolves outside the workspace");
    expect(JSON.stringify(folderPayload)).not.toContain("leak.txt");

    const readQuery = `
      query GetFileContent($workspaceId: String!, $filePath: String!) {
        fileContent(workspaceId: $workspaceId, filePath: $filePath)
      }
    `;
    const readData = await execGraphql<{ fileContent: string }>(readQuery, {
      workspaceId,
      filePath: "../ws-sibling/leak.txt",
    });
    const readPayload = JSON.parse(readData.fileContent) as { error?: string };
    expect(readPayload.error).toContain("Access denied: File is outside the workspace");
    expect(readData.fileContent).not.toContain("sibling leak");

    const writeMutation = `
      mutation WriteFileContent($workspaceId: String!, $filePath: String!, $content: String!) {
        writeFileContent(workspaceId: $workspaceId, filePath: $filePath, content: $content)
      }
    `;
    await expectGraphqlError(
      writeMutation,
      {
        workspaceId,
        filePath: "../ws-sibling/write-leak.txt",
        content: "should not escape",
      },
      "Access denied: File is outside the workspace",
    );
    expect(fs.existsSync(path.join(siblingRoot, "write-leak.txt"))).toBe(false);

    const renameMutation = `
      mutation RenameFileOrFolder($workspaceId: String!, $targetPath: String!, $newName: String!) {
        renameFileOrFolder(workspaceId: $workspaceId, targetPath: $targetPath, newName: $newName)
      }
    `;
    await expectGraphqlError(
      renameMutation,
      {
        workspaceId,
        targetPath: "sub/rename-me.txt",
        newName: "../../ws-sibling/renamed-leak.txt",
      },
      "Invalid new name",
    );

    expect(fs.existsSync(path.join(siblingRoot, "renamed-leak.txt"))).toBe(false);
    expect(fs.existsSync(path.join(workspaceRoot, "sub", "rename-me.txt"))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, "sub", "renamed-leak.txt"))).toBe(false);
    expect(getExplorerDiagnostics(workspaceId)).toMatchObject({
      watcher: null,
      leaseCount: 0,
    });
  });
});
