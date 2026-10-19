import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerRunFileChangeRoutes } from "../../../../src/api/rest/run-file-changes.js";
import { CollaborationMemberNotFoundError } from "../../../../src/agent-collaboration/execution/domain/collaboration-member-not-found-error.js";

vi.mock("../../../../src/run-history/services/run-file-change-projection-service.js", () => ({
  RunFileChangeProjectionService: class {},
  getRunFileChangeProjectionService: vi.fn(),
}));

describe("REST run-file-change routes", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-change-route-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("streams committed text file content from the resolved workspace path", async () => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "src", "test.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Hello", "utf-8");

    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveStandaloneRunEntry: vi.fn().mockResolvedValue({
          entry: {
            path: "src/test.md",
            type: "file",
            status: "available",
          },
          absolutePath: filePath,
          isActiveRun: true,
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=src%2Ftest.md",
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("# Hello");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(String(response.headers["content-type"])).toContain("text");
  });

  it("streams binary media content when the resolved file exists", async () => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "assets", "image.png");
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, pngBytes);

    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveStandaloneRunEntry: vi.fn().mockResolvedValue({
          entry: {
            path: "assets/image.png",
            type: "image",
            status: "available",
          },
          absolutePath: filePath,
          isActiveRun: true,
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=assets%2Fimage.png",
    });

    expect(response.statusCode).toBe(200);
    expect(response.rawPayload.equals(pngBytes)).toBe(true);
    expect(String(response.headers["content-type"])).toContain("image/png");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("streams SVG media content with image/svg+xml when the resolved file exists", async () => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "assets", "diagram.SVG");
    const svgBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, svgBytes);

    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveStandaloneRunEntry: vi.fn().mockResolvedValue({
          entry: {
            path: "assets/diagram.SVG",
            type: "file",
            status: "available",
          },
          absolutePath: filePath,
          isActiveRun: true,
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=assets%2Fdiagram.SVG",
    });

    expect(response.statusCode).toBe(200);
    expect(response.rawPayload.equals(svgBytes)).toBe(true);
    expect(String(response.headers["content-type"])).toContain("image/svg+xml");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("returns 404 when the file-change entry is missing", async () => {
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveStandaloneRunEntry: vi.fn().mockResolvedValue(null),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=src%2Fmissing.md",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
  });

  it("returns 409 when an active file-change row exists but the file is not ready yet", async () => {
    const missingPath = path.join(os.tmpdir(), "run-file-change-route-missing", "pending.md");
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveStandaloneRunEntry: vi.fn().mockResolvedValue({
          entry: {
            path: "src/pending.md",
            type: "file",
            status: "pending",
          },
          absolutePath: missingPath,
          isActiveRun: true,
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=src%2Fpending.md",
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ detail: "File change content is not ready yet" });
  });

  it("returns 404 when a historical file-change file is no longer available", async () => {
    const missingPath = path.join(os.tmpdir(), "run-file-change-route-missing", "history.md");
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveStandaloneRunEntry: vi.fn().mockResolvedValue({
          entry: {
            path: "src/history.md",
            type: "file",
            status: "available",
          },
          absolutePath: missingPath,
          isActiveRun: false,
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=src%2Fhistory.md",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change content is not available" });
  });
});

describe("REST owner-scoped file-change content routes", () => {
  const tempDirs: string[] = [];
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  const resolvedFile = async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-change-owner-route-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "docs", "a.md");
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "# Member", "utf-8");
    return { entry: { path: "docs/a.md", type: "file", status: "available" }, absolutePath: filePath, isActiveRun: false };
  };

  const appWith = async (resolveFileChangeEntry: ReturnType<typeof vi.fn>) => {
    const app = fastify();
    const views = { resolveFileChangeEntry } as never;
    await registerRunFileChangeRoutes(app, {
      projectionService: { resolveStandaloneRunEntry: vi.fn() } as never,
      teamMemberViews: views,
      agentOrgMemberViews: views,
      standaloneRootMemberViews: views,
    });
    return app;
  };

  const routes = [
    {
      name: "team member",
      url: "/team-runs/team-1/agent-runs/a-7/file-change-content?path=docs%2Fa.md",
      args: ["team-1", "a-7", "docs/a.md"],
      withoutMemberAddress: null,
    },
    {
      name: "org member",
      url: "/agent-org-runs/org-1/agent-runs/a-7/file-change-content?memberAddress=%2Fresearch%2Fwriter&path=docs%2Fa.md",
      args: ["org-1", "/research/writer", "a-7", "docs/a.md"],
      withoutMemberAddress: "/agent-org-runs/org-1/agent-runs/a-7/file-change-content?path=docs%2Fa.md",
    },
    {
      name: "delegated copy",
      url: "/agent-collaborations/hub-1/agent-runs/c-3/file-change-content?memberAddress=%2Freviewer&path=docs%2Fa.md",
      args: ["hub-1", "/reviewer", "c-3", "docs/a.md"],
      withoutMemberAddress: "/agent-collaborations/hub-1/agent-runs/c-3/file-change-content?path=docs%2Fa.md",
    },
  ];

  it.each(routes)("streams a $name's file through its owner's member-view service", async ({ url, args }) => {
    const resolve = vi.fn().mockResolvedValue(await resolvedFile());
    const response = await (await appWith(resolve)).inject({ method: "GET", url });
    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("# Member");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(resolve).toHaveBeenCalledWith(...args);
  });

  it.each(routes)("answers 404 when the $name is not in the named owner", async ({ url }) => {
    const resolve = vi.fn().mockRejectedValue(new CollaborationMemberNotFoundError("AgentRun 'a-7' was not found."));
    const response = await (await appWith(resolve)).inject({ method: "GET", url });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
  });

  it.each(routes)("answers 404 when the $name has no such recorded file change", async ({ url }) => {
    const response = await (await appWith(vi.fn().mockResolvedValue(null))).inject({ method: "GET", url });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
  });

  it.each(routes)("answers 409 for the $name's pending file while its owner runs", async ({ url }) => {
    const resolve = vi.fn().mockResolvedValue({
      entry: { path: "docs/a.md", type: "file", status: "pending" },
      absolutePath: path.join(os.tmpdir(), "run-file-change-owner-route-missing", "a.md"),
      isActiveRun: true,
    });
    const response = await (await appWith(resolve)).inject({ method: "GET", url });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ detail: "File change content is not ready yet" });
  });

  it.each(routes)("does not turn other $name lookup errors into not found", async ({ url }) => {
    const response = await (await appWith(vi.fn().mockRejectedValue(new Error("tree unreadable")))).inject({ method: "GET", url });
    expect(response.statusCode).toBe(500);
  });

  it.each(routes)("requires the path query for a $name", async ({ url }) => {
    const resolve = vi.fn();
    const response = await (await appWith(resolve)).inject({ method: "GET", url: url.replace(/[?&]path=docs%2Fa\.md/, "") });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: "Missing required query parameter: path" });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each(routes.filter((route) => route.withoutMemberAddress))("requires memberAddress for a $name", async ({ withoutMemberAddress }) => {
    const resolve = vi.fn();
    const response = await (await appWith(resolve)).inject({ method: "GET", url: withoutMemberAddress! });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: "Missing required query parameter: memberAddress" });
    expect(resolve).not.toHaveBeenCalled();
  });
});
