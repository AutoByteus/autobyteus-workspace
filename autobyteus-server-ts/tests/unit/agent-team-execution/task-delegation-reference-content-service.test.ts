import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TaskDelegationReferenceContentError,
  TaskDelegationReferenceContentService,
} from "../../../src/agent-team-execution/task-delegation/task-delegation-reference-content-service.js";

const readStreamAsText = async (stream: NodeJS.ReadableStream): Promise<string> =>
  new Promise((resolve, reject) => {
    let content = "";
    stream.setEncoding("utf-8");
    stream.on("data", (chunk) => { content += chunk; });
    stream.on("error", reject);
    stream.on("end", () => resolve(content));
  });

describe("TaskDelegationReferenceContentService", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "task-reference-content-"));
    tempDirs.push(dir);
    return dir;
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("resolves content through teamRunId + taskId + referenceId identity", async () => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "requirements.md");
    await fs.writeFile(filePath, "# Requirements", "utf-8");
    const service = new TaskDelegationReferenceContentService({
      getExisting: (teamRunId: string) => {
        expect(teamRunId).toBe("team-1");
        return {
          resolveTaskReference: (input: { taskId: string; referenceId: string }) => {
            expect(input).toEqual({ taskId: "task_0001", referenceId: "ref-1" });
            return {
              record: { taskId: "task_0001" },
              reference: {
                referenceId: "ref-1",
                path: filePath,
                type: "file",
                createdAt: "2026-06-28T00:00:00.000Z",
                updatedAt: "2026-06-28T00:00:00.000Z",
              },
            };
          },
        } as any;
      },
    });

    const resolved = await service.resolveContent({ teamRunId: "team-1", taskId: "task_0001", referenceId: "ref-1" });

    expect(resolved.absolutePath).toBe(filePath);
    expect(resolved.mimeType).toBe("text/markdown");
    expect(await readStreamAsText(resolved.stream)).toBe("# Requirements");
  });

  it("returns not-found when the task delegation service or reference is unavailable", async () => {
    const service = new TaskDelegationReferenceContentService({ getExisting: () => null });

    await expect(
      service.resolveContent({ teamRunId: "team-1", taskId: "task_0001", referenceId: "missing" }),
    ).rejects.toMatchObject({
      name: "TaskDelegationReferenceContentError",
      code: "REFERENCE_NOT_FOUND",
    } satisfies Partial<TaskDelegationReferenceContentError>);
  });
});
