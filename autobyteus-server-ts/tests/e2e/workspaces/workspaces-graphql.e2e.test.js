import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AppConfig } from "../../../src/config/app-config.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
const workspaceManager = getWorkspaceManager();
describe("Workspaces GraphQL e2e", () => {
    let schema;
    let graphql;
    let tempRoot;
    let initialIds;
    beforeAll(async () => {
        schema = await buildGraphqlSchema();
        const require = createRequire(import.meta.url);
        const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
        const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
        const graphqlModule = await import(graphqlPath);
        graphql = graphqlModule.graphql;
    });
    beforeEach(() => {
        initialIds = new Set(workspaceManager.getAllWorkspaces().map((ws) => ws.workspaceId));
        tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-workspace-"));
        fs.mkdirSync(path.join(tempRoot, "test_ws_root"), { recursive: true });
    });
    const closeWithTimeout = async (workspace) => {
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
                workspaceManager.activeWorkspaces?.delete?.(workspace.workspaceId);
            }
        }
        delete process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
        vi.restoreAllMocks();
        fs.rmSync(tempRoot, { recursive: true, force: true });
    }, 20000);
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
        const created = await execGraphql(createMutation, { input: { rootPath } });
        expect(created.createWorkspace.workspaceId).toBeTruthy();
        expect(created.createWorkspace.absolutePath).toBe(rootPath);
        const newId = created.createWorkspace.workspaceId;
        const listResult = await execGraphql(listQuery);
        const found = listResult.workspaces.find((ws) => ws.workspaceId === newId);
        expect(found).toBeTruthy();
        expect(found?.absolutePath).toBe(rootPath);
    });
    it("lists the temp workspace with the backend-selected app-data-relative path", async () => {
        const appDataDir = path.join(tempRoot, "server-data");
        const expectedTempRoot = path.join(appDataDir, "temp_workspace");
        fs.mkdirSync(appDataDir, { recursive: true });
        fs.mkdirSync(expectedTempRoot, { recursive: true });
        vi.spyOn(appConfigProvider, "config", "get").mockReturnValue({
            getTempWorkspaceDir: () => expectedTempRoot,
        });
        await workspaceManager.getOrCreateTempWorkspace();
        const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          absolutePath
          isTemp
        }
      }
    `;
        const listResult = await execGraphql(listQuery);
        const found = listResult.workspaces.find((ws) => ws.workspaceId === "temp_ws_default");
        expect(found).toBeTruthy();
        expect(found?.absolutePath).toBe(expectedTempRoot);
        expect(found?.isTemp).toBe(true);
    });
    it("lists the temp workspace using the configured relative override under app data dir", async () => {
        const appDataDir = path.join(tempRoot, "server-data");
        const expectedTempRoot = path.join(appDataDir, "isolated-temp-workspace");
        fs.mkdirSync(appDataDir, { recursive: true });
        process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = "isolated-temp-workspace";
        const config = new AppConfig();
        config.setCustomAppDataDir(appDataDir);
        vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(config);
        await workspaceManager.getOrCreateTempWorkspace();
        const listQuery = `
      query GetWorkspaces {
        workspaces {
          workspaceId
          absolutePath
          isTemp
        }
      }
    `;
        const listResult = await execGraphql(listQuery);
        const found = listResult.workspaces.find((ws) => ws.workspaceId === "temp_ws_default");
        expect(found).toBeTruthy();
        expect(found?.absolutePath).toBe(expectedTempRoot);
        expect(found?.isTemp).toBe(true);
    });
});
