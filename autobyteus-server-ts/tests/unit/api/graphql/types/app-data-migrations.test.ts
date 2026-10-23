import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRecoveryAction } from "../../../../../src/app-data-migrations/domain/app-data-migration-types.js";

const runnerMock = vi.hoisted(() => ({
  listStatuses: vi.fn(),
  runMigration: vi.fn(),
  capabilityReadiness: vi.fn(),
}));
const rebuildTeamRunCatalog = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../../../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => runnerMock,
}));
vi.mock("../../../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class {
    rebuild = rebuildTeamRunCatalog;
  },
}));

import { AppDataMigrationResolver } from "../../../../../src/api/graphql/types/app-data-migrations.js";
import { getTokenUsageCapabilityState } from "../../../../../src/token-usage/providers/token-usage-capability.js";
import { CustomLlmProviderStore } from "../../../../../src/llm-management/llm-providers/stores/custom-llm-provider-store.js";
import { applyCapabilityReadiness } from "../../../../../src/startup/app-data-capability-readiness.js";

const TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID = "20260824_team_run_execution_tree_v2";
const retried = (migrationId: string, status: "SUCCEEDED" | "SUCCEEDED_WITH_WARNINGS" | "FAILED") => ({
  migrationId,
  displayName: `Migration ${migrationId}`,
  description: "test migration",
  status,
  requiredOnStartup: true,
  recoveryAction: AppDataMigrationRecoveryAction.MANUAL_RETRY,
  canRetry: status !== "SUCCEEDED",
  attempts: 2,
  startedAt: null,
  completedAt: null,
  summary: "Scanned 1; migrated 1; skipped 0; failed 0.",
  errorMessage: null,
  logPath: null,
});

describe("AppDataMigrationResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runnerMock.capabilityReadiness.mockResolvedValue({ token_usage_history: true, custom_llm_providers: true });
  });

  it("publishes the runner-owned recovery action and derived retry capability through GraphQL", async () => {
    runnerMock.listStatuses.mockResolvedValue([{
      migrationId: "startup-only-failed",
      displayName: "Startup-only migration",
      description: "Runs during startup",
      status: "FAILED",
      requiredOnStartup: true,
      recoveryAction: AppDataMigrationRecoveryAction.RESTART_TO_RETRY,
      canRetry: false,
      attempts: 1,
      startedAt: null,
      completedAt: new Date("2026-08-20T10:00:00.000Z"),
      summary: "Scanned 1; migrated 0; skipped 0; failed 1.",
      errorMessage: "retry at startup",
      logPath: null,
    }]);
    const schema = await buildSchema({
      resolvers: [AppDataMigrationResolver],
      validate: false,
    });

    const recordType = schema.getType("AppDataMigrationRecordObject");
    expect(recordType && "getFields" in recordType
      ? recordType.getFields().recoveryAction?.type.toString()
      : null).toBe("AppDataMigrationRecoveryAction!");
    expect(recordType && "getFields" in recordType
      ? recordType.getFields().summary?.type.toString()
      : null).toBe("String");
    await expect(new AppDataMigrationResolver().getAppDataMigrations()).resolves.toMatchObject([{
      migrationId: "startup-only-failed",
      recoveryAction: AppDataMigrationRecoveryAction.RESTART_TO_RETRY,
      canRetry: false,
      summary: "Scanned 1; migrated 0; skipped 0; failed 1.",
    }]);
    expect(schema.getType("AppDataMigrationRecoveryAction")?.toString())
      .toBe("AppDataMigrationRecoveryAction");
  });

  it("rebuilds compound current-package admission before a manual TeamRun migration Retry completes", async () => {
    runnerMock.runMigration.mockResolvedValue({
      migrationId: TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID,
      displayName: "Upgrade TeamRun execution trees to V2",
      description: "Materializes Team defaults",
      status: "SUCCEEDED",
      requiredOnStartup: true,
      recoveryAction: AppDataMigrationRecoveryAction.MANUAL_RETRY,
      canRetry: false,
      attempts: 2,
      startedAt: null,
      completedAt: null,
      summary: "Scanned 1; migrated 1; skipped 0; failed 0.",
      errorMessage: null,
      logPath: null,
    });

    await expect(new AppDataMigrationResolver().runAppDataMigration(
      TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID,
    )).resolves.toMatchObject({ success: true });

    expect(runnerMock.runMigration).toHaveBeenCalledWith(TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID);
    expect(rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(runnerMock.runMigration.mock.invocationCallOrder[0])
      .toBeLessThan(rebuildTeamRunCatalog.mock.invocationCallOrder[0]!);
  });

  it("rebuilds admission and refreshes capabilities after a retry of any migration, so it takes effect without a restart (DS-003)", async () => {
    applyCapabilityReadiness({ token_usage_history: false, custom_llm_providers: false });
    runnerMock.runMigration.mockResolvedValue(retried("20260803_custom_provider_readable_identity", "SUCCEEDED_WITH_WARNINGS"));

    await expect(new AppDataMigrationResolver().runAppDataMigration("20260803_custom_provider_readable_identity"))
      .resolves.toMatchObject({ success: true });

    expect(rebuildTeamRunCatalog).toHaveBeenCalledTimes(1);
    expect(runnerMock.capabilityReadiness).toHaveBeenCalledTimes(1);
    expect(rebuildTeamRunCatalog.mock.invocationCallOrder[0])
      .toBeLessThan(runnerMock.capabilityReadiness.mock.invocationCallOrder[0]!);
    expect(getTokenUsageCapabilityState()).toEqual({ kind: "READY" });
    await expect(new CustomLlmProviderStore("/tmp/app-data-migrations-resolver/no-such-data").listProviders()).resolves.toEqual([]);
  });

  it("leaves admission and capabilities untouched after a failed retry", async () => {
    applyCapabilityReadiness({ token_usage_history: false, custom_llm_providers: true });
    runnerMock.runMigration.mockResolvedValue(retried("20260819_token_usage_run_records_v1", "FAILED"));

    await expect(new AppDataMigrationResolver().runAppDataMigration("20260819_token_usage_run_records_v1"))
      .resolves.toMatchObject({ success: false });

    expect(rebuildTeamRunCatalog).not.toHaveBeenCalled();
    expect(runnerMock.capabilityReadiness).not.toHaveBeenCalled();
    expect(getTokenUsageCapabilityState()).toEqual({ kind: "HISTORY_MIGRATION_PENDING" });
    applyCapabilityReadiness({ token_usage_history: true, custom_llm_providers: true });
  });
});
