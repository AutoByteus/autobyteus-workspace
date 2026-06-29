import { Readable } from "node:stream";
import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerTaskDelegationRoutes } from "../../../src/api/rest/task-delegation.js";
import { TaskDelegationReferenceContentError } from "../../../src/agent-team-execution/task-delegation/task-delegation-reference-content-service.js";

describe("task delegation REST routes", () => {
  let app: ReturnType<typeof fastify> | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it("serves task-owned reference content by teamRunId + taskId + referenceId", async () => {
    app = fastify();
    await registerTaskDelegationRoutes(app, {
      contentService: {
        resolveContent: async (input) => {
          expect(input).toEqual({ teamRunId: "team-1", taskId: "task_0001", referenceId: "ref-1" });
          return {
            record: { taskId: "task_0001" },
            reference: { referenceId: "ref-1", path: "/tmp/ref.md", type: "file", createdAt: "now", updatedAt: "now" },
            absolutePath: "/tmp/ref.md",
            mimeType: "text/markdown",
            stream: Readable.from(["# Task reference"]),
          } as any;
        },
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/team-runs/team-1/task-delegations/task_0001/references/ref-1/content",
    });

    expect(response.statusCode).toBe(200);
    expect(response.payload).toBe("# Task reference");
    expect(String(response.headers["content-type"])).toContain("text/markdown");
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("maps unreadable task reference content failures to graceful REST errors", async () => {
    app = fastify();
    await registerTaskDelegationRoutes(app, {
      contentService: {
        resolveContent: async () => {
          throw new TaskDelegationReferenceContentError(
            "REFERENCE_CONTENT_FORBIDDEN",
            "Referenced task file content is not readable.",
          );
        },
      } as any,
    });

    const response = await app.inject({
      method: "GET",
      url: "/team-runs/team-1/task-delegations/task_0001/references/ref-1/content",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      code: "REFERENCE_CONTENT_FORBIDDEN",
      detail: "Referenced task file content is not readable.",
    });
  });
});
