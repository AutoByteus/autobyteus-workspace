import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const scriptPath = path.resolve(process.cwd(), "scripts/cleanup-codex-e2e-run-history.mjs");

const seedRunHistory = async (memoryDir: string): Promise<void> => {
  await mkdir(path.join(memoryDir, "agents", "run-clean-target"), { recursive: true });
  await mkdir(path.join(memoryDir, "agents", "run-keep"), { recursive: true });
  const index = {
    version: 1,
    rows: [
      {
        runId: "run-clean-target",
        workspaceRootPath: path.join(os.tmpdir(), "codex-continue-workspace-e2e-abc123"),
      },
      {
        runId: "run-keep",
        workspaceRootPath: path.join(os.tmpdir(), "customer-workspace"),
      },
    ],
  };
  await writeFile(
    path.join(memoryDir, "run_history_index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf-8",
  );
};

const readRowIds = async (memoryDir: string): Promise<string[]> => {
  const raw = await readFile(path.join(memoryDir, "run_history_index.json"), "utf-8");
  const parsed = JSON.parse(raw) as { rows: Array<{ runId: string }> };
  return parsed.rows.map((row) => row.runId);
};

const exists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

describe("cleanup-codex-e2e-run-history script", () => {
  it("does not mutate files in dry-run mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cleanup-codex-e2e-dry-run-"));
    const memoryDir = path.join(root, "memory");
    await seedRunHistory(memoryDir);

    try {
      execFileSync("node", [scriptPath, "--memory-dir", memoryDir, "--dry-run"], {
        stdio: "pipe",
      });

      const rowIds = await readRowIds(memoryDir);
      expect(rowIds).toEqual(["run-clean-target", "run-keep"]);
      expect(await exists(path.join(memoryDir, "agents", "run-clean-target"))).toBe(true);
      expect(await exists(path.join(memoryDir, "agents", "run-keep"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes only codex e2e artifact rows and run directories", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cleanup-codex-e2e-apply-"));
    const memoryDir = path.join(root, "memory");
    await seedRunHistory(memoryDir);

    try {
      execFileSync("node", [scriptPath, "--memory-dir", memoryDir], {
        stdio: "pipe",
      });

      const rowIds = await readRowIds(memoryDir);
      expect(rowIds).toEqual(["run-keep"]);
      expect(await exists(path.join(memoryDir, "agents", "run-clean-target"))).toBe(false);
      expect(await exists(path.join(memoryDir, "agents", "run-keep"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
