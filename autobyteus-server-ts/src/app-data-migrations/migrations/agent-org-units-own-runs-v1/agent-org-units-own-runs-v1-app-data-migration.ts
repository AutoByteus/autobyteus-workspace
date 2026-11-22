import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail, AppDataMigrationRecordRepositoryLike,
} from "../../domain/app-data-migration-types.js";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "../../domain/run-history-catalog-invalidation.js";
import { classifyOrgFile } from "./released-org-tree-v1.js";
import { ORG_TREE_FILE, memoryLayout, readJson, writeJsonAtomic } from "./org-unit-targets.js";
import { containerUnits, convertReleasedOrg, OrgConversionWaits } from "./org-conversion.js";
import { delegationFiles, rewriteOrgDelegations, type UnitRunRef } from "./org-delegations.js";

export const AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID = "20261122_agent_org_units_own_runs_v1";

/**
 * Earlier migrations that read the released Org shapes this one converts (guideline §4 "Registry order and late
 * predecessors"): while one of them is not terminal (`FAILED`, or `NOT_RUN` behind a failed prerequisite), every Org is
 * left as it is (`waiting_for_<id>`), and that predecessor's follow-up converts it afterwards.
 */
export const READER_PREDECESSORS: readonly string[] = [
  "20260905_agent_org_history_first_message_summary_v1",
  "20260926_team_context_file_execution_locators_v1",
  "20261015_collaborators_to_delegated_runs_v1",
  "20261017_task_agent_own_run_v1",
  "20261019_delegated_copy_own_file_complete_v1",
];

/** A run of this conversion: its ID and prerequisites (ours, or a follow-up's), shown to the user. */
export type OrgUnitsPlan = Readonly<{ id: string; displayName: string; description: string; prerequisiteMigrationIds: readonly string[] }>;

const DEFAULT_PLAN: OrgUnitsPlan = {
  id: AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID,
  displayName: "Org units become runs of their own",
  description: "Converts each stored Org run into a container: each mounted Team becomes a Team run and each direct agent an agent run of its own, "
    + "with their messages and delegations; the Org keeps its units and its own rules.",
  prerequisiteMigrationIds: [],
};

const TERMINAL = new Set(["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"]);
const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);
type Json = Record<string, unknown>;

/**
 * `20261122_agent_org_units_own_runs_v1` (org-teams-follow-definition, design DS-005, storage contract §9): every stored Org
 * run, by its file: a released Org tree v1 is converted (`convertReleasedOrg`); a container is already done (its
 * delegations and the top-level indexes are made current again, idempotently, for what a late predecessor wrote); an Org
 * folder without a tree is a preserved skip (warning); an Org that cannot be converted is `FAILED` alone (isolated: today's
 * readiness never admits a released tree, so it never loads; never a startup lockout). `requiredOnStartup`, no hold.
 * Rollback is not possible: an older build cannot read a container (release notes).
 */
export class AgentOrgUnitsOwnRunsV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds: readonly string[];

  constructor(private readonly appDataDir: string, private readonly memoryDir: string, private readonly names: DefinitionNameLookup,
    private readonly catalogs: RunHistoryCatalogInvalidation | null,
    private readonly options: Readonly<{ ledger: Pick<AppDataMigrationRecordRepositoryLike, "getRecord">; plan?: OrgUnitsPlan }>) {
    const plan = options.plan ?? DEFAULT_PLAN;
    this.id = plan.id;
    this.displayName = plan.displayName;
    this.description = plan.description;
    this.prerequisiteMigrationIds = plan.prerequisiteMigrationIds;
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const orgs = await this.orgRunIds();
    const waiting = await this.waitingFor();
    if (waiting) {
      for (const orgRunId of orgs) details.push({ itemId: orgRunId, status: "SKIPPED", message: `waiting_for_${waiting}: the Org is left as it is.` });
      return this.result(details, orgs.length);
    }
    const files = await delegationFiles(this.appDataDir, this.memoryDir);
    const contained: UnitRunRef[] = [];
    for (const orgRunId of orgs) {
      try { details.push(await this.convertOne(orgRunId, files, contained)); }
      catch (error) {
        details.push(error instanceof OrgConversionWaits
          ? { itemId: orgRunId, status: "SKIPPED", message: `waiting: ${error.message}; the Org is left as it is.` }
          : { itemId: orgRunId, filePath: path.join(memoryLayout(this.memoryDir).orgDir(orgRunId), ORG_TREE_FILE), status: "FAILED",
            message: `The Org was not converted and is not loaded: ${errorText(error)}` });
      }
    }
    await this.dropContainedRows(contained);
    return this.result(details, orgs.length);
  }

  private async convertOne(orgRunId: string, files: readonly string[], contained: UnitRunRef[]): Promise<AppDataMigrationItemDetail> {
    const file = path.join(memoryLayout(this.memoryDir).orgDir(orgRunId), ORG_TREE_FILE);
    const raw = await readJson(file);
    if (raw === null) return { itemId: orgRunId, filePath: file, status: "SKIPPED", message: "Preserved: the Org run has no tree (left as it is)." };
    const kind = classifyOrgFile(raw);
    if (kind === "unknown") throw new Error("its file is neither a released Org tree nor a container");
    const units = kind === "container" ? await containerUnits(this.memoryDir, raw as Json)
      : await convertReleasedOrg({ memoryDir: this.memoryDir, orgRunId, raw, names: this.names });
    contained.push(...units.unitRuns);
    const delegations = await rewriteOrgDelegations(files, orgRunId, units.unitOf);
    const notes = [
      delegations.rewritten ? `${delegations.rewritten} delegation(s) now name their unit run` : null,
      delegations.withoutDelegator ? `${delegations.withoutDelegator} old delegation(s) without a delegator stay with the Org (preserved history)` : null,
      units.logKeptAsResidue ? `${units.unroutedLines} log line(s) no unit has: the Org log is kept as residue` : null,
    ].filter(Boolean);
    if (kind === "container" && !delegations.rewritten) return { itemId: orgRunId, filePath: file, status: "SKIPPED", message: "Already a container." };
    return { itemId: orgRunId, filePath: file, status: "MIGRATED",
      message: `${kind === "container" ? "Container made current" : "Converted to a container"}${notes.length ? `: ${notes.join("; ")}` : ""}.` };
  }

  /** The first reader predecessor that is not terminal; `null` when none is waited for. */
  private async waitingFor(): Promise<string | null> {
    for (const id of READER_PREDECESSORS) {
      const record = await this.options.ledger.getRecord(id);
      if (record && !TERMINAL.has(record.status)) return id;
    }
    return null;
  }

  /**
   * Contract §8: unit runs are not top-level runs. A late rebuild of the top-level indexes (run-history-index-v2, which
   * rebuilds from every `agents/*` run file) may have listed one; it is removed (the Org's own row stays).
   */
  private async dropContainedRows(units: readonly UnitRunRef[]): Promise<void> {
    const agents = new Set(units.filter((unit) => unit.kind === "agent").map((unit) => unit.runId));
    const teams = new Set(units.filter((unit) => unit.kind === "agent_team").map((unit) => unit.runId));
    const drop = async (file: string, key: "runId" | "teamRunId", ids: ReadonlySet<string>): Promise<boolean> => {
      const rows = await readJson(file).catch(() => null);
      if (!Array.isArray(rows)) return false;
      const kept = rows.filter((row) => !(row && typeof row === "object" && ids.has(String((row as Json)[key]))));
      if (kept.length === rows.length) return false;
      await writeJsonAtomic(file, kept);
      return true;
    };
    if (agents.size && await drop(path.join(this.memoryDir, "run_history_index.json"), "runId", agents)) this.catalogs?.agentRunHistoryChanged(this.memoryDir);
    if (teams.size && await drop(path.join(this.memoryDir, "team_run_history_index.json"), "teamRunId", teams)) {
      this.catalogs?.collaborationRunHistoryChanged(this.memoryDir, "agent_team");
    }
  }

  private async orgRunIds(): Promise<string[]> {
    const root = path.join(this.memoryDir, "agent_orgs");
    const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; });
    return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name).sort();
  }

  private result(details: AppDataMigrationItemDetail[], scannedCount: number): AppDataMigrationExecutionResult {
    const failed = details.filter((detail) => detail.status === "FAILED");
    const warned = details.some((detail) => detail.status === "SKIPPED" && !detail.message.startsWith("Already"));
    if (details.some((detail) => detail.status === "MIGRATED")) {
      this.catalogs?.collaborationRunHistoryChanged(this.memoryDir, "agent_org");
    }
    return {
      status: failed.length ? "FAILED" : warned ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary: { scannedCount, migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
        skippedCount: details.filter((detail) => detail.status === "SKIPPED").length, failedCount: failed.length, details },
      errorMessage: failed.length ? `${failed.length} Org run(s) could not be converted: ${failed.map((detail) => detail.itemId).join(", ")}.` : null,
    };
  }
}
