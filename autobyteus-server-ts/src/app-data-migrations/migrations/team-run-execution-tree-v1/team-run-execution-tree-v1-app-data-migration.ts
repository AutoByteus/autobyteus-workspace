import path from "node:path";
import type { TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../../domain/app-data-migration-types.js";
import { TokenUsageLedgerStore } from "../../../token-usage/providers/token-usage-ledger-store.js";
import type { TokenUsageExecutionIdentityEvidenceRow } from "../../../token-usage/repositories/sql/token-usage-execution-identity-migration-repository.js";
import { TEAM_CANONICAL_IDENTITY_MIGRATION_ID } from "../team-canonical-identity-migration.js";
import {
  TeamRunMigrationStateClassifier,
  type TeamRunMigrationState,
} from "../team-run-migration-state-classifier.js";
import { convertPredecessorExternalOutputDeliveries } from "./predecessor-external-output-converter.js";
import {
  planPredecessorTeamRunV1Package,
  type PlannedTeamRunV1Package,
} from "./predecessor-team-run-planner.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1-constants.js";
import {
  TeamRunPredecessorSourceResolver,
  type TeamRunPredecessorSources,
} from "./team-run-predecessor-source-resolver.js";
import { TeamRunV1PackagePromoter } from "./team-run-v1-package-promoter.js";
import { TeamRunHistoryIndexReconciler } from "./team-run-history-index-reconciler.js";

export { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1-constants.js";
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const resultSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

type PlannedPredecessorRoot = Readonly<{
  state: Extract<TeamRunMigrationState, { kind: "PREDECESSOR" }>;
  sources: TeamRunPredecessorSources;
  package: PlannedTeamRunV1Package;
}>;

export class TeamRunExecutionTreeV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID;
  readonly displayName = "TeamRun execution-tree V1 migration";
  readonly description = "Promotes released TeamRun/task/message/token/external state to the exact V1 rooted execution model.";
  readonly requiredOnStartup = true;
  readonly prerequisiteMigrationIds = Object.freeze([TEAM_CANONICAL_IDENTITY_MIGRATION_ID]);
  private readonly backupRoot: string;

  constructor(
    private readonly memoryDir: string,
    private readonly appDataDir: string,
    private readonly tokenStore: Pick<TokenUsageLedgerStore,
      "listExecutionIdentityMigrationEvidence" | "migrateExecutionIdentity" | "disconnectExecutionIdentityMigration"> = new TokenUsageLedgerStore(),
  ) {
    this.backupRoot = path.join(appDataDir, "app-data-migration-backups", this.id);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const trees = new Map<string, TeamRunExecutionTreeSnapshot>();
    try {
      const tokenRows = await this.tokenStore.listExecutionIdentityMigrationEvidence();
      const plans = await this.preflightRoots(tokenRows, trees, details);
      if (!details.some((detail) => detail.status === "FAILED")) {
        for (const plan of plans) await this.promoteRoot(plan, trees, details);
      }
      await this.reconcileTeamHistory(trees, details);
      if (!details.some((detail) => detail.status === "FAILED")) {
        await this.convertTokenIdentity(details);
        await this.convertExternalOutput(trees, details);
      }
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

  private async preflightRoots(
    tokenRows: readonly TokenUsageExecutionIdentityEvidenceRow[],
    trees: Map<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<readonly PlannedPredecessorRoot[]> {
    const resolver = new TeamRunPredecessorSourceResolver(this.backupRoot);
    const plans: PlannedPredecessorRoot[] = [];
    for (const state of await new TeamRunMigrationStateClassifier(
      this.memoryDir,
    ).listAndClassifyRoots()) {
      if (state.kind === "CURRENT_V1") {
        trees.set(state.rootTeamRunId, state.package.executionTree);
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
          message: "Validated historical TeamRun residue has no V1 package to promote.",
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
        const packagePlan = await planPredecessorTeamRunV1Package({
          rootTeamRunId: state.rootTeamRunId,
          rootDir: state.rootDir,
          metadataPath: state.metadataPath,
          taskRecordsPath: sources.taskRecordsPath,
          communicationPath: sources.communicationPath,
          tokenRows: tokenRows.filter((row) => this.rowBelongsToRoot(row, state.rootTeamRunId)),
        });
        plans.push(Object.freeze({ state, sources, package: packagePlan }));
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

  private async promoteRoot(
    plan: PlannedPredecessorRoot,
    trees: Map<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    const { state, sources } = plan;
    try {
      const backupPath = await new TeamRunV1PackagePromoter(this.backupRoot).promote({
        rootTeamRunId: state.rootTeamRunId,
        rootDir: state.rootDir,
        metadataPath: state.metadataPath,
        sourceTaskRecordsPath: sources.taskRecordsPath,
        sourceCommunicationPath: sources.communicationPath,
        package: plan.package,
      });
      trees.set(state.rootTeamRunId, plan.package.executionTree);
      details.push({ itemId: `team-root:${state.rootTeamRunId}`, filePath: state.rootDir, backupPath, status: "MIGRATED", message: "Promoted and revalidated complete TeamRun V1 package." });
    } catch (error) {
      details.push({ itemId: `team-root:${state.rootTeamRunId}`, filePath: state.rootDir, status: "FAILED", message: message(error) });
    }
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

  private async reconcileTeamHistory(
    trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    try {
      const result = await new TeamRunHistoryIndexReconciler(
        this.memoryDir,
        this.backupRoot,
      ).reconcile(trees);
      details.push({
        itemId: "team-history-index",
        backupPath: result.backupPath ?? undefined,
        status: result.changed ? "MIGRATED" : "SKIPPED",
        message: result.changed
          ? `Reconciled ${result.projectedCount} validated TeamRun history row(s).`
          : `TeamRun history index already matches ${result.projectedCount} validated root(s).`,
      });
    } catch (error) {
      details.push({
        itemId: "team-history-index",
        status: "FAILED",
        message: `TeamRun history index reconciliation failed: ${message(error)}`,
      });
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
}
