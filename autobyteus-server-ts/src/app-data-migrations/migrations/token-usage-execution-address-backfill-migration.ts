import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { createConfiguredPrismaClient } from "../../config/prisma-client-factory.js";
import { TASK_DELEGATION_RECORDS_FILE_NAME } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import { normalizeTaskDelegationRecordsFile } from "../../agent-team-execution/task-delegation/records/task-delegation-records-normalizer.js";
import {
  buildTokenUsageExecutionAddress,
  lastTokenUsageExecutionAddressSegment,
  normalizeTokenUsageExecutionAddress,
  stableTokenUsageExecutionAddressKey,
  type TokenUsageExecutionAddress,
  type TokenUsageExecutionAddressSegment,
} from "../../token-usage/domain/execution-address.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260703_token_usage_execution_address_backfill";
const MAX_ROW_FAILURE_DETAILS = 50;

export type TokenUsageExecutionAddressBackfillCategoryCounts = {
  directMemberBackfills: number;
  taskTeamCorrections: number;
  taskAgentBackfills: number;
  alreadyAddressedRows: number;
  standaloneSkips: number;
  insufficientDataSkips: number;
  failures: number;
};

export type RawTokenUsageLedgerBackfillRow = {
  id: number;
  usage_event_id: string;
  run_id: string;
  root_team_run_id: string | null;
  execution_address_json: string | null;
  member_route_key: string | null;
  task_agent_run_id: string | null;
  task_id: string | null;
};

export interface TokenUsageExecutionAddressBackfillDatabase {
  listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]>;
  updateTokenUsageLedgerRow(input: {
    id: number;
    rootTeamRunId: string;
    executionAddressJson: string;
  }): Promise<void>;
  disconnect?(): Promise<void>;
}

type TaskTeamRunIndexEntry = {
  rootTeamRunId: string;
  addressPrefix: TokenUsageExecutionAddress;
};

type TaskTeamRunIndex = {
  entries: Map<string, TaskTeamRunIndexEntry>;
  conflicts: Set<string>;
  scannedRecords: number;
};

type RowClassification =
  | {
      kind: "task_team_correction" | "task_agent_backfill" | "direct_member_backfill";
      rootTeamRunId: string;
      address: TokenUsageExecutionAddress;
    }
  | { kind: "already_addressed" }
  | { kind: "standalone_skip" }
  | { kind: "insufficient_data_skip"; reason: string };

const asNonEmptyString = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
};

const parseStoredExecutionAddress = (value: string | null): TokenUsageExecutionAddress | null => {
  if (!value) return null;
  try {
    return normalizeTokenUsageExecutionAddress(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
};

const serializeExecutionAddress = (address: TokenUsageExecutionAddress): string =>
  JSON.stringify(buildTokenUsageExecutionAddress(address.segments));

const sameExecutionAddress = (
  left: TokenUsageExecutionAddress | null,
  right: TokenUsageExecutionAddress,
): boolean => (
  Boolean(left)
  && stableTokenUsageExecutionAddressKey(left as TokenUsageExecutionAddress)
    === stableTokenUsageExecutionAddressKey(right)
);

const terminalSegmentsForRow = (
  row: RawTokenUsageLedgerBackfillRow,
): TokenUsageExecutionAddressSegment[] | null => {
  const memberRouteKey = asNonEmptyString(row.member_route_key);
  if (!memberRouteKey) return null;
  const taskAgentRunId = asNonEmptyString(row.task_agent_run_id);
  return taskAgentRunId
    ? [{ kind: "member", memberRouteKey }, { kind: "task_agent", taskAgentRunId }]
    : [{ kind: "member", memberRouteKey }];
};

const directTaskAgentAddressForRow = (
  row: RawTokenUsageLedgerBackfillRow,
): TokenUsageExecutionAddress | null => {
  const terminalSegments = terminalSegmentsForRow(row);
  return terminalSegments && terminalSegments.length === 2
    ? buildTokenUsageExecutionAddress(terminalSegments)
    : null;
};

const directMemberAddressForRow = (
  row: RawTokenUsageLedgerBackfillRow,
): TokenUsageExecutionAddress | null => {
  const memberRouteKey = asNonEmptyString(row.member_route_key);
  return memberRouteKey
    ? buildTokenUsageExecutionAddress([{ kind: "member", memberRouteKey }])
    : null;
};

const taskTeamAddressForRow = (
  row: RawTokenUsageLedgerBackfillRow,
  entry: TaskTeamRunIndexEntry,
): TokenUsageExecutionAddress | null => {
  const terminalSegments = terminalSegmentsForRow(row);
  return terminalSegments
    ? buildTokenUsageExecutionAddress([...entry.addressPrefix.segments, ...terminalSegments])
    : null;
};

const classifyRow = (
  row: RawTokenUsageLedgerBackfillRow,
  taskTeamRunIndex: TaskTeamRunIndex,
): RowClassification => {
  const rootTeamRunId = asNonEmptyString(row.root_team_run_id);
  const existingAddress = parseStoredExecutionAddress(row.execution_address_json);

  if (rootTeamRunId && taskTeamRunIndex.conflicts.has(rootTeamRunId)) {
    return { kind: "insufficient_data_skip", reason: "CONFLICTING_TASK_TEAM_RECORDS" };
  }

  const taskTeamEntry = rootTeamRunId ? taskTeamRunIndex.entries.get(rootTeamRunId) : null;
  if (taskTeamEntry) {
    const targetAddress = taskTeamAddressForRow(row, taskTeamEntry);
    if (!targetAddress) {
      return { kind: "insufficient_data_skip", reason: "MISSING_MEMBER_ROUTE_KEY" };
    }
    if (row.root_team_run_id === taskTeamEntry.rootTeamRunId && sameExecutionAddress(existingAddress, targetAddress)) {
      return { kind: "already_addressed" };
    }
    return {
      kind: "task_team_correction",
      rootTeamRunId: taskTeamEntry.rootTeamRunId,
      address: targetAddress,
    };
  }

  if (!existingAddress && rootTeamRunId) {
    const taskAgentAddress = directTaskAgentAddressForRow(row);
    if (taskAgentAddress) {
      return { kind: "task_agent_backfill", rootTeamRunId, address: taskAgentAddress };
    }
    const directMemberAddress = directMemberAddressForRow(row);
    if (directMemberAddress) {
      return { kind: "direct_member_backfill", rootTeamRunId, address: directMemberAddress };
    }
  }

  if (existingAddress) return { kind: "already_addressed" };
  if (!rootTeamRunId) return { kind: "standalone_skip" };
  return { kind: "insufficient_data_skip", reason: "INSUFFICIENT_ADDRESS_INPUT" };
};

const readJsonFile = async (filePath: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
  } catch (error) {
    if (String(error).includes("ENOENT")) return null;
    console.warn(`TokenUsageExecutionAddressBackfillMigration: skipping unreadable task records '${filePath}': ${String(error)}`);
    return null;
  }
};

const listTaskDelegationRecordCandidates = async (memoryDir: string): Promise<Array<{
  rootTeamRunId: string;
  filePath: string;
}>> => {
  const teamsRoot = path.join(memoryDir, "agent_teams");
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(teamsRoot, { withFileTypes: true });
  } catch (error) {
    if (String(error).includes("ENOENT")) return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      rootTeamRunId: entry.name,
      filePath: path.join(teamsRoot, entry.name, TASK_DELEGATION_RECORDS_FILE_NAME),
    }))
    .sort((left, right) => left.rootTeamRunId.localeCompare(right.rootTeamRunId));
};

const buildTaskTeamRunIndex = async (memoryDir: string): Promise<TaskTeamRunIndex> => {
  const entries = new Map<string, TaskTeamRunIndexEntry>();
  const conflicts = new Set<string>();
  let scannedRecords = 0;

  for (const candidate of await listTaskDelegationRecordCandidates(memoryDir)) {
    const payload = await readJsonFile(candidate.filePath);
    if (!payload) continue;
    const recordsFile = normalizeTaskDelegationRecordsFile(payload, { teamRunId: candidate.rootTeamRunId });
    for (const record of recordsFile.records) {
      scannedRecords += 1;
      if (!record.taskRun?.address) continue;
      const addressPrefix = normalizeTokenUsageExecutionAddress(record.taskRun.address);
      if (!addressPrefix) continue;
      const lastSegment = lastTokenUsageExecutionAddressSegment(addressPrefix);
      if (!lastSegment || lastSegment.kind !== "task_team") continue;
      const taskTeamRunId = lastSegment.taskTeamRunId;
      if (conflicts.has(taskTeamRunId)) continue;
      const nextEntry = {
        rootTeamRunId: recordsFile.teamRunId,
        addressPrefix,
      };
      const existingEntry = entries.get(taskTeamRunId);
      if (!existingEntry) {
        entries.set(taskTeamRunId, nextEntry);
        continue;
      }
      const sameRoot = existingEntry.rootTeamRunId === nextEntry.rootTeamRunId;
      const sameAddress = sameExecutionAddress(existingEntry.addressPrefix, nextEntry.addressPrefix);
      if (!sameRoot || !sameAddress) {
        entries.delete(taskTeamRunId);
        conflicts.add(taskTeamRunId);
      }
    }
  }

  return { entries, conflicts, scannedRecords };
};

const emptyCounts = (): TokenUsageExecutionAddressBackfillCategoryCounts => ({
  directMemberBackfills: 0,
  taskTeamCorrections: 0,
  taskAgentBackfills: 0,
  alreadyAddressedRows: 0,
  standaloneSkips: 0,
  insufficientDataSkips: 0,
  failures: 0,
});

const summaryDetail = (
  itemId: string,
  status: AppDataMigrationItemDetail["status"],
  message: string,
): AppDataMigrationItemDetail => ({ itemId, status, message });

const formatReasonCounts = (counts: ReadonlyMap<string, number>): string => (
  counts.size === 0
    ? "none"
    : [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([reason, count]) => `${reason}=${count}`)
      .join(", ")
);

const categoryDetails = (
  counts: TokenUsageExecutionAddressBackfillCategoryCounts,
  index: TaskTeamRunIndex,
  insufficientSkipReasons: ReadonlyMap<string, number>,
): AppDataMigrationItemDetail[] => [
  summaryDetail(
    "token-usage-execution-address:task-record-index",
    index.entries.size > 0 && index.conflicts.size === 0 ? "MIGRATED" : "SKIPPED",
    `Scanned ${index.scannedRecords} task delegation records; indexed ${index.entries.size} task-team run addresses; conflicts ${index.conflicts.size}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:direct-member-backfills",
    counts.directMemberBackfills > 0 ? "MIGRATED" : "SKIPPED",
    `Direct member backfills: ${counts.directMemberBackfills}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:task-team-corrections",
    counts.taskTeamCorrections > 0 ? "MIGRATED" : "SKIPPED",
    `Task-team corrections: ${counts.taskTeamCorrections}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:task-agent-backfills",
    counts.taskAgentBackfills > 0 ? "MIGRATED" : "SKIPPED",
    `Task-agent backfills: ${counts.taskAgentBackfills}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:already-addressed",
    "SKIPPED",
    `Already-addressed rows: ${counts.alreadyAddressedRows}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:standalone-skips",
    "SKIPPED",
    `Standalone skips: ${counts.standaloneSkips}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:insufficient-data-skips",
    "SKIPPED",
    `Insufficient-data skips: ${counts.insufficientDataSkips}. Reasons: ${formatReasonCounts(insufficientSkipReasons)}.`,
  ),
  summaryDetail(
    "token-usage-execution-address:failures",
    counts.failures > 0 ? "FAILED" : "SKIPPED",
    `Failures: ${counts.failures}.`,
  ),
];

const buildSummary = (
  scannedCount: number,
  counts: TokenUsageExecutionAddressBackfillCategoryCounts,
  index: TaskTeamRunIndex,
  insufficientSkipReasons: ReadonlyMap<string, number>,
  rowFailureDetails: AppDataMigrationItemDetail[],
): AppDataMigrationSummary => ({
  scannedCount,
  migratedCount: counts.directMemberBackfills + counts.taskAgentBackfills + counts.taskTeamCorrections,
  skippedCount: counts.alreadyAddressedRows + counts.standaloneSkips + counts.insufficientDataSkips,
  failedCount: counts.failures,
  details: [...categoryDetails(counts, index, insufficientSkipReasons), ...rowFailureDetails],
});

const statusFromSummary = (summary: AppDataMigrationSummary): AppDataMigrationExecutionResult["status"] => {
  if (summary.failedCount === 0) return "SUCCEEDED";
  return summary.migratedCount + summary.skippedCount > 0 ? "SUCCEEDED_WITH_WARNINGS" : "FAILED";
};

export class PrismaTokenUsageExecutionAddressBackfillDatabase implements TokenUsageExecutionAddressBackfillDatabase {
  private readonly ownsClient: boolean;

  constructor(private readonly prisma: PrismaClient = createConfiguredPrismaClient()) {
    this.ownsClient = arguments.length === 0;
  }

  async listTokenUsageLedgerRows(): Promise<RawTokenUsageLedgerBackfillRow[]> {
    return await this.prisma.$queryRaw<RawTokenUsageLedgerBackfillRow[]>`
      SELECT
        "id",
        "usage_event_id",
        "run_id",
        "root_team_run_id",
        "execution_address_json",
        "member_route_key",
        "task_agent_run_id",
        "task_id"
      FROM "token_usage_ledger_events"
      ORDER BY "id" ASC
    `;
  }

  async updateTokenUsageLedgerRow(input: {
    id: number;
    rootTeamRunId: string;
    executionAddressJson: string;
  }): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "token_usage_ledger_events"
      SET
        "root_team_run_id" = ${input.rootTeamRunId},
        "execution_address_json" = ${input.executionAddressJson}
      WHERE "id" = ${input.id}
    `;
  }

  async disconnect(): Promise<void> {
    if (this.ownsClient) await this.prisma.$disconnect();
  }
}

export class TokenUsageExecutionAddressBackfillMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Token usage execution address backfill";
  readonly description = "Backfills deterministic token usage execution addresses and corrects historical task-team roots.";
  readonly requiredOnStartup = true;
  private database: TokenUsageExecutionAddressBackfillDatabase | null;

  constructor(
    private readonly memoryDir: string,
    database?: TokenUsageExecutionAddressBackfillDatabase,
  ) {
    this.database = database ?? null;
  }

  private getDatabase(): TokenUsageExecutionAddressBackfillDatabase {
    this.database ??= new PrismaTokenUsageExecutionAddressBackfillDatabase();
    return this.database;
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const counts = emptyCounts();
    const insufficientSkipReasons = new Map<string, number>();
    const rowFailureDetails: AppDataMigrationItemDetail[] = [];
    const taskTeamRunIndex = await buildTaskTeamRunIndex(this.memoryDir);
    const database = this.getDatabase();
    const rows = await database.listTokenUsageLedgerRows();

    for (const row of rows) {
      const classification = classifyRow(row, taskTeamRunIndex);
      try {
        if (classification.kind === "already_addressed") {
          counts.alreadyAddressedRows += 1;
          continue;
        }
        if (classification.kind === "standalone_skip") {
          counts.standaloneSkips += 1;
          continue;
        }
        if (classification.kind === "insufficient_data_skip") {
          counts.insufficientDataSkips += 1;
          insufficientSkipReasons.set(
            classification.reason,
            (insufficientSkipReasons.get(classification.reason) ?? 0) + 1,
          );
          continue;
        }

        await database.updateTokenUsageLedgerRow({
          id: row.id,
          rootTeamRunId: classification.rootTeamRunId,
          executionAddressJson: serializeExecutionAddress(classification.address),
        });
        if (classification.kind === "task_team_correction") counts.taskTeamCorrections += 1;
        if (classification.kind === "task_agent_backfill") counts.taskAgentBackfills += 1;
        if (classification.kind === "direct_member_backfill") counts.directMemberBackfills += 1;
      } catch (error) {
        counts.failures += 1;
        if (rowFailureDetails.length < MAX_ROW_FAILURE_DETAILS) {
          rowFailureDetails.push({
            itemId: row.usage_event_id || `token-usage-row:${row.id}`,
            status: "FAILED",
            message: `Failed migrating token usage row ${row.id}: ${String(error)}`,
          });
        }
      }
    }

    const summary = buildSummary(rows.length, counts, taskTeamRunIndex, insufficientSkipReasons, rowFailureDetails);
    return {
      status: statusFromSummary(summary),
      summary,
      errorMessage: summary.failedCount > 0
        ? `Token usage execution address backfill encountered ${summary.failedCount} row failure(s).`
        : null,
    };
  }
}
