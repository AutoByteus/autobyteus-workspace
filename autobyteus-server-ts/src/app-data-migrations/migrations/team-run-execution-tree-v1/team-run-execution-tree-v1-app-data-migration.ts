import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../../domain/app-data-migration-types.js";
import { TeamRunExecutionTreeStore } from "../../../run-history/store/team-run-execution-tree-store.js";
import { TaskDelegationRecordsV1Store } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../../services/team-communication/team-communication-v1-store.js";
import { validateTeamRunStatePackage } from "../../../run-history/services/team-run-state-package-validator.js";
import { TokenUsageLedgerStore } from "../../../token-usage/providers/token-usage-ledger-store.js";
import type { TokenUsageExecutionIdentityEvidenceRow } from "../../../token-usage/repositories/sql/token-usage-execution-identity-migration-repository.js";
import { convertPredecessorExternalOutputDeliveries } from "./predecessor-external-output-converter.js";
import { planPredecessorTeamRunV1Package } from "./predecessor-team-run-planner.js";
import { TeamRunV1PackagePromoter } from "./team-run-v1-package-promoter.js";

export const TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID = "20260814_team_run_execution_tree_v1";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
const resultSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

type SourcePaths = { taskRecordsPath: string; communicationPath: string };

export class TeamRunExecutionTreeV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID;
  readonly displayName = "TeamRun execution-tree V1 migration";
  readonly description = "Promotes released TeamRun/task/message/token/external state to the exact V1 rooted execution model.";
  readonly requiredOnStartup = true;
  private readonly layout: AgentMemoryLayout;
  private readonly backupRoot: string;

  constructor(
    private readonly memoryDir: string,
    private readonly appDataDir: string,
    private readonly tokenStore: Pick<TokenUsageLedgerStore,
      "listExecutionIdentityMigrationEvidence" | "migrateExecutionIdentity" | "disconnectExecutionIdentityMigration"> = new TokenUsageLedgerStore(),
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.backupRoot = path.join(appDataDir, "app-data-migration-backups", this.id);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const trees = new Map<string, TeamRunExecutionTreeSnapshot>();
    try {
      const tokenRows = await this.tokenStore.listExecutionIdentityMigrationEvidence();
      for (const rootTeamRunId of await this.listRootTeamRunIds()) {
        await this.processRoot(rootTeamRunId, tokenRows, trees, details);
      }
      await this.convertTokenIdentity(details);
      await this.convertExternalOutput(trees, details);
    } catch (error) {
      details.push({ itemId: "migration:global", status: "FAILED", message: message(error) });
    } finally {
      await this.tokenStore.disconnectExecutionIdentityMigration().catch(() => undefined);
    }
    const summary = resultSummary(details);
    return {
      status: summary.failedCount ? "FAILED" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount
        ? `${summary.failedCount} TeamRun V1 migration item(s) remain unresolved; valid target roots remain available.`
        : null,
    };
  }

  private async processRoot(
    rootTeamRunId: string,
    tokenRows: readonly TokenUsageExecutionIdentityEvidenceRow[],
    trees: Map<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    const rootDir = this.layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    const metadataPath = path.join(rootDir, "team_run_metadata.json");
    const hasMetadata = await this.exists(metadataPath);
    if (!hasMetadata) {
      const current = await this.readCurrentPackage(rootTeamRunId, rootDir);
      if (current) {
        trees.set(rootTeamRunId, current);
        details.push({ itemId: `team-root:${rootTeamRunId}`, filePath: rootDir, status: "SKIPPED", message: "Already a complete validated V1 package." });
      } else {
        details.push({ itemId: `team-root:${rootTeamRunId}`, filePath: rootDir, status: "SKIPPED", message: "Ignored non-predecessor incomplete TeamRun residue." });
      }
      return;
    }
    try {
      const sources = await this.resolvePredecessorSources(rootTeamRunId, rootDir);
      const packagePlan = await planPredecessorTeamRunV1Package({
        rootTeamRunId,
        rootDir,
        metadataPath,
        taskRecordsPath: sources.taskRecordsPath,
        communicationPath: sources.communicationPath,
        tokenRows: tokenRows.filter((row) => this.rowBelongsToRoot(row, rootTeamRunId)),
      });
      const backupPath = await new TeamRunV1PackagePromoter(this.backupRoot).promote({
        rootTeamRunId,
        rootDir,
        metadataPath,
        sourceTaskRecordsPath: sources.taskRecordsPath,
        sourceCommunicationPath: sources.communicationPath,
        package: packagePlan,
      });
      trees.set(rootTeamRunId, packagePlan.executionTree);
      details.push({ itemId: `team-root:${rootTeamRunId}`, filePath: rootDir, backupPath, status: "MIGRATED", message: "Promoted and revalidated complete TeamRun V1 package." });
    } catch (error) {
      details.push({ itemId: `team-root:${rootTeamRunId}`, filePath: rootDir, status: "FAILED", message: message(error) });
    }
  }

  private async readCurrentPackage(rootTeamRunId: string, rootDir: string): Promise<TeamRunExecutionTreeSnapshot | null> {
    try {
      const [executionTree, taskRecords, communicationMessages] = await Promise.all([
        new TeamRunExecutionTreeStore().read(rootDir, rootTeamRunId),
        new TaskDelegationRecordsV1Store().read(rootDir, rootTeamRunId),
        new TeamCommunicationV1Store().read(rootDir, rootTeamRunId),
      ]);
      if (!executionTree || !taskRecords || !communicationMessages) return null;
      return validateTeamRunStatePackage({ executionTree, taskRecords, communicationMessages }).executionTree;
    } catch { return null; }
  }

  private async resolvePredecessorSources(rootTeamRunId: string, rootDir: string): Promise<SourcePaths> {
    const live = {
      taskRecordsPath: path.join(rootDir, "task_delegation_records.json"),
      communicationPath: path.join(rootDir, "team_communication_messages.json"),
    };
    if (!await this.exists(path.join(rootDir, "team_run_execution_tree.json"))) return live;
    const rootBackups = path.join(this.backupRoot, rootTeamRunId);
    let attempts: string[];
    try { attempts = (await fs.readdir(rootBackups)).sort().reverse(); }
    catch (error) { if (missing(error)) throw new Error("Partial target package has no protected predecessor backup."); throw error; }
    for (const attempt of attempts) {
      const directory = path.join(rootBackups, attempt);
      if (await this.exists(path.join(directory, "manifest.json"))) {
        return {
          taskRecordsPath: path.join(directory, "task_delegation_records.json"),
          communicationPath: path.join(directory, "team_communication_messages.json"),
        };
      }
    }
    throw new Error("Partial target package has no usable protected predecessor backup.");
  }

  private async convertTokenIdentity(details: AppDataMigrationItemDetail[]): Promise<void> {
    try {
      const result = await this.tokenStore.migrateExecutionIdentity();
      details.push({
        itemId: "token-usage:execution-identity-v1",
        status: result.alreadyCurrent ? "SKIPPED" : "MIGRATED",
        message: result.alreadyCurrent ? "Token usage schema is already exact-run current." : `Converted ${result.migratedRows} token row(s) transactionally.`,
      });
    } catch (error) {
      details.push({ itemId: "token-usage:execution-identity-v1", status: "FAILED", message: `Token identity transaction rolled back: ${message(error)}` });
    }
  }

  private async convertExternalOutput(
    trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    try {
      const filePath = path.join(this.appDataDir, "external-channel", "run-output-deliveries.json");
      const result = await convertPredecessorExternalOutputDeliveries({ filePath, backupRoot: path.join(this.backupRoot, "external-channel"), trees });
      details.push({ itemId: "external-channel:run-output-identity", filePath, backupPath: result.backupPath, status: result.changed ? "MIGRATED" : "SKIPPED", message: result.changed ? `Converted ${result.changed} exact Team output target(s).` : "External output targets are already current or absent." });
    } catch (error) {
      details.push({ itemId: "external-channel:run-output-identity", status: "FAILED", message: message(error) });
    }
  }

  private rowBelongsToRoot(row: TokenUsageExecutionIdentityEvidenceRow, rootTeamRunId: string): boolean {
    if (row.rootTeamRunId === rootTeamRunId) return true;
    if (!row.executionAddressJson) return false;
    try { return (JSON.parse(row.executionAddressJson) as { rootTeamRunId?: unknown }).rootTeamRunId === rootTeamRunId; }
    catch { return false; }
  }

  private async listRootTeamRunIds(): Promise<string[]> {
    try {
      return (await fs.readdir(this.layout.getTeamRootDirPath(), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    } catch (error) { if (missing(error)) return []; throw error; }
  }

  private async exists(filePath: string): Promise<boolean> {
    try { await fs.access(filePath); return true; }
    catch (error) { if (missing(error)) return false; throw error; }
  }
}
