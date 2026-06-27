import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AppConfig } from "../../../src/config/app-config.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { buildFilesystemWorkspaceId } from "../../../src/workspaces/workspace-registry-store.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { canonicalizeWorkspaceRootPath } from "../../../src/workspaces/workspace-path-utils.js";
const workspaceManager = getWorkspaceManager();

const getWorkspaceFileExplorerState = async (workspaceId: string) => {
  const workspace = workspaceManager.getWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found in test: ${workspaceId}`);
  }
  const fileExplorer = (workspace as unknown as {
    fileExplorer?: { fileWatcher?: unknown; watcherLeaseCount?: number } | null;
  }).fileExplorer ?? null;
  return {
    hasFileExplorer: workspace.hasFileExplorerForDiagnostics(),
    watcher: fileExplorer?.fileWatcher ?? null,
    leaseCount: fileExplorer?.watcherLeaseCount ?? 0,
  };
};

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
    try {
      const registeredWorkspaces = await workspaceManager.listRegisteredFilesystemWorkspaces();
      for (const workspace of registeredWorkspaces) {
        const basePath = workspace.getBasePath();
        const relativeToTemp = path.relative(tempRoot, basePath);
        const isUnderTestRoot = relativeToTemp === "" || (
          relativeToTemp.length > 0
          && !relativeToTemp.startsWith("..")
          && !path.isAbsolute(relativeToTemp)
        );
        if (isUnderTestRoot) {
          await workspaceManager.removeRegisteredWorkspace(workspace.workspaceId);
        }
      }
    } catch {
      // Some tests temporarily replace the app config with a narrow mock. Those
      // scenarios do not create registered filesystem workspaces, so cleanup can
      // safely continue with active workspace teardown below.
    }

    const workspaces = workspaceManager.getAllWorkspaces();
    for (const workspace of workspaces) {
      if (!initialIds.has(workspace.workspaceId)) {
        await closeWithTimeout(workspace);
        (workspaceManager as any).activeWorkspaces?.delete?.(workspace.workspaceId);
      }
    }
    delete process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
    vi.restoreAllMocks();
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

  it("removes a registered workspace from visibility, preserves files, and re-adds the same root", async () => {
    const rootPath = path.join(tempRoot, "test_ws_root");
    const filePath = path.join(rootPath, "keep.txt");
    fs.writeFileSync(filePath, "preserved", "utf-8");

    const createMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
          workspaceRootPath
          absolutePath
        }
      }
    `;
    const removeMutation = `
      mutation RemoveWorkspace($input: RemoveWorkspaceInput!) {
        removeWorkspace(input: $input) {
          success
          message
          workspaceId
          workspaceRootPath
        }
      }
    `;
    const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          workspaceRootPath
          absolutePath
        }
      }
    `;

    const created = await execGraphql<{
      createWorkspace: {
        workspaceId: string;
        workspaceRootPath: string;
        absolutePath: string | null;
      };
    }>(createMutation, { input: { rootPath } });
    const workspaceId = created.createWorkspace.workspaceId;

    const removed = await execGraphql<{
      removeWorkspace: {
        success: boolean;
        message: string;
        workspaceId: string;
        workspaceRootPath: string | null;
      };
    }>(removeMutation, { input: { workspaceId } });

    expect(removed.removeWorkspace).toMatchObject({
      success: true,
      workspaceId,
      workspaceRootPath: rootPath,
    });
    expect(removed.removeWorkspace.message).toContain("Files, memories, and run history were not deleted");
    expect(fs.readFileSync(filePath, "utf-8")).toBe("preserved");

    const afterRemoval = await execGraphql<{
      workspaces: Array<{ workspaceId: string; workspaceRootPath: string | null }>;
    }>(listQuery);
    expect(afterRemoval.workspaces.some((workspace) => workspace.workspaceId === workspaceId)).toBe(false);
    await expect(workspaceManager.getRegisteredWorkspaceRootPath(workspaceId)).resolves.toBeNull();
    expect(workspaceManager.getWorkspaceById(workspaceId)).toBeUndefined();

    const recreated = await execGraphql<{
      createWorkspace: { workspaceId: string; workspaceRootPath: string; absolutePath: string | null };
    }>(createMutation, { input: { rootPath } });
    expect(recreated.createWorkspace).toMatchObject({
      workspaceId,
      workspaceRootPath: rootPath,
      absolutePath: rootPath,
    });

    const afterReadd = await execGraphql<{
      workspaces: Array<{ workspaceId: string; workspaceRootPath: string | null }>;
    }>(listQuery);
    expect(afterReadd.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workspaceId, workspaceRootPath: rootPath }),
      ]),
    );
  });

  it("keeps a workspace registered when removeWorkspace is blocked by an active standalone run", async () => {
    const rootPath = path.join(tempRoot, "test_ws_root");
    const createMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
          workspaceRootPath
        }
      }
    `;
    const removeMutation = `
      mutation RemoveWorkspace($input: RemoveWorkspaceInput!) {
        removeWorkspace(input: $input) {
          success
          message
          workspaceId
          workspaceRootPath
        }
      }
    `;
    const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          workspaceRootPath
        }
      }
    `;

    const created = await execGraphql<{
      createWorkspace: { workspaceId: string; workspaceRootPath: string };
    }>(createMutation, { input: { rootPath } });
    const workspaceId = created.createWorkspace.workspaceId;
    const agentManagerSpy = vi.spyOn(AgentRunManager, "getInstance").mockReturnValue({
      listActiveRuns: () => ["run-active"],
      getActiveRun: () => ({ config: { workspaceId } }),
    } as any);
    const teamManagerSpy = vi.spyOn(AgentTeamRunManager, "getInstance").mockReturnValue({
      listActiveRuns: () => [],
      getActiveRun: () => null,
    } as any);

    try {
      const removed = await execGraphql<{
        removeWorkspace: {
          success: boolean;
          message: string;
          workspaceId: string;
          workspaceRootPath: string | null;
        };
      }>(removeMutation, { input: { workspaceId } });

      expect(removed.removeWorkspace).toMatchObject({
        success: false,
        workspaceId,
        workspaceRootPath: rootPath,
      });
      expect(removed.removeWorkspace.message).toContain("Stop active agent or team runs");

      const afterBlockedRemoval = await execGraphql<{
        workspaces: Array<{ workspaceId: string; workspaceRootPath: string | null }>;
      }>(listQuery);
      expect(afterBlockedRemoval.workspaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ workspaceId, workspaceRootPath: rootPath }),
        ]),
      );
      await expect(workspaceManager.getRegisteredWorkspaceRootPath(workspaceId)).resolves.toBe(rootPath);
    } finally {
      agentManagerSpy.mockRestore();
      teamManagerSpy.mockRestore();
    }
  });

  it("returns workspace metadata from createWorkspace without acquiring file explorer", async () => {
    const rootPath = path.join(tempRoot, "test_ws_root");
    fs.mkdirSync(path.join(rootPath, "project", "nested"), { recursive: true });
    fs.writeFileSync(path.join(rootPath, "project", "nested", "index.ts"), "export {};\n", "utf-8");

    const createMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
          name
          displayName
          workspaceRootPath
          absolutePath
          kind
          isTemp
        }
      }
    `;

    const created = await execGraphql<{
      createWorkspace: {
        workspaceId: string;
        name: string;
        displayName: string;
        workspaceRootPath: string;
        absolutePath: string | null;
        kind: string;
        isTemp: boolean;
      };
    }>(createMutation, { input: { rootPath } });

    expect(created.createWorkspace).toMatchObject({
      workspaceId: buildFilesystemWorkspaceId(rootPath),
      name: "test_ws_root",
      displayName: "test_ws_root",
      workspaceRootPath: rootPath,
      absolutePath: rootPath,
      kind: "filesystem",
      isTemp: false,
    });

    await expect(getWorkspaceFileExplorerState(created.createWorkspace.workspaceId)).resolves.toMatchObject({
      hasFileExplorer: false,
      watcher: null,
      leaseCount: 0,
    });
  });

  it("resolves deterministic workspace metadata without initializing the workspace", async () => {
    const rootPath = path.join(tempRoot, "test_ws_root");
    const rootPathWithTrailingSeparator = `${rootPath}${path.sep}`;
    const expectedRootPath = canonicalizeWorkspaceRootPath(rootPathWithTrailingSeparator);
    const expectedWorkspaceId = buildFilesystemWorkspaceId(expectedRootPath);

    const metadataQuery = `
      query ResolveWorkspaceMetadata($rootPath: String!) {
        workspaceMetadata(rootPath: $rootPath) {
          workspaceId
          workspaceRootPath
          displayName
          kind
        }
      }
    `;

    const first = await execGraphql<{
      workspaceMetadata: {
        workspaceId: string;
        workspaceRootPath: string;
        displayName: string;
        kind: string;
      };
    }>(metadataQuery, { rootPath: rootPathWithTrailingSeparator });

    expect(first.workspaceMetadata).toEqual({
      workspaceId: expectedWorkspaceId,
      workspaceRootPath: expectedRootPath,
      displayName: "test_ws_root",
      kind: "filesystem",
    });
    expect(workspaceManager.getWorkspaceById(expectedWorkspaceId)).toBeUndefined();
    expect(new Set(workspaceManager.getAllWorkspaces().map((ws) => ws.workspaceId))).toEqual(initialIds);

    const repeated = await execGraphql<{
      workspaceMetadata: { workspaceId: string; workspaceRootPath: string };
    }>(metadataQuery, { rootPath });

    expect(repeated.workspaceMetadata.workspaceId).toBe(expectedWorkspaceId);
    expect(repeated.workspaceMetadata.workspaceRootPath).toBe(expectedRootPath);
    expect(workspaceManager.getWorkspaceById(expectedWorkspaceId)).toBeUndefined();

    const createMutation = `
      mutation CreateWorkspace($input: CreateWorkspaceInput!) {
        createWorkspace(input: $input) {
          workspaceId
          absolutePath
        }
      }
    `;

    const created = await execGraphql<{
      createWorkspace: { workspaceId: string; absolutePath: string | null };
    }>(createMutation, { input: { rootPath } });

    expect(created.createWorkspace.workspaceId).toBe(expectedWorkspaceId);
    expect(created.createWorkspace.absolutePath).toBe(expectedRootPath);
    await expect(getWorkspaceFileExplorerState(expectedWorkspaceId)).resolves.toMatchObject({
      hasFileExplorer: false,
      watcher: null,
      leaseCount: 0,
    });
  });

  it("creates and lists the temp workspace with the backend-selected app-data-relative path", async () => {
    const appDataDir = path.join(tempRoot, "server-data");
    const expectedTempRoot = path.join(appDataDir, "temp_workspace");
    fs.mkdirSync(appDataDir, { recursive: true });
    fs.mkdirSync(expectedTempRoot, { recursive: true });

    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue({
      getTempWorkspaceDir: () => expectedTempRoot,
    } as any);

    const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          absolutePath
          isTemp
        }
      }
    `;

    const listResult = await execGraphql<{
      workspaces: Array<{
        workspaceId: string;
        absolutePath: string | null;
        isTemp: boolean;
      }>;
    }>(listQuery);

    const found = listResult.workspaces.find((ws) => ws.workspaceId === "temp_ws_default");
    expect(found).toBeTruthy();
    expect(found?.absolutePath).toBe(expectedTempRoot);
    expect(found?.isTemp).toBe(true);
  });

  it("creates and lists the temp workspace using the configured relative override under app data dir", async () => {
    const appDataDir = path.join(tempRoot, "server-data");
    const expectedTempRoot = path.join(appDataDir, "isolated-temp-workspace");
    fs.mkdirSync(appDataDir, { recursive: true });
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = "isolated-temp-workspace";

    const config = new AppConfig();
    config.setCustomAppDataDir(appDataDir);

    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(config);

    const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          absolutePath
          isTemp
        }
      }
    `;

    const listResult = await execGraphql<{
      workspaces: Array<{
        workspaceId: string;
        absolutePath: string | null;
        isTemp: boolean;
      }>;
    }>(listQuery);

    const found = listResult.workspaces.find((ws) => ws.workspaceId === "temp_ws_default");
    expect(found).toBeTruthy();
    expect(found?.absolutePath).toBe(expectedTempRoot);
    expect(found?.isTemp).toBe(true);
  });
});
