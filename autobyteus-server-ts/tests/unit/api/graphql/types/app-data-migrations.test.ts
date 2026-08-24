import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRecoveryAction } from "../../../../../src/app-data-migrations/domain/app-data-migration-types.js";

const runnerMock = vi.hoisted(() => ({
  listStatuses: vi.fn(),
  runMigration: vi.fn(),
}));
const rebuildTeamRunCatalog = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../../../../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => runnerMock,
}));
vi.mock("../../../../../src/run-history/services/team-run-package-catalog.js", () => ({
  TeamRunPackageCatalog: class {
    rebuild = rebuildTeamRunCatalog;
  },
}));

import { AppDataMigrationResolver } from "../../../../../src/api/graphql/types/app-data-migrations.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../../../../../src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";

describe("AppDataMigrationResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("rebuilds strict V2 package admission before a manual TeamRun migration Retry completes", async () => {
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
});
