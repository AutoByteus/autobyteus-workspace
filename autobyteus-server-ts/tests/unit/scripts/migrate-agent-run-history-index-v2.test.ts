import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(process.cwd(), "scripts/migrate-agent-run-history-index-v2.mjs");

const writeMetadata = async (
  memoryDir: string,
  directoryRunId: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  const runDir = path.join(memoryDir, "agents", directoryRunId);
  await mkdir(runDir, { recursive: true });
  await writeFile(
    path.join(runDir, "run_metadata.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf-8",
  );
};

const readIndex = async (memoryDir: string): Promise<Array<Record<string, unknown>>> =>
  JSON.parse(
    await readFile(path.join(memoryDir, "run_history_index.json"), "utf-8"),
  ) as Array<Record<string, unknown>>;

const runScript = (memoryDir: string): Record<string, unknown> =>
  JSON.parse(
    execFileSync("node", [scriptPath, "--memory-dir", memoryDir, "--apply"], {
      encoding: "utf-8",
      stdio: "pipe",
    }),
  ) as Record<string, unknown>;

describe("migrate-agent-run-history-index-v2 script", () => {
  it("uses the scanned directory identity when metadata runId differs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run-history-index-script-mismatch-"));
    const memoryDir = path.join(root, "memory");
    await writeMetadata(memoryDir, "directory-run", {
      runId: "metadata-run",
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/workspace/mismatch",
      preparedAt: "2026-03-27T10:00:00.000Z",
    });

    try {
      const report = runScript(memoryDir);
      await expect(readIndex(memoryDir)).resolves.toMatchObject([
        {
          runId: "directory-run",
          agentDefinitionId: "agent-def-1",
          workspaceRootPath: "/workspace/mismatch",
        },
      ]);
      expect(report.runIdMismatches).toEqual([
        {
          directoryRunId: "directory-run",
          metadataRunId: "metadata-run",
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("skips metadata without a usable workspaceRootPath", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "run-history-index-script-workspace-"));
    const memoryDir = path.join(root, "memory");
    await writeMetadata(memoryDir, "run-good", {
      runId: "run-good",
      agentDefinitionId: "agent-good",
      workspaceRootPath: "/workspace/good",
      preparedAt: "2026-03-27T10:00:00.000Z",
    });
    await writeMetadata(memoryDir, "run-bad", {
      runId: "run-bad",
      agentDefinitionId: "agent-bad",
      preparedAt: "2026-03-27T11:00:00.000Z",
    });

    try {
      const report = runScript(memoryDir);
      await expect(readIndex(memoryDir)).resolves.toMatchObject([
        {
          runId: "run-good",
          workspaceRootPath: "/workspace/good",
        },
      ]);
      expect(report.invalidMetadata).toEqual([
        {
          runId: "run-bad",
          error: "workspaceRootPath cannot be empty.",
        },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
