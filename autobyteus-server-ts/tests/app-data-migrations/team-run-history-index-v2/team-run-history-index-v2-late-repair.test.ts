import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeamRunHistoryIndexV2AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-history-index-v2/team-run-history-index-v2-migration.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";

/**
 * autobyteus-500 G-2 (FU-029, REQ-013, AC-010): `20260521_team_run_history_index_v2` runs late over a pre-v2 index (failed and
 * retried, or behind a failed prerequisite), on data where `team-run-execution-tree-v1` ran: team runs have a current tree
 * and no metadata file. Every team run whose folder holds a current tree stays listed through the current reader (a legacy
 * row is rebuilt, a valid row is kept); a row whose folder is gone is removed; a folder without a tree is omitted. A second
 * start changes nothing. Hand-built data.
 */
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const put = async (file: string, value: unknown) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify(value, null, 2)); };
const tree = (teamDefinitionId: string, teamDefinitionName: string, createdAt: string) => ({ createdAt, archivedAt: null,
  rootTeam: { teamDefinitionId, teamDefinitionName, defaultLaunchConfiguration: { workspaceRootPath: "/work/space", runtimeKind: "codex_app_server" } } });
const names = { agentDefinitionName: vi.fn(async () => null), teamDefinitionName: vi.fn(async () => "Name From Lookup") };
const catalogs = { agentRunHistoryChanged: vi.fn(), collaborationRunHistoryChanged: vi.fn() };

describe("20260521_team_run_history_index_v2 run late over a pre-v2 index (G-2)", () => {
  it("rebuilds a legacy row, keeps a valid row, removes a gone folder's row, omits a folder without a tree; a second start changes nothing", async () => {
    const memory = await fs.mkdtemp(path.join(os.tmpdir(), "team-index-late-"));
    roots.push(memory);
    // A user-started team with a current tree and a legacy (pre-v2) row: lastActivityAt, no createdAt.
    await put(path.join(memory, "agent_teams", "user_team_1", "team_run_execution_tree.json"), tree("squad", "Squad", "2026-05-01T10:00:00.000Z"));
    // A delegated team with a current tree and a row already in the current shape.
    await put(path.join(memory, "agent_teams", "delegated_team_2", "team_run_execution_tree.json"), tree("studio", "Studio", "2026-10-20T09:00:00.000Z"));
    // A folder without a tree.
    await fs.mkdir(path.join(memory, "agent_teams", "no_tree_team_4"), { recursive: true });
    const validRow = { teamRunId: "delegated_team_2", teamDefinitionId: "studio", teamDefinitionName: "Studio", workspaceRootPath: null,
      summary: "Writes the release notes", createdAt: "2026-10-20T09:00:00.000Z", archivedAt: null, terminatedAt: null };
    await put(path.join(memory, "team_run_history_index.json"), [
      { teamRunId: "user_team_1", teamDefinitionId: "squad", teamDefinitionName: "", summary: "  Plan the launch  ", lastActivityAt: "2026-05-02T08:00:00.000Z" },
      validRow,
      { teamRunId: "gone_team_3", teamDefinitionId: "x", teamDefinitionName: "X", summary: "", lastActivityAt: "2026-05-03T08:00:00.000Z" },
      { teamRunId: "no_tree_team_4", teamDefinitionId: "y", summary: "", lastActivityAt: "2026-05-04T08:00:00.000Z" },
    ]);

    const result = await new TeamRunHistoryIndexV2AppDataMigration(memory, names, catalogs).execute();

    expect(result.status).toBe("SUCCEEDED");
    const byId = new Map(result.summary.details.map((detail) => [detail.itemId, detail]));
    expect(byId.get("user_team_1"), JSON.stringify(result.summary.details)).toMatchObject({ status: "MIGRATED" });
    expect(byId.get("delegated_team_2")?.message).toContain("Kept");
    expect(byId.get("gone_team_3")?.message).toContain("Removed stale");
    expect(byId.get("no_tree_team_4")?.message).toContain("without a current tree");
    // Both teams are listed through the current reader, which rejects a whole index for one row it cannot read.
    const read = await new TeamRunHistoryIndexStore(memory).readIndexStrict();
    expect(read.rows.map((row) => row.teamRunId).sort()).toEqual(["delegated_team_2", "user_team_1"]);
    expect(read.rows.find((row) => row.teamRunId === "user_team_1")).toEqual({ teamRunId: "user_team_1", teamDefinitionId: "squad",
      teamDefinitionName: "Squad", workspaceRootPath: "/work/space", summary: "Plan the launch", createdAt: "2026-05-01T10:00:00.000Z",
      archivedAt: null, terminatedAt: null });
    expect(read.rows.find((row) => row.teamRunId === "delegated_team_2")).toEqual(validRow);
    expect(await fs.stat(path.join(memory, "agent_teams", "no_tree_team_4")).then((stat) => stat.isDirectory())).toBe(true);

    const indexAfterFirst = await fs.readFile(path.join(memory, "team_run_history_index.json"), "utf8");
    const second = await new TeamRunHistoryIndexV2AppDataMigration(memory, names, catalogs).execute();
    expect(second.status).toBe("SUCCEEDED");
    expect(await fs.readFile(path.join(memory, "team_run_history_index.json"), "utf8")).toBe(indexAfterFirst);
  });
});
