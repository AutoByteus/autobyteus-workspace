import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TeamRunExecutionTreeSnapshot } from "../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunHistoryIndexReconciler } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";

const fixturePath = path.resolve(
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only/team_run_execution_tree.json",
);

describe("TeamRunHistoryIndexReconciler", () => {
  let tempDir: string;
  let memoryDir: string;
  let backupRoot: string;
  let tree: TeamRunExecutionTreeSnapshot;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-history-reconcile-"));
    memoryDir = path.join(tempDir, "memory");
    backupRoot = path.join(tempDir, "backups");
    await fs.mkdir(memoryDir, { recursive: true });
    const payload = JSON.parse(await fs.readFile(fixturePath, "utf8")) as unknown;
    tree = validateTeamRunExecutionTreePayload(payload, "team-run-root");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("projects exactly the validated roots, preserves index-only fields, backs up once, and is idempotent", async () => {
    const indexPath = path.join(memoryDir, "team_run_history_index.json");
    const original = [{
      teamRunId: "team-run-root",
      teamDefinitionId: "old-definition",
      teamDefinitionName: "Old Name",
      workspaceRootPath: "/old/workspace",
      summary: "Preserved summary",
      createdAt: "2000-01-01T00:00:00.000Z",
      archivedAt: null,
      terminatedAt: "2026-08-01T00:00:00.000Z",
    }, {
      teamRunId: "stale-root",
      teamDefinitionId: "stale-definition",
      teamDefinitionName: "Stale",
      workspaceRootPath: null,
      summary: "stale",
      createdAt: "1999-01-01T00:00:00.000Z",
      archivedAt: null,
      terminatedAt: null,
    }];
    await fs.writeFile(indexPath, `${JSON.stringify(original, null, 2)}\n`, "utf8");
    const reconciler = new TeamRunHistoryIndexReconciler(memoryDir, backupRoot, {
      now: () => new Date("2026-08-16T20:00:00.000Z"),
    });

    const first = await reconciler.reconcile(new Map([["team-run-root", tree]]));

    expect(first).toMatchObject({ kind: "APPLIED", changed: true, projectedCount: 1 });
    if (first.kind !== "APPLIED") throw new Error(first.message);
    expect(first.backupPath).toContain(path.join("team-history-index", "2026-08-16T20-00-00-000Z"));
    expect(JSON.parse(await fs.readFile(path.join(first.backupPath!, "team_run_history_index.json"), "utf8"))).toEqual(original);
    const rows = JSON.parse(await fs.readFile(indexPath, "utf8")) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      teamRunId: "team-run-root",
      teamDefinitionId: tree.rootTeam.teamDefinitionId,
      teamDefinitionName: tree.rootTeam.teamDefinitionName,
      workspaceRootPath: "/workspace/software-engineering",
      summary: "Preserved summary",
      createdAt: tree.createdAt,
      terminatedAt: "2026-08-01T00:00:00.000Z",
    });

    const second = await reconciler.reconcile(new Map([["team-run-root", tree]]));
    expect(second).toEqual({
      kind: "APPLIED",
      changed: false,
      projectedCount: 1,
      backupPath: null,
    });
    expect(await fs.readdir(path.join(backupRoot, "team-history-index"))).toHaveLength(1);
  });

  it("treats a missing index as empty and recovers a best-effort coordinator summary", async () => {
    const traceDir = path.join(memoryDir, "agent_teams", "team-run-root", "agent-run-product-manager");
    await fs.mkdir(traceDir, { recursive: true });
    await fs.writeFile(path.join(traceDir, "raw_traces_active.jsonl"), `${JSON.stringify({
      trace_type: "user",
      content: "  Build a reliable migration   for team history. ",
      ts: 1,
    })}\n`, "utf8");

    const result = await new TeamRunHistoryIndexReconciler(memoryDir, backupRoot)
      .reconcile(new Map([["team-run-root", tree]]));

    expect(result).toEqual({
      kind: "APPLIED",
      changed: true,
      projectedCount: 1,
      backupPath: null,
    });
    const rows = JSON.parse(await fs.readFile(path.join(memoryDir, "team_run_history_index.json"), "utf8")) as Array<Record<string, unknown>>;
    expect(rows[0]?.summary).toBe("Build a reliable migration for team history.");
  });

  it("rejects malformed index input without changing its bytes or creating a backup", async () => {
    const indexPath = path.join(memoryDir, "team_run_history_index.json");
    const malformed = "{\"not\":\"an index\"}\n";
    await fs.writeFile(indexPath, malformed, "utf8");

    await expect(new TeamRunHistoryIndexReconciler(memoryDir, backupRoot)
      .reconcile(new Map([["team-run-root", tree]])))
      .resolves.toEqual(expect.objectContaining({
        kind: "WARNING",
        message: expect.stringContaining("Invalid team run history index format"),
      }));
    expect(await fs.readFile(indexPath, "utf8")).toBe(malformed);
    await expect(fs.access(backupRoot)).rejects.toThrow();
  });
});
