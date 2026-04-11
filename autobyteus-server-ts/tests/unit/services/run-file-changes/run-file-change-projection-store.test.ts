import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunFileChangeProjectionStore } from "../../../../src/services/run-file-changes/run-file-change-projection-store.js";

describe("RunFileChangeProjectionStore", () => {
  const tempDirs: string[] = [];

  const createTempDir = async (): Promise<string> => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "run-file-change-store-"));
    tempDirs.push(tempDir);
    return tempDir;
  };

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it("writes canonical file_changes.json and strips transient content", async () => {
    const memoryDir = await createTempDir();
    const store = new RunFileChangeProjectionStore();

    await store.writeProjection(memoryDir, {
      version: 2,
      entries: [
        {
          id: "run-1:src/test.txt",
          runId: "run-1",
          path: "src/test.txt",
          type: "file",
          status: "available",
          sourceTool: "write_file",
          sourceInvocationId: "write-1",
          content: "transient live buffer",
          createdAt: "2026-04-10T00:00:00.000Z",
          updatedAt: "2026-04-10T00:00:01.000Z",
        },
      ],
    });

    const projectionPath = path.join(memoryDir, "file_changes.json");
    const raw = JSON.parse(await fs.readFile(projectionPath, "utf-8"));

    expect(raw).toEqual({
      version: 2,
      entries: [
        {
          id: "run-1:src/test.txt",
          runId: "run-1",
          path: "src/test.txt",
          type: "file",
          status: "available",
          sourceTool: "write_file",
          sourceInvocationId: "write-1",
          createdAt: "2026-04-10T00:00:00.000Z",
          updatedAt: "2026-04-10T00:00:01.000Z",
        },
      ],
    });
  });

  it("returns an empty projection when only the removed legacy projection path exists", async () => {
    const memoryDir = await createTempDir();
    const legacyProjectionPath = path.join(memoryDir, "run-file-changes", "projection.json");
    await fs.mkdir(path.dirname(legacyProjectionPath), { recursive: true });
    await fs.writeFile(
      legacyProjectionPath,
      JSON.stringify({
        version: 1,
        entries: [
          {
            id: "legacy",
            runId: "run-1",
            path: "src/legacy.txt",
            type: "file",
            status: "available",
            sourceTool: "edit_file",
            sourceInvocationId: "edit-1",
            content: "historical content",
            createdAt: "2026-04-10T00:00:00.000Z",
            updatedAt: "2026-04-10T00:00:01.000Z",
          },
        ],
      }),
      "utf-8",
    );

    const projection = await new RunFileChangeProjectionStore().readProjection(memoryDir);

    expect(projection).toEqual({
      version: 2,
      entries: [],
    });
  });
});
