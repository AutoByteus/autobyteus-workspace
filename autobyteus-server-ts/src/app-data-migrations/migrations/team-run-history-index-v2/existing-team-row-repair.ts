import fs from "node:fs/promises";
import path from "node:path";
import type { AppDataMigrationItemDetail } from "../../domain/app-data-migration-types.js";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { TeamRunIndexRowRecord } from "../../frozen/server/run-history/store/team-run-history-index-record-types.js";
import { canonicalizeWorkspaceRootPath } from "../../frozen/server/run-history/utils/workspace-path-normalizer.js";
import { compactSummary } from "../../frozen/server/run-history/services/run-history-service-helpers.js";

/**
 * autobyteus-500 G-2 (FU-029), a same-ID repair of `20260521_team_run_history_index_v2`: an existing index row whose team
 * run has no `team_run_metadata.json` (461 moved delegated teams to their own files) was dropped as stale. When the
 * migration runs late over a pre-v2 index, its rows may be legacy-shaped, and the current reader rejects the whole index
 * for one row it cannot read. Each such row is now:
 * 1. removed when the folder `agent_teams/{teamRunId}/` is gone (stale, as before);
 * 2. kept, values unchanged, when it passes the reader's row rules;
 * 3. else rebuilt as a current row from the row and the folder's `team_run_execution_tree.json` (read tolerantly);
 * 4. omitted (`SKIPPED`, a warning) when the folder has no readable tree; the folder is left as it is.
 * Every written row goes through the frozen store's `writeIndex` (its `normalizeRow`), so the index passes the reader.
 */

/** The current reader's row rules (`team-run-history-index-store.ts` row parse), frozen here: the key set and types. */
const ROW_KEYS = new Set(["teamRunId", "teamDefinitionId", "teamDefinitionName", "workspaceRootPath", "summary", "createdAt",
  "archivedAt", "terminatedAt"]);
const optionalString = (value: unknown): boolean => value === undefined || value === null || typeof value === "string";
export const passesCurrentRowRules = (row: Record<string, unknown>): boolean =>
  Object.keys(row).every((key) => ROW_KEYS.has(key))
  && typeof row.teamRunId === "string" && typeof row.teamDefinitionId === "string" && row.teamDefinitionId.trim() !== ""
  && typeof row.teamDefinitionName === "string" && row.teamDefinitionName.trim() !== ""
  && (typeof row.workspaceRootPath === "string" || row.workspaceRootPath === null)
  && typeof row.summary === "string" && typeof row.createdAt === "string" && row.createdAt.trim() !== ""
  && optionalString(row.archivedAt) && optionalString(row.terminatedAt);

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const time = (value: unknown): string | null => {
  const value_ = text(value);
  return value_ && !Number.isNaN(Date.parse(value_)) ? new Date(value_).toISOString() : null;
};
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exists = (target: string) => fs.stat(target).then((stat) => stat.isDirectory(), () => false);
const birthtime = async (target: string): Promise<string | null> => {
  try {
    const value = (await fs.stat(target)).birthtime;
    return Number.isFinite(value.getTime()) && value.getTime() > 0 ? value.toISOString() : null;
  } catch { return null; }
};

/** The tree's fields this repair reads, each with its type checked; null when the file is missing or not JSON. */
const readTree = async (teamDir: string) => {
  let raw: unknown;
  try { raw = JSON.parse(await fs.readFile(path.join(teamDir, "team_run_execution_tree.json"), "utf8")); } catch { return null; }
  const tree = record(raw);
  if (!tree) return null;
  const rootTeam = record(tree.rootTeam);
  const launch = record(rootTeam?.defaultLaunchConfiguration);
  return { createdAt: time(tree.createdAt), archivedAt: time(tree.archivedAt), teamDefinitionId: text(rootTeam?.teamDefinitionId),
    teamDefinitionName: text(rootTeam?.teamDefinitionName), workspaceRootPath: text(launch?.workspaceRootPath) };
};

export type ExistingRowRepair = Readonly<{
  memoryDir: string;
  migrationTime: string;
  definitionNames: DefinitionNameLookup;
  details: AppDataMigrationItemDetail[];
  rowsById: Map<string, TeamRunIndexRowRecord>;
  indexPath: string;
}>;

/** Steps 1-4 for every existing row the metadata scan did not rebuild. */
export const repairExistingTeamRows = async (
  input: ExistingRowRepair,
  existingRows: ReadonlyMap<string, Record<string, unknown>>,
  rebuiltTeamRunIds: ReadonlySet<string>,
): Promise<void> => {
  for (const [teamRunId, row] of existingRows) {
    if (rebuiltTeamRunIds.has(teamRunId)) continue;
    const detail = (status: AppDataMigrationItemDetail["status"], message: string) =>
      input.details.push({ itemId: teamRunId, filePath: input.indexPath, status, message });
    const teamDir = path.join(input.memoryDir, "agent_teams", teamRunId);
    if (!SAFE_ID.test(teamRunId) || !(await exists(teamDir))) {
      detail("SKIPPED", "Removed stale existing team index row because no team folder was found.");
      continue;
    }
    if (passesCurrentRowRules(row)) {
      input.rowsById.set(teamRunId, { teamRunId, teamDefinitionId: row.teamDefinitionId as string,
        teamDefinitionName: row.teamDefinitionName as string, workspaceRootPath: row.workspaceRootPath as string | null,
        summary: row.summary as string, createdAt: row.createdAt as string,
        archivedAt: (row.archivedAt as string | null | undefined) ?? null, terminatedAt: (row.terminatedAt as string | null | undefined) ?? null });
      detail("SKIPPED", "Kept the existing team index row (a team run without metadata, in the current row shape).");
      continue;
    }
    const tree = await readTree(teamDir);
    if (!tree) {
      detail("SKIPPED", "Team folder without a current tree; legacy row omitted (the folder is left as it is).");
      continue;
    }
    const teamDefinitionId = tree.teamDefinitionId ?? text(row.teamDefinitionId);
    if (!teamDefinitionId) {
      detail("FAILED", "Legacy row and tree name no team definition; no row written.");
      continue;
    }
    const warnings: string[] = [];
    let teamDefinitionName = text(row.teamDefinitionName) ?? tree.teamDefinitionName;
    if (!teamDefinitionName) {
      teamDefinitionName = (await input.definitionNames.teamDefinitionName(teamDefinitionId).catch(() => null))?.trim() || null;
    }
    if (!teamDefinitionName) { teamDefinitionName = teamDefinitionId; warnings.push("teamDefinitionName fallback to the ID"); }
    const workspace = tree.workspaceRootPath ?? text(row.workspaceRootPath);
    let createdAt = time(row.createdAt) ?? tree.createdAt ?? await birthtime(teamDir);
    if (!createdAt) {
      createdAt = time(row.lastActivityAt);
      if (createdAt) warnings.push("createdAt from the legacy lastActivityAt");
    }
    if (!createdAt) { createdAt = input.migrationTime; warnings.push("createdAt is the migration time"); }
    input.rowsById.set(teamRunId, {
      teamRunId,
      teamDefinitionId,
      teamDefinitionName,
      workspaceRootPath: workspace ? canonicalizeWorkspaceRootPath(workspace) : null,
      summary: compactSummary(text(row.summary) ?? ""),
      createdAt,
      archivedAt: time(row.archivedAt) ?? tree.archivedAt,
      terminatedAt: time(row.terminatedAt),
    });
    detail("MIGRATED", `Rebuilt a legacy team index row from it and the team's tree${warnings.length ? ` (warning: ${warnings.join("; ")})` : ""}.`);
  }
};
