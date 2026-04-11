import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerRunFileChangeRoutes } from "../../../../src/api/rest/run-file-changes.js";

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
        resolveEntry: vi.fn().mockResolvedValue({
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
        resolveEntry: vi.fn().mockResolvedValue({
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

  it("returns 404 when the file-change entry is missing", async () => {
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        resolveEntry: vi.fn().mockResolvedValue(null),
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
        resolveEntry: vi.fn().mockResolvedValue({
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
        resolveEntry: vi.fn().mockResolvedValue({
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
