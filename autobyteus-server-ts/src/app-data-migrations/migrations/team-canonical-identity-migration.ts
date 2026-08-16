import fs from "node:fs/promises";
import path from "node:path";
import { normalizePredecessorTaskDelegationRecordsFile } from "../predecessor-task-delegation-records.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";
import { convertLegacyTeamRunMetadata } from "./team-canonical-metadata-converter.js";
import { convertExternalChannelBindings, convertTaskDelegationFile } from "./team-canonical-structured-file-converter.js";
import {
  TokenUsageCanonicalExecutionAddressMigrator,
  type TokenUsageCanonicalExecutionAddressMigratorLike,
} from "./token-usage-canonical-execution-address-migrator.js";
import {
  TeamRunMigrationStateClassifier,
  type TeamRunMigrationState,
} from "./team-run-migration-state-classifier.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import {
  TeamRunPredecessorSourceResolver,
  type TeamRunPredecessorSources,
} from "./team-run-execution-tree-v1/team-run-predecessor-source-resolver.js";

const MIGRATION_ID = "20260801_team_canonical_identity";
const json = (value: unknown): string => JSON.stringify(value, null, 2);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const backupAndReplace = async (filePath: string, value: unknown): Promise<string> => {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  await fs.copyFile(filePath, backupPath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, json(value), "utf8");
  await fs.rename(tempPath, filePath);
  return backupPath;
};
const summary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

type PlannedFile = Readonly<{
  itemId: string;
  filePath: string;
  raw: unknown;
  converted: unknown;
}>;

type PlannedPredecessorRoot = Readonly<{
  state: Extract<TeamRunMigrationState, { kind: "PREDECESSOR" }>;
  sources: TeamRunPredecessorSources;
  metadata: PlannedFile;
  taskRecords: PlannedFile | null;
}>;

const readOptionalJson = async (filePath: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
};

export class TeamCanonicalIdentityMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "AgentTeam canonical identity migration";
  readonly description = "Converts released TeamRun, task, token, and external-channel state to canonical schema v3 identity.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly memoryDir: string,
    private readonly appDataDir: string,
    private readonly suppliedTokenMigrator?: TokenUsageCanonicalExecutionAddressMigratorLike,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const plans = await this.preflightTeamRoots(details);
    const teamIdentityFailed = details.some((detail) => detail.status === "FAILED");
    if (teamIdentityFailed) {
      details.push({
        itemId: "token-usage:team-identity-dependency",
        status: "FAILED",
        message: "Canonical mutation and token planning were not started because TeamRun preflight failed.",
      });
    } else {
      for (const plan of plans) await this.applyTeamRootPlan(plan, details);
      if (details.some((detail) => detail.status === "FAILED")) {
        details.push({
          itemId: "token-usage:team-identity-dependency",
          status: "FAILED",
          message: "Canonical token planning was not started because TeamRun identity conversion failed.",
        });
      } else {
        const tokenMigrator = this.suppliedTokenMigrator
          ?? new TokenUsageCanonicalExecutionAddressMigrator(this.memoryDir, this.appDataDir);
        details.push(...await tokenMigrator.migrate());
        await this.migrateBindings(details);
      }
    }
    const resultSummary = summary(details);
    return {
      status: resultSummary.failedCount ? "FAILED" : "SUCCEEDED",
      summary: resultSummary,
      errorMessage: resultSummary.failedCount
        ? `${resultSummary.failedCount} required canonical identity item(s) failed. Runtime startup remains blocked.`
        : null,
    };
  }

  private async preflightTeamRoots(
    details: AppDataMigrationItemDetail[],
  ): Promise<readonly PlannedPredecessorRoot[]> {
    const classifier = new TeamRunMigrationStateClassifier(this.memoryDir);
    const resolver = new TeamRunPredecessorSourceResolver(path.join(
      this.appDataDir,
      "app-data-migration-backups",
      TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
    ));
    const plans: PlannedPredecessorRoot[] = [];
    for (const state of await classifier.listAndClassifyRoots()) {
      if (state.kind === "CURRENT_V1") {
        details.push({
          itemId: `team-root:${state.rootTeamRunId}`,
          filePath: state.rootDir,
          status: "SKIPPED",
          message: "Already a complete validated V1 package.",
        });
        continue;
      }
      if (state.kind === "HISTORICAL_RESIDUE") {
        details.push({
          itemId: `team-root:${state.rootTeamRunId}`,
          filePath: state.manifestPath,
          status: "SKIPPED",
          message: "Validated historical TeamRun residue has no predecessor identity to convert.",
        });
        continue;
      }
      if (state.kind === "INVALID") {
        details.push({
          itemId: `team-root:${state.rootTeamRunId}`,
          filePath: state.evidencePath,
          status: "FAILED",
          message: state.reason,
        });
        continue;
      }
      try {
        const sources = await resolver.resolve(state.rootTeamRunId, state.rootDir);
        const rawMetadata = JSON.parse(await fs.readFile(state.metadataPath, "utf8")) as unknown;
        const metadata = Object.freeze({
          itemId: `team-metadata:${state.rootTeamRunId}`,
          filePath: state.metadataPath,
          raw: rawMetadata,
          converted: convertLegacyTeamRunMetadata(rawMetadata, state.rootTeamRunId),
        });
        const rawTaskRecords = await readOptionalJson(sources.taskRecordsPath);
        const taskRecords = rawTaskRecords === null ? null : Object.freeze({
          itemId: `task-records:${state.rootTeamRunId}`,
          filePath: sources.taskRecordsPath,
          raw: rawTaskRecords,
          converted: normalizePredecessorTaskDelegationRecordsFile(
            convertTaskDelegationFile(rawTaskRecords, state.rootTeamRunId),
            { teamRunId: state.rootTeamRunId },
          ),
        });
        if (
          sources.provenance === "PROTECTED_V1_BACKUP"
          && taskRecords
          && JSON.stringify(taskRecords.raw) !== JSON.stringify(taskRecords.converted)
        ) {
          throw new Error(
            "Protected predecessor task records are not already canonical and cannot be rewritten safely.",
          );
        }
        plans.push(Object.freeze({ state, sources, metadata, taskRecords }));
      } catch (error) {
        details.push({
          itemId: `team-root:${state.rootTeamRunId}`,
          filePath: state.rootDir,
          status: "FAILED",
          message: message(error),
        });
      }
    }
    return Object.freeze(plans);
  }

  private async applyTeamRootPlan(
    plan: PlannedPredecessorRoot,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    await this.applyPlannedFile(plan.metadata, details);
    if (!plan.taskRecords) return;
    if (plan.sources.provenance === "PROTECTED_V1_BACKUP") {
      details.push({
        itemId: plan.taskRecords.itemId,
        filePath: plan.taskRecords.filePath,
        status: "SKIPPED",
        message: "Validated protected canonical predecessor task records without rewriting backup evidence.",
      });
      return;
    }
    await this.applyPlannedFile(plan.taskRecords, details);
  }

  private async applyPlannedFile(
    planned: PlannedFile,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    if (JSON.stringify(planned.raw) === JSON.stringify(planned.converted)) {
      details.push({
        itemId: planned.itemId,
        filePath: planned.filePath,
        status: "SKIPPED",
        message: "Already canonical.",
      });
      return;
    }
    try {
      const backupPath = await backupAndReplace(planned.filePath, planned.converted);
      details.push({
        itemId: planned.itemId,
        filePath: planned.filePath,
        backupPath,
        status: "MIGRATED",
        message: "Converted and validated canonical identity.",
      });
    } catch (error) {
      details.push({
        itemId: planned.itemId,
        filePath: planned.filePath,
        status: "FAILED",
        message: message(error),
      });
    }
  }

  private async migrateBindings(details: AppDataMigrationItemDetail[]): Promise<void> {
    await this.migrateJsonFile({
      itemId: "external-channel-bindings",
      filePath: path.join(this.appDataDir, "external-channel", "bindings.json"),
      optional: true,
      convert: convertExternalChannelBindings,
      details,
    });
  }

  private async migrateJsonFile(input: {
    itemId: string;
    filePath: string;
    optional?: boolean;
    convert: (value: unknown) => unknown;
    details: AppDataMigrationItemDetail[];
  }): Promise<void> {
    try {
      const raw = JSON.parse(await fs.readFile(input.filePath, "utf8")) as unknown;
      const converted = input.convert(raw);
      if (JSON.stringify(raw) === JSON.stringify(converted)) {
        input.details.push({ itemId: input.itemId, filePath: input.filePath, status: "SKIPPED", message: "Already canonical." });
        return;
      }
      const backupPath = await backupAndReplace(input.filePath, converted);
      input.details.push({ itemId: input.itemId, filePath: input.filePath, backupPath, status: "MIGRATED", message: "Converted and validated canonical identity." });
    } catch (error) {
      if (input.optional && missing(error)) return;
      input.details.push({ itemId: input.itemId, filePath: input.filePath, status: "FAILED", message: message(error) });
    }
  }
}

export const TEAM_CANONICAL_IDENTITY_MIGRATION_ID = MIGRATION_ID;
