import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataMigrationRecoveryAction } from "../../../../../src/app-data-migrations/domain/app-data-migration-types.js";

const runnerMock = vi.hoisted(() => ({
  listStatuses: vi.fn(),
  runMigration: vi.fn(),
}));

vi.mock("../../../../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => runnerMock,
}));

import { AppDataMigrationResolver } from "../../../../../src/api/graphql/types/app-data-migrations.js";

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
      summaryJson: null,
      summary: null,
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
    await expect(new AppDataMigrationResolver().getAppDataMigrations()).resolves.toMatchObject([{
      migrationId: "startup-only-failed",
      recoveryAction: AppDataMigrationRecoveryAction.RESTART_TO_RETRY,
      canRetry: false,
    }]);
    expect(schema.getType("AppDataMigrationRecoveryAction")?.toString())
      .toBe("AppDataMigrationRecoveryAction");
  });
});
