import path from "node:path";
import type { TeamRunExecutionTreeSnapshot } from "../../../agent-team-execution/domain/team-run-execution-tree.js";
import { TokenUsageLedgerStore } from "../../../token-usage/providers/token-usage-ledger-store.js";
import type {
  TokenUsageRuntimeSchemaSnapshot,
  TokenUsageTeamRunV1ApplyResult,
  TokenUsageTeamRunV1RootUpdate,
} from "../../../token-usage/repositories/sql/token-usage-team-run-v1-migration-repository.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../../domain/app-data-migration-types.js";
import {
  TeamRunMigrationStateClassifier,
  type TeamRunMigrationState,
} from "../team-run-migration-state-classifier.js";
import {
  buildTokenUsageTaskTeamRunIndexFromStates,
  type TokenUsageTaskTeamRunIndex,
} from "../token-usage-task-team-run-index.js";
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
import {
  invalidateConflictingTokenEvidence,
  planTeamRunV1TokenRow,
  type TeamRunV1TokenRowDisposition,
} from "./token-usage-team-run-v1-row-planner.js";

export { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "./team-run-execution-tree-v1-constants.js";

type TokenMigrationBoundary = Pick<TokenUsageLedgerStore,
  "inspectTeamRunV1Migration" | "applyTeamRunV1RootUpdates" | "disconnectTeamRunV1Migration">;

type PlannedPredecessorRoot = Readonly<{
  state: Extract<TeamRunMigrationState, { kind: "PREDECESSOR" }>;
  sources: TeamRunPredecessorSources;
  package: PlannedTeamRunV1Package;
}>;

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

const summaryFor = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter((detail) => detail.status === "MIGRATED").length,
  skippedCount: details.filter((detail) => detail.status === "SKIPPED").length,
  failedCount: details.filter((detail) => detail.status === "FAILED").length,
  details,
});

const emptyTaskIndex = (): TokenUsageTaskTeamRunIndex => Object.freeze({
  entries: new Map(),
  unusableTaskTeamRunIds: new Set<string>(),
  issues: Object.freeze([]),
});

export class TeamRunExecutionTreeV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID;
  readonly displayName = "TeamRun execution-tree V1 migration";
  readonly description = "Promotes released TeamRun/task/message/token state directly to the exact V1 rooted execution model.";
  readonly requiredOnStartup = true;
  private readonly backupRoot: string;

  constructor(
    private readonly memoryDir: string,
    appDataDir: string,
    private readonly tokenStore: TokenMigrationBoundary = new TokenUsageLedgerStore(),
  ) {
    this.backupRoot = path.join(appDataDir, "app-data-migration-backups", this.id);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const details: AppDataMigrationItemDetail[] = [];
    const trees = new Map<string, TeamRunExecutionTreeSnapshot>();
    let tokenSnapshot: TokenUsageRuntimeSchemaSnapshot | null = null;
    let states: readonly TeamRunMigrationState[] | null = null;

    try {
      tokenSnapshot = await this.inspectTokenEvidence(details);
      states = await this.classifyRoots(details);
      const resolver = new TeamRunPredecessorSourceResolver(this.backupRoot);
      const taskIndex = states
        ? await this.buildTaskIndex(states, resolver, details)
        : emptyTaskIndex();
      let tokenDispositions: readonly TeamRunV1TokenRowDisposition[] = Object.freeze([]);
      if (tokenSnapshot) {
        try {
          tokenDispositions = invalidateConflictingTokenEvidence(
            tokenSnapshot.rows.map((row) => planTeamRunV1TokenRow(row, taskIndex)),
          );
        } catch (error) {
          details.push({
            itemId: "token-usage:row-planning",
            status: "FAILED",
            message: `Token row planning reported a warning; no root updates were planned: ${message(error)}`,
          });
        }
      }

      if (states) {
        for (const state of states) {
          try {
            await this.processRoot(state, resolver, tokenDispositions, trees, details);
          } catch (error) {
            details.push({
              itemId: `team-root:${state.rootTeamRunId}`,
              filePath: state.rootDir,
              status: "FAILED",
              message: `Unexpected root-local migration warning; strict current-package admission decides availability: ${message(error)}`,
            });
          }
        }
      }
      if (tokenSnapshot) {
        try {
          await this.applyTokenDispositions(tokenSnapshot, tokenDispositions, trees, details);
        } catch (error) {
          details.push({
            itemId: "token-usage:root-update-transaction",
            status: "FAILED",
            message: `Unexpected token apply warning; startup may continue: ${message(error)}`,
          });
        }
      }
      if (states) {
        try {
          await this.reconcileTeamHistory(trees, details);
        } catch (error) {
          details.push({
            itemId: "team-history-index",
            status: "FAILED",
            message: `Unexpected TeamRun history warning; startup may continue: ${message(error)}`,
          });
        }
      } else {
        details.push({
          itemId: "team-history-index",
          status: "FAILED",
          message: "History reconciliation was not attempted because Team roots could not be enumerated; existing history was left untouched.",
        });
      }
    } catch (error) {
      details.push({
        itemId: "migration:unexpected",
        status: "FAILED",
        message: `Unexpected final migration problem was isolated as a warning: ${message(error)}`,
      });
    }

    try {
      await this.tokenStore.disconnectTeamRunV1Migration();
    } catch (error) {
      details.push({
        itemId: "token-usage:disconnect",
        status: "FAILED",
        message: `Token migration client cleanup reported a warning: ${message(error)}`,
      });
    }

    const summary = summaryFor(details);
    return {
      status: summary.failedCount ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED",
      summary,
      errorMessage: summary.failedCount
        ? `${summary.failedCount} TeamRun V1 migration warning item(s) were isolated; startup may continue.`
        : null,
    };
  }

  private async inspectTokenEvidence(
    details: AppDataMigrationItemDetail[],
  ): Promise<TokenUsageRuntimeSchemaSnapshot | null> {
    try {
      return await this.tokenStore.inspectTeamRunV1Migration();
    } catch (error) {
      details.push({
        itemId: "token-usage:evidence-snapshot",
        status: "FAILED",
        message: `Token evidence could not be inspected and remains unchanged: ${message(error)}`,
      });
      return null;
    }
  }

  private async classifyRoots(
    details: AppDataMigrationItemDetail[],
  ): Promise<readonly TeamRunMigrationState[] | null> {
    try {
      return await new TeamRunMigrationStateClassifier(this.memoryDir).listAndClassifyRoots();
    } catch (error) {
      details.push({
        itemId: "team-roots:enumeration",
        status: "FAILED",
        message: `Team root enumeration reported a migration warning: ${message(error)}`,
      });
      return null;
    }
  }

  private async buildTaskIndex(
    states: readonly TeamRunMigrationState[],
    resolver: TeamRunPredecessorSourceResolver,
    details: AppDataMigrationItemDetail[],
  ): Promise<TokenUsageTaskTeamRunIndex> {
    try {
      const index = await buildTokenUsageTaskTeamRunIndexFromStates(states, resolver);
      details.push(...index.issues.map((issue) => ({
        itemId: issue.itemId,
        filePath: issue.filePath,
        status: "FAILED" as const,
        message: `Task topology evidence warning: ${issue.message}`,
      })));
      return index;
    } catch (error) {
      details.push({
        itemId: "token-usage:task-topology-index",
        status: "FAILED",
        message: `Task topology evidence indexing reported a warning: ${message(error)}`,
      });
      return emptyTaskIndex();
    }
  }

  private async processRoot(
    state: TeamRunMigrationState,
    resolver: TeamRunPredecessorSourceResolver,
    tokenDispositions: readonly TeamRunV1TokenRowDisposition[],
    trees: Map<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    if (state.kind === "CURRENT_V1") {
      trees.set(state.rootTeamRunId, state.package.executionTree);
      details.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.rootDir,
        status: "SKIPPED",
        message: "Already a complete independently validated V1 package.",
      });
      return;
    }
    if (state.kind === "HISTORICAL_RESIDUE") {
      details.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.manifestPath,
        status: "SKIPPED",
        message: "Validated historical TeamRun residue remains preserved outside current admission.",
      });
      return;
    }
    if (state.kind === "INVALID") {
      details.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.evidencePath,
        status: "FAILED",
        message: `Preserved and excluded before mutation: ${state.reason}`,
      });
      return;
    }

    let plan: PlannedPredecessorRoot;
    try {
      const sources = await resolver.resolve(state.rootTeamRunId, state.rootDir);
      const packagePlan = await planPredecessorTeamRunV1Package({
        rootTeamRunId: state.rootTeamRunId,
        rootDir: state.rootDir,
        metadataPath: state.metadataPath,
        taskRecordsPath: sources.taskRecordsPath,
        communicationPath: sources.communicationPath,
        tokenRows: tokenDispositions.filter((disposition) =>
          disposition.kind === "RESOLVED"
          && disposition.finalRootTeamRunId === state.rootTeamRunId),
      });
      plan = Object.freeze({ state, sources, package: packagePlan });
    } catch (error) {
      details.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.rootDir,
        status: "FAILED",
        message: `Preserved and excluded before mutation: ${message(error)}`,
      });
      return;
    }

    const promotion = await new TeamRunV1PackagePromoter(this.backupRoot).promote({
      rootTeamRunId: state.rootTeamRunId,
      rootDir: state.rootDir,
      metadataPath: state.metadataPath,
      sourceTaskRecordsPath: plan.sources.taskRecordsPath,
      sourceCommunicationPath: plan.sources.communicationPath,
      package: plan.package,
    });
    if (promotion.kind === "COMMITTED") {
      trees.set(state.rootTeamRunId, plan.package.executionTree);
      details.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.rootDir,
        backupPath: promotion.backupDirectory,
        status: "MIGRATED",
        message: "Promoted and revalidated the complete TeamRun V1 package.",
      });
      return;
    }
    if (promotion.kind === "COMMITTED_WITH_WARNING") {
      trees.set(state.rootTeamRunId, plan.package.executionTree);
      details.push({
        itemId: `team-root:${state.rootTeamRunId}`,
        filePath: state.rootDir,
        backupPath: promotion.backupDirectory,
        status: "FAILED",
        message: `${promotion.message} The independently valid current package remains admitted.`,
      });
      return;
    }
    details.push({
      itemId: `team-root:${state.rootTeamRunId}`,
      filePath: state.rootDir,
      backupPath: promotion.backupDirectory,
      status: "FAILED",
      message: `Promotion warning; root excluded without a preservation claim. ${promotion.message} Observation: ${promotion.validationMessage}`,
    });
  }

  private async applyTokenDispositions(
    snapshot: TokenUsageRuntimeSchemaSnapshot,
    dispositions: readonly TeamRunV1TokenRowDisposition[],
    trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    const finalDispositions = dispositions.map((disposition): TeamRunV1TokenRowDisposition => {
      if (
        disposition.kind !== "RESOLVED"
        || disposition.row.rootTeamRunId === disposition.finalRootTeamRunId
        || trees.has(disposition.finalRootTeamRunId)
      ) {
        return disposition;
      }
      return Object.freeze({
        kind: "PRESERVED_WARNING" as const,
        row: disposition.row,
        detail: {
          itemId: disposition.detail.itemId,
          status: "FAILED" as const,
          message: `Resolved root '${disposition.finalRootTeamRunId}' is not an admitted current package; row remains unchanged.`,
        },
      });
    });
    const updates: TokenUsageTeamRunV1RootUpdate[] = finalDispositions.flatMap((disposition) =>
      disposition.kind === "RESOLVED"
      && disposition.row.rootTeamRunId !== disposition.finalRootTeamRunId
        ? [{ id: disposition.row.id, finalRootTeamRunId: disposition.finalRootTeamRunId }]
        : []);
    let applied: TokenUsageTeamRunV1ApplyResult;
    try {
      applied = await this.tokenStore.applyTeamRunV1RootUpdates(updates, snapshot);
    } catch (error) {
      applied = Object.freeze({
        kind: "ROLLED_BACK_WARNING" as const,
        rollbackVerified: false,
        message: `Token root apply boundary threw unexpectedly: ${message(error)}`,
      });
    }
    const updateIds = new Set(updates.map((update) => update.id));
    if (applied.kind === "ROLLED_BACK_WARNING") {
      details.push(...finalDispositions.map((disposition) => updateIds.has(disposition.row.id)
        ? {
          itemId: disposition.detail.itemId,
          status: "FAILED" as const,
          message: `${applied.message} This row remains at its prior root attribution.`,
        }
        : disposition.detail));
      details.push({
        itemId: "token-usage:root-update-transaction",
        status: "FAILED",
        message: applied.message,
      });
      return;
    }
    details.push(...finalDispositions.map((disposition) => disposition.detail));
    details.push({
      itemId: "token-usage:root-update-transaction",
      status: applied.alreadyCurrent ? "SKIPPED" : "MIGRATED",
      message: applied.alreadyCurrent
        ? "Token runtime root schema/index are current; no row root update was required."
        : `Updated and verified ${applied.updatedRows} resolved token row root(s) transactionally while retaining predecessor evidence.`,
    });
  }

  private async reconcileTeamHistory(
    trees: ReadonlyMap<string, TeamRunExecutionTreeSnapshot>,
    details: AppDataMigrationItemDetail[],
  ): Promise<void> {
    const result = await new TeamRunHistoryIndexReconciler(
      this.memoryDir,
      this.backupRoot,
    ).reconcile(trees);
    if (result.kind === "WARNING") {
      details.push({
        itemId: "team-history-index",
        status: "FAILED",
        message: `TeamRun history reconciliation warning: ${result.message}`,
      });
      return;
    }
    details.push({
      itemId: "team-history-index",
      backupPath: result.backupPath,
      status: result.changed ? "MIGRATED" : "SKIPPED",
      message: result.changed
        ? `Reconciled ${result.projectedCount} independently admitted TeamRun history row(s).`
        : `TeamRun history index already matches ${result.projectedCount} admitted root(s).`,
    });
  }
}
