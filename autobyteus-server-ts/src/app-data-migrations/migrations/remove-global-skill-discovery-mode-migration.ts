import fs from "node:fs/promises";
import path from "node:path";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260706_remove_global_skill_discovery_mode";
const LEGACY_MODE = "GLOBAL_DISCOVERY";
const TARGET_MODE = SkillAccessMode.PRELOADED_ONLY;
const CANDIDATE_JSON_FILE_NAMES = new Set([
  "run_metadata.json",
  "team_run_metadata.json",
  "bindings.json",
]);

type CandidateFile = {
  itemId: string;
  filePath: string;
};

type RewriteResult = {
  value: unknown;
  changed: boolean;
  rewrittenCount: number;
};

const createBackupPath = (filePath: string): string =>
  `${filePath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;

const createTempPath = (filePath: string): string =>
  `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const statusFromSummary = (
  summary: AppDataMigrationSummary,
): AppDataMigrationExecutionResult["status"] => {
  if (summary.failedCount === 0) {
    return "SUCCEEDED";
  }
  return summary.migratedCount + summary.skippedCount > 0
    ? "SUCCEEDED_WITH_WARNINGS"
    : "FAILED";
};

const rewriteGlobalSkillAccessMode = (value: unknown): RewriteResult => {
  if (Array.isArray(value)) {
    let changed = false;
    let rewrittenCount = 0;
    const items = value.map((item) => {
      const rewritten = rewriteGlobalSkillAccessMode(item);
      changed = changed || rewritten.changed;
      rewrittenCount += rewritten.rewrittenCount;
      return rewritten.value;
    });
    return { value: changed ? items : value, changed, rewrittenCount };
  }

  if (!value || typeof value !== "object") {
    return { value, changed: false, rewrittenCount: 0 };
  }

  let changed = false;
  let rewrittenCount = 0;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === "skillAccessMode" && child === LEGACY_MODE) {
      output[key] = TARGET_MODE;
      changed = true;
      rewrittenCount += 1;
      continue;
    }
    const rewritten = rewriteGlobalSkillAccessMode(child);
    output[key] = rewritten.value;
    changed = changed || rewritten.changed;
    rewrittenCount += rewritten.rewrittenCount;
  }

  return { value: changed ? output : value, changed, rewrittenCount };
};

const collectCandidateFiles = async (
  rootDir: string,
  itemPrefix: string,
): Promise<CandidateFile[]> => {
  const root = path.resolve(rootDir);
  const candidates: CandidateFile[] = [];

  const visit = async (directory: string): Promise<void> => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (!entry.isFile() || !CANDIDATE_JSON_FILE_NAMES.has(entry.name)) {
        continue;
      }
      candidates.push({
        itemId: `${itemPrefix}:${path.relative(root, entryPath)}`,
        filePath: entryPath,
      });
    }
  };

  await visit(root);
  return candidates.sort((left, right) => left.filePath.localeCompare(right.filePath));
};

const writeRewrittenJson = async (
  filePath: string,
  value: unknown,
): Promise<string> => {
  const backupPath = createBackupPath(filePath);
  await fs.copyFile(filePath, backupPath);
  const tempPath = createTempPath(filePath);
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  await fs.rename(tempPath, filePath);
  return backupPath;
};

export class RemoveGlobalSkillDiscoveryModeMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Remove global skill discovery mode migration";
  readonly description = "Rewrites persisted GLOBAL_DISCOVERY skill access values to configured-only behavior.";
  readonly requiredOnStartup = true;

  constructor(
    private readonly memoryDir: string,
    private readonly appDataDir: string,
  ) {}

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const candidates = [
      ...(await collectCandidateFiles(path.join(this.memoryDir, "agents"), "agent")),
      ...(await collectCandidateFiles(path.join(this.memoryDir, "agent_teams"), "team")),
      ...(await collectCandidateFiles(path.join(this.appDataDir, "external-channel"), "external-channel")),
    ].sort((left, right) => left.filePath.localeCompare(right.filePath));
    const details: AppDataMigrationItemDetail[] = [];

    for (const candidate of candidates) {
      try {
        const raw = await fs.readFile(candidate.filePath, "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        const rewritten = rewriteGlobalSkillAccessMode(parsed);
        if (!rewritten.changed) {
          details.push({
            itemId: candidate.itemId,
            filePath: candidate.filePath,
            status: "SKIPPED",
            message: "No GLOBAL_DISCOVERY skillAccessMode values found.",
          });
          continue;
        }

        const backupPath = await writeRewrittenJson(candidate.filePath, rewritten.value);
        details.push({
          itemId: candidate.itemId,
          filePath: candidate.filePath,
          status: "MIGRATED",
          message: `Rewrote ${rewritten.rewrittenCount} GLOBAL_DISCOVERY skillAccessMode value(s) to ${TARGET_MODE}.`,
          backupPath,
        });
      } catch (error) {
        details.push({
          itemId: candidate.itemId,
          filePath: candidate.filePath,
          status: "FAILED",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const summary = buildSummary(details);
    return {
      status: statusFromSummary(summary),
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} file(s) could not be migrated away from GLOBAL_DISCOVERY.`
        : null,
    };
  }
}

export const REMOVE_GLOBAL_SKILL_DISCOVERY_MODE_MIGRATION_ID = MIGRATION_ID;
