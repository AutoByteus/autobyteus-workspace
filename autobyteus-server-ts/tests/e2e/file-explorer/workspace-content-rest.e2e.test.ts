import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { getWorkspaceManager } from "../../../src/workspaces/workspace-manager.js";

const workspaceManager = getWorkspaceManager();

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');

describe("workspace content REST boundary e2e", () => {
  let app: FastifyInstance;
  let tempRoot: string;
  let workspaceRoot: string;
  let siblingRoot: string;
  let initialIds: Set<string>;
  let dataRoot: string;
  let baseUrl: URL;

  // Compose the real process authorities used by public workspace removal. A
  // route-only Fastify fixture cannot run that lifecycle's cleanup safely.
  beforeAll(async () => {
    dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-rest-appdata-"));
    fs.writeFileSync(path.join(dataRoot, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataRoot);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify;
    baseUrl = started.mainUrl;
  }, 60_000);

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (dataRoot) fs.rmSync(dataRoot, { recursive: true, force: true });
    }
  }, 60_000);

  beforeEach(() => {
    initialIds = new Set(workspaceManager.getAllWorkspaces().map((workspace) => workspace.workspaceId));
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-workspace-rest-e2e-"));
    workspaceRoot = path.join(tempRoot, "workspace");
    siblingRoot = path.join(tempRoot, "workspace-sibling");
    fs.mkdirSync(workspaceRoot, { recursive: true });
    fs.mkdirSync(siblingRoot, { recursive: true });
  });

  afterEach(async () => {
    // Keep the composed process authorities alive for public removal. Unlike a
    // route-only fixture, this suite must not close the app per test or bypass
    // removal by mutating the manager's private maps. afterAll owns app.close().
    try {
      for (const workspace of workspaceManager.getAllWorkspaces()) {
        if (!initialIds.has(workspace.workspaceId)) {
          const removal = await workspaceManager.removeRegisteredWorkspace(workspace.workspaceId);
          expect(removal).toMatchObject({
            success: true,
            workspaceId: workspace.workspaceId,
            workspaceRootPath: workspace.getBasePath(),
          });
          expect(workspaceManager.getWorkspaceById(workspace.workspaceId)).toBeUndefined();
          expect(await workspaceManager.getRegisteredWorkspaceRootPath(workspace.workspaceId)).toBeNull();
        }
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("reopens HTML and relative media over HTTP after external replacement and deletion", async () => {
    // Local ordinary filesystem contract, not NFS visibility or browser rendering.
    const html = '<html><body><img src="assets/diagram%20one.png"></body></html>';
    const docs = path.join(workspaceRoot, "docs");
    fs.mkdirSync(path.join(docs, "assets"), { recursive: true });
    fs.writeFileSync(path.join(docs, "index.html"), html);
    const imagePath = path.join(docs, "assets", "diagram one.png");
    fs.writeFileSync(imagePath, PNG_BYTES);
    const creation = await fetch(new URL("/graphql", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "mutation($input: CreateWorkspaceInput!) { createWorkspace(input: $input) { workspaceId } }",
        variables: { input: { rootPath: workspaceRoot } },
      }),
    });
    expect(creation.status).toBe(200);
    const created = await creation.json();
    expect(created.errors).toBeUndefined();
    const id = encodeURIComponent(created.data.createWorkspace.workspaceId);
    const pageUrl = new URL(`/rest/workspaces/${id}/static/docs/index.html`, baseUrl);
    const page = await fetch(pageUrl);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    expect(await page.text()).toBe(html);
    const assetUrl = new URL("assets/diagram%20one.png", pageUrl);
    const asset = await fetch(assetUrl);
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("image/png");
    expect(Buffer.from(await asset.arrayBuffer())).toEqual(PNG_BYTES);

    const updated = html.replace("<body>", "<body><p>remote edit</p>");
    fs.writeFileSync(path.join(docs, "replacement.html"), updated);
    fs.renameSync(path.join(docs, "replacement.html"), path.join(docs, "index.html"));
    const reopened = await fetch(pageUrl);
    expect(reopened.status).toBe(200);
    expect(await reopened.text()).toBe(updated);
    fs.unlinkSync(imagePath);
    const deleted = await fetch(assetUrl);
    expect(deleted.status).toBe(404);
    expect(await deleted.json()).toEqual({ detail: "File not found in workspace" });
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

  it("serves SVG bytes with the image/svg+xml content boundary through a real FileSystemWorkspace", async () => {
    const imagePath = path.join(workspaceRoot, "docs", "assets", "diagram.SVG");
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.writeFileSync(imagePath, SVG_BYTES);
    const workspace = await workspaceManager.createWorkspace({ rootPath: workspaceRoot });

    const response = await app.inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspace.workspaceId)}/content?${new URLSearchParams({
        path: "docs/assets/diagram.SVG",
      })}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/svg+xml");
    expect(response.rawPayload).toEqual(SVG_BYTES);
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

  it("rejects an absolute candidate through the static workspace route", async () => {
    const outsideHtml = path.join(tempRoot, "absolute.html");
    fs.writeFileSync(outsideHtml, "<h1>outside workspace</h1>", "utf-8");
    const workspace = await workspaceManager.createWorkspace({ rootPath: workspaceRoot });

    const response = await app.inject({
      method: "GET",
      url: `/rest/workspaces/${encodeURIComponent(workspace.workspaceId)}/static/${encodeURIComponent(outsideHtml)}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      detail: "Access denied: Path resolves outside the workspace boundary.",
    });
    expect(response.payload).not.toContain("outside workspace");
  });
});
