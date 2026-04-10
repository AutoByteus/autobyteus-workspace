import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerRunFileChangeRoutes } from "../../../../src/api/rest/run-file-changes.js";

describe("REST run-file-change routes", () => {
  it("returns committed file-change content from the projection service", async () => {
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        getEntry: vi.fn().mockResolvedValue({
          path: "src/test.md",
          content: "# Hello",
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=src%2Ftest.md",
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("# Hello");
  });

  it("returns 404 when the file-change entry is missing", async () => {
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        getEntry: vi.fn().mockResolvedValue(null),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=src%2Fmissing.md",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: "File change not found" });
  });

  it("returns 409 when the file-change row exists but committed content is not ready yet", async () => {
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        getEntry: vi.fn().mockResolvedValue({
          path: "src/pending.md",
          status: "pending",
          content: null,
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

  it("returns 415 for non-text file-change preview requests", async () => {
    const app = fastify();
    await registerRunFileChangeRoutes(app, {
      projectionService: {
        getEntry: vi.fn().mockResolvedValue({
          path: "/Users/normy/Downloads/image.png",
          status: "available",
          content: "not-real-binary-data",
        }),
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/runs/run-1/file-change-content?path=%2FUsers%2Fnormy%2FDownloads%2Fimage.png",
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ detail: "Preview is not available for non-text file changes" });
  });
});
