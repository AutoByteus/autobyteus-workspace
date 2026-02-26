import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockWorkspaceManager = vi.hoisted(() => ({
  getWorkspaceById: vi.fn(),
}));

vi.mock("../../../../src/workspaces/workspace-manager.js", () => ({
  getWorkspaceManager: () => mockWorkspaceManager,
}));

import { registerWorkspaceRoutes } from "../../../../src/api/rest/workspaces.js";

describe("REST workspaces routes", () => {
  beforeEach(() => {
    mockWorkspaceManager.getWorkspaceById.mockReset();
  });

  it("serves workspace file content", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-rest-"));
    const filePath = path.join(tempDir, "hello.txt");
    fs.writeFileSync(filePath, "hello world", "utf-8");

    const workspace = {
      getAbsolutePath: vi.fn().mockReturnValue(filePath),
    };
    mockWorkspaceManager.getWorkspaceById.mockReturnValue(workspace);

    const app = fastify();
    await registerWorkspaceRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/workspaces/ws1/content?path=hello.txt",
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("hello world");
    expect(workspace.getAbsolutePath).toHaveBeenCalledWith("hello.txt");

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns 404 when workspace is missing", async () => {
    mockWorkspaceManager.getWorkspaceById.mockReturnValue(undefined);

    const app = fastify();
    await registerWorkspaceRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/workspaces/missing/content?path=file.txt",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "Workspace not found" });
  });

  it("serves static workspace assets", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-rest-"));
    const assetDir = path.join(tempDir, "static");
    fs.mkdirSync(assetDir, { recursive: true });
    const assetPath = path.join(assetDir, "app.js");
    fs.writeFileSync(assetPath, "console.log('ok');", "utf-8");

    const workspace = {
      getAbsolutePath: vi.fn().mockReturnValue(assetPath),
    };
    mockWorkspaceManager.getWorkspaceById.mockReturnValue(workspace);

    const app = fastify();
    await registerWorkspaceRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/workspaces/ws1/static/static/app.js",
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toContain("console.log");
    expect(workspace.getAbsolutePath).toHaveBeenCalledWith("static/app.js");

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns 400 for workspace path violations", async () => {
    const workspace = {
      getAbsolutePath: vi.fn().mockImplementation(() => {
        throw new Error("Access denied: Path resolves outside the workspace boundary.");
      }),
    };
    mockWorkspaceManager.getWorkspaceById.mockReturnValue(workspace);

    const app = fastify();
    await registerWorkspaceRoutes(app);

    const response = await app.inject({
      method: "GET",
      url: "/workspaces/ws1/content?path=../secret.txt",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      detail: "Access denied: Path resolves outside the workspace boundary.",
    });
  });
});
