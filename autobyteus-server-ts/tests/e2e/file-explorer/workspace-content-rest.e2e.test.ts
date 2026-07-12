import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerWorkspaceRoutes } from "../../../src/api/rest/workspaces.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

const workspaceManager = getWorkspaceManager();

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("workspace content REST boundary e2e", () => {
  let app: FastifyInstance;
  let tempRoot: string;
  let workspaceRoot: string;
  let siblingRoot: string;
  let initialIds: Set<string>;

  beforeEach(async () => {
    initialIds = new Set(workspaceManager.getAllWorkspaces().map((workspace) => workspace.workspaceId));
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-workspace-rest-e2e-"));
    workspaceRoot = path.join(tempRoot, "workspace");
    siblingRoot = path.join(tempRoot, "workspace-sibling");
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.mkdirSync(siblingRoot, { recursive: true });

    app = fastify();
    await app.register(registerWorkspaceRoutes, { prefix: "/rest" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    for (const workspace of workspaceManager.getAllWorkspaces()) {
      if (!initialIds.has(workspace.workspaceId)) {
        const removal = await workspaceManager.removeRegisteredWorkspace(workspace.workspaceId);
        expect(removal).toMatchObject({
          success: true,
          workspaceId: workspace.workspaceId,
          workspaceRootPath: workspace.getBasePath(),
        });
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("serves encoded image paths through a real FileSystemWorkspace", async () => {
    const imagePath = path.join(workspaceRoot, "docs", "assets", "diagram one.png");
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.writeFileSync(imagePath, PNG_BYTES);
    const workspace = await workspaceManager.createWorkspace({ rootPath: workspaceRoot });

    const response = await app.inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspace.workspaceId)}/content?${new URLSearchParams({
        path: "docs/assets/diagram one.png",
      })}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.rawPayload).toEqual(PNG_BYTES);
  });

  it("rejects a same-prefix sibling traversal through FileSystemWorkspace", async () => {
    fs.writeFileSync(path.join(siblingRoot, "leak.png"), PNG_BYTES);
    const workspace = await workspaceManager.createWorkspace({ rootPath: workspaceRoot });

    const response = await app.inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspace.workspaceId)}/content?${new URLSearchParams({
        path: "../workspace-sibling/leak.png",
      })}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      detail: "Access denied: Path resolves outside the workspace boundary.",
    });
    expect(response.rawPayload).not.toEqual(PNG_BYTES);
  });

  it("rejects an absolute candidate through FileSystemWorkspace", async () => {
    const outsideImage = path.join(tempRoot, "absolute.png");
    fs.writeFileSync(outsideImage, PNG_BYTES);
    const workspace = await workspaceManager.createWorkspace({ rootPath: workspaceRoot });

    const response = await app.inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspace.workspaceId)}/content?${new URLSearchParams({
        path: outsideImage,
      })}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      detail: "Access denied: Path resolves outside the workspace boundary.",
    });
    expect(response.rawPayload).not.toEqual(PNG_BYTES);
  });
});
