import fs from "node:fs/promises";
import path from "node:path";
import type {
  AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail, AppDataMigrationRecordRepositoryLike,
} from "../../domain/app-data-migration-types.js";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import type { RunHistoryCatalogInvalidation } from "../../domain/run-history-catalog-invalidation.js";
import { classifyOrgFile, parseReleasedOrgTreeV1 } from "./released-org-tree-v1.js";
import { ORG_TREE_FILE, memoryLayout, readJson, writeJsonAtomic } from "./org-unit-targets.js";
import { containerUnits, convertReleasedOrg, OrgConversionWaits, writeConvertedContainer, type OrgConversionResult } from "./org-conversion.js";
import { delegationFiles, rewriteOrgDelegations, type UnitRunRef } from "./org-delegations.js";
import { committedMovesOf, containerMovesOf, rewriteMovedFolderPaths, type FolderMove } from "./org-path-rewrite.js";

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

/**
 * SR-018 (R-4 (c) extended; guideline "An earlier migration can run after yours"): earlier migrations that write or move
 * files the node pass rewrites (`org-path-rewrite.ts`). While one is not terminal, every Org waits as it is; its follow-up
 * re-runs the pass, also for converted Orgs (their moves from their container files), over what it wrote late. The
 * registry classification test checks the list (`agent-org-units-late-predecessors.test.ts`):
 * - message logs: `20261018_append_only_message_logs_v1` (writes every run's append-only log),
 *   `20260701_team_communication_projection_addresses` (rewrites released Team JSON logs);
 * - traces: `20260617_raw_trace_rotation_layout` (moves archived traces into `raw_traces_<n>.jsonl`),
 *   `20260707_raw_trace_active_file_name` (renames `raw_traces.jsonl` to `raw_traces_active.jsonl`);
 * - attachment links: `20261119_delegated_run_own_attachment_links` and its follow-up (rewrite traces' `file_attachments`);
 * - Task records: `20261019_delegated_copy_own_file_complete_v1` (already a reader above, with its wait and follow-up).
 * Not writers of these fields, by their code: the project-task migrations (`projects_per_folder_v1`, `project_task_keys_v1`,
 * `project_task_titles`) write Project `task.json` files, which carry no path field the pass rewrites (`contextFiles` are
 * names in the Task's own `context/` folder); `20261030_raw_trace_manifest_runtime_names` writes manifests only; no
 * migration writes an ad-hoc `task.json`. SR-017's check: no earlier migration writes an absolute path into an Org member's
 * folder (the context-file locator migrations write owner-form locators), so a late one never adds an old prefix itself;
 * it only writes or moves a file that may already hold one.
 */
export const PATH_WRITER_PREDECESSORS: readonly string[] = [
  "20260617_raw_trace_rotation_layout",
  "20260701_team_communication_projection_addresses",
  "20260707_raw_trace_active_file_name",
  "20261018_append_only_message_logs_v1",
  "20261119_delegated_run_own_attachment_links",
  "20261119_delegated_run_own_attachment_links_after_task_agent_own_run",
];

/**
 * A run of this conversion: its ID and prerequisites (ours, or a follow-up's), shown to the user. `passOverConverted`: a
 * follow-up's node pass also moves the paths of Orgs already converted (their moves from their container files), for files
 * its predecessor wrote late (SR-018).
 */
export type OrgUnitsPlan = Readonly<{ id: string; displayName: string; description: string; prerequisiteMigrationIds: readonly string[]; passOverConverted?: boolean }>;

const DEFAULT_PLAN: OrgUnitsPlan = {
  id: AGENT_ORG_UNITS_OWN_RUNS_V1_MIGRATION_ID,
  displayName: "Org units become runs of their own",
  description: "Converts each stored Org run into a container: each mounted Team becomes a Team run and each direct agent an agent run of its own, "
    + "with their messages and delegations; the Org keeps its units and its own rules.",
  prerequisiteMigrationIds: [],
};

const TERMINAL = new Set(["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"]);
const notesOf = (delegations: Readonly<{ rewritten: number; withoutDelegator: number }>, units: OrgConversionResult): string[] => [
  delegations.rewritten ? `${delegations.rewritten} delegation(s) now name their unit run` : null,
  delegations.withoutDelegator ? `${delegations.withoutDelegator} old delegation(s) without a delegator stay with the Org (preserved history)` : null,
  units.logKeptAsResidue ? `${units.unroutedLines} log line(s) no unit has: the Org log is kept as residue` : null,
].filter((note): note is string => Boolean(note));
const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);
type Json = Record<string, unknown>;

/**
 * `20261122_agent_org_units_own_runs_v1` (org-teams-follow-definition, design DS-005, storage contract §9; SR-018's order):
 * 1. every stored Org run is classified by its file: a container is done (its delegations and the top-level indexes are
 *    made current again, idempotently, for what a late predecessor wrote); a released Org tree v1 is pending; an Org folder
 *    without a tree is a preserved skip (warning). While a reader or path writer predecessor is not terminal, every Org
 *    waits as it is (`waiting_for_<id>`);
 * 2. each pending Org's units are converted (`convertReleasedOrg`: renames, unit files, log split) and its delegations
 *    name its unit runs;
 * 3. one node pass moves the stored typed paths into every pending Org's moved folders (`rewriteMovedFolderPaths`), with
 *    each Org's committed moves from its released tree (an Org whose step 2 failed included: its moved folders are real).
 *    It finds and compares paths with the platform's own path rules: on Windows a stored path is `C:\\…\\agent_orgs\\…`
 *    (CRR-009 CR-008), so its pre-check looks for each move's resolved old folder, raw and JSON-encoded;
 * 4. last, for each pending Org whose steps 2 and 3 succeeded, the container file replaces the released tree: the one
 *    completion marker. A crash anywhere before it leaves the released tree, and the next start repeats 2 and 3.
 * An Org that cannot be converted is `FAILED` alone (isolated: today's readiness never admits a released tree, so it never
 * loads; never a startup lockout). `requiredOnStartup`, no hold. Rollback is not possible: an older build cannot read a
 * container (release notes).
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
    const moves: FolderMove[] = [];
    const converted: Array<Readonly<{ orgRunId: string; file: string; raw: unknown; notes: string[] }>> = [];
    for (const orgRunId of orgs) {
      const file = path.join(memoryLayout(this.memoryDir).orgDir(orgRunId), ORG_TREE_FILE);
      try {
        const step = await this.convertOne(orgRunId, file, files, contained, moves);
        if ("detail" in step) details.push(step.detail);
        else converted.push({ orgRunId, file, raw: step.raw, notes: step.notes });
      } catch (error) {
        details.push(error instanceof OrgConversionWaits
          ? { itemId: orgRunId, status: "SKIPPED", message: `waiting: ${error.message}; the Org is left as it is.` }
          : { itemId: orgRunId, filePath: file, status: "FAILED", message: `The Org was not converted and is not loaded: ${errorText(error)}` });
      }
    }
    // Step 3: one node pass with every Org's moves; then step 4, the container file, per Org whose part succeeded.
    const pass = await rewriteMovedFolderPaths({ appDataDir: this.appDataDir, memoryDir: this.memoryDir, moves });
    for (const org of converted) {
      const failure = pass.failed.get(org.orgRunId);
      if (failure) {
        details.push({ itemId: org.orgRunId, filePath: org.file, status: "FAILED", message: `The Org was not converted and is not loaded: ${failure}` });
        continue;
      }
      try {
        await writeConvertedContainer(this.memoryDir, org.orgRunId, org.raw);
        details.push({ itemId: org.orgRunId, filePath: org.file, status: "MIGRATED", message: `Converted to a container${org.notes.length ? `: ${org.notes.join("; ")}` : ""}.` });
      } catch (error) {
        details.push({ itemId: org.orgRunId, filePath: org.file, status: "FAILED", message: `The Org was not converted and is not loaded: ${errorText(error)}` });
      }
    }
    await this.dropContainedRows(contained);
    // One detail per Org, in the Orgs' order (a converted Org's detail is known only after step 4).
    details.sort((a, b) => orgs.indexOf(a.itemId) - orgs.indexOf(b.itemId));
    return this.result(details, orgs.length);
  }

  /**
   * Steps 1 and 2 for one Org: a container's delegations made current (its moves joined for a follow-up's pass); a released
   * tree's units converted and its delegations rewritten, its committed moves joined (also when a step failed: the folders
   * it moved are real), its container file left for step 4.
   */
  private async convertOne(orgRunId: string, file: string, files: readonly string[], contained: UnitRunRef[], moves: FolderMove[]):
    Promise<Readonly<{ detail: AppDataMigrationItemDetail }> | Readonly<{ raw: unknown; notes: string[] }>> {
    const raw = await readJson(file);
    if (raw === null) return { detail: { itemId: orgRunId, filePath: file, status: "SKIPPED", message: "Preserved: the Org run has no tree (left as it is)." } };
    const kind = classifyOrgFile(raw);
    if (kind === "unknown") throw new Error("its file is neither a released Org tree nor a container");
    if (kind === "container") {
      if (this.passOverConverted) moves.push(...containerMovesOf(this.memoryDir, raw as Json));
      const units = await containerUnits(this.memoryDir, raw as Json);
      contained.push(...units.unitRuns);
      const delegations = await rewriteOrgDelegations(files, orgRunId, units.unitOf);
      if (!delegations.rewritten) return { detail: { itemId: orgRunId, filePath: file, status: "SKIPPED", message: "Already a container." } };
      return { detail: { itemId: orgRunId, filePath: file, status: "MIGRATED", message: `Container made current: ${notesOf(delegations, units).join("; ")}.` } };
    }
    let units: OrgConversionResult;
    try {
      units = await convertReleasedOrg({ memoryDir: this.memoryDir, orgRunId, raw, names: this.names });
    } finally {
      const tree = (() => { try { return parseReleasedOrgTreeV1(raw, orgRunId); } catch { return null; } })();
      if (tree) moves.push(...await committedMovesOf(this.memoryDir, tree));
    }
    contained.push(...units.unitRuns);
    const delegations = await rewriteOrgDelegations(files, orgRunId, units.unitOf);
    return { raw, notes: notesOf(delegations, units) };
  }

  private get passOverConverted(): boolean { return this.options.plan?.passOverConverted === true; }

  /** The first reader or path writer predecessor that is not terminal; `null` when none is waited for. */
  private async waitingFor(): Promise<string | null> {
    for (const id of [...READER_PREDECESSORS, ...PATH_WRITER_PREDECESSORS]) {
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
