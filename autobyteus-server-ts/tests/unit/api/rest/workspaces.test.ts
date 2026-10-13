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

// Healthy mounted files use these same ordinary streams. Local fixtures prove
// byte/MIME/path preservation, not NFS or browser qualification.
it("preserves healthy media bytes, encoded paths, HTML and relative static assets", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-healthy-preview-"));
  const app = fastify();
  const files = new Map<string, { bytes: Buffer; mime: string }>([
    ["assets/image space.png", { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff]), mime: "image/png" }],
    ["assets/icon.svg", { bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="2" height="2"/></svg>'), mime: "image/svg+xml" }],
    ["page.html", { bytes: Buffer.from('<!doctype html><img src="assets/image%20space.png"><script src="assets/app.js"></script>'), mime: "text/html" }],
    ["assets/app.js", { bytes: Buffer.from('document.body.dataset.loaded="yes"'), mime: "javascript" }],
  ]);
  try {
    for (const [relative, fixture] of files) {
      fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      fs.writeFileSync(path.join(root, relative), fixture.bytes);
    }
    mockWorkspaceManager.getWorkspaceById.mockReturnValue({ getAbsolutePath: (relative: string) => path.join(root, relative) });
    await registerWorkspaceRoutes(app);
    for (const [relative, fixture] of files) {
      for (const url of [
        `/workspaces/ws1/content?path=${encodeURIComponent(relative)}`,
        `/workspaces/ws1/static/${relative.split('/').map(encodeURIComponent).join('/')}`,
      ]) {
        const response = await app.inject({ method: "GET", url });
        expect(response.statusCode).toBe(200);
        expect(response.rawPayload.equals(fixture.bytes)).toBe(true);
        expect(String(response.headers["content-type"])).toContain(fixture.mime);
      }
    }
    const missing = await app.inject({ method: "GET", url: "/workspaces/ws1/static/deleted.png" });
    expect(missing.statusCode).toBe(404);
  } finally {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
