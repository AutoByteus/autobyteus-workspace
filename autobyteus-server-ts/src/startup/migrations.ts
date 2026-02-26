import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { appConfigProvider } from "../config/app-config-provider.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

function getPnpmCommand(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function getPrismaCommand(appRoot: string): { command: string; argsPrefix: string[] } {
  const prismaBin = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const localPrisma = path.join(appRoot, "node_modules", ".bin", prismaBin);
  if (fs.existsSync(localPrisma)) {
    return { command: localPrisma, argsPrefix: [] };
  }
  return { command: getPnpmCommand(), argsPrefix: ["exec", "prisma"] };
}

const BASELINE_MIGRATION = "20260203074245_init";
const SYNC_COLUMNS_MIGRATION = "20260211214500_add_sync_columns_and_tombstones";

function runPrismaCommand(appRoot: string, args: string[]): void {
  const { command, argsPrefix } = getPrismaCommand(appRoot);
  execFileSync(command, [...argsPrefix, ...args], {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  });
}

function runPrismaSql(
  appRoot: string,
  schemaPath: string,
  sql: string,
  options?: { ignoreErrorPatterns?: string[] },
): void {
  const { command, argsPrefix } = getPrismaCommand(appRoot);
  try {
    execFileSync(command, [...argsPrefix, "db", "execute", "--schema", schemaPath, "--stdin"], {
      cwd: appRoot,
      stdio: ["pipe", "inherit", "pipe"],
      env: process.env,
      input: sql,
    });
  } catch (error) {
    const errorMessage = String(error);
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    const combined = `${errorMessage}\n${stderr}`;
    if (options?.ignoreErrorPatterns?.some((pattern) => combined.includes(pattern))) {
      logger.warn(`Ignoring recoverable prisma db execute error: ${combined}`);
      return;
    }
    throw error;
  }
}

function isLegacyWorkflowSyncMigrationFailure(message: string): boolean {
  const mentionsSyncMigration = message.includes(SYNC_COLUMNS_MIGRATION);
  const mentionsWorkflowTableMissing = message.includes("no such table: agent_workflow_definitions");
  const isFailedMigrationState = message.includes("P3009");
  return mentionsSyncMigration && (mentionsWorkflowTableMissing || isFailedMigrationState);
}

function recoverLegacyWorkflowSyncMigration(appRoot: string, schemaPath: string): void {
  logger.warn(
    `Attempting recovery for failed migration ${SYNC_COLUMNS_MIGRATION} on legacy schema.`,
  );

  const recoverablePatterns = [
    "duplicate column name",
    "already exists",
  ];

  runPrismaSql(
    appRoot,
    schemaPath,
    'ALTER TABLE "mcp_server_configurations" ADD COLUMN "sync_id" TEXT;',
    { ignoreErrorPatterns: recoverablePatterns },
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    'ALTER TABLE "mcp_server_configurations" ADD COLUMN "sync_revision" TEXT;',
    { ignoreErrorPatterns: recoverablePatterns },
  );

  runPrismaSql(
    appRoot,
    schemaPath,
    'CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_definitions_sync_id" ON "agent_definitions"("sync_id");',
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    'CREATE UNIQUE INDEX IF NOT EXISTS "uq_prompts_sync_id" ON "prompts"("sync_id");',
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    'CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_team_definitions_sync_id" ON "agent_team_definitions"("sync_id");',
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    'CREATE UNIQUE INDEX IF NOT EXISTS "uq_mcp_server_configurations_sync_id" ON "mcp_server_configurations"("sync_id");',
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    `CREATE TABLE IF NOT EXISTS "sync_tombstones" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "entity_type" TEXT NOT NULL,
      "sync_id" TEXT NOT NULL,
      "source_node_id" TEXT NOT NULL,
      "source_epoch" INTEGER NOT NULL,
      "sequence" INTEGER NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    'CREATE UNIQUE INDEX IF NOT EXISTS "uq_sync_tombstones_revision" ON "sync_tombstones"("entity_type", "sync_id", "source_node_id", "source_epoch", "sequence");',
  );
  runPrismaSql(
    appRoot,
    schemaPath,
    'CREATE INDEX IF NOT EXISTS "idx_sync_tombstones_entity_sync_id" ON "sync_tombstones"("entity_type", "sync_id");',
  );

  // Prisma can still surface P3009 if a failed row remains in _prisma_migrations.
  runPrismaSql(
    appRoot,
    schemaPath,
    `DELETE FROM "_prisma_migrations"
     WHERE "migration_name" = '${SYNC_COLUMNS_MIGRATION}'
       AND "finished_at" IS NULL;`,
  );

  runPrismaCommand(appRoot, [
    "migrate",
    "resolve",
    "--applied",
    SYNC_COLUMNS_MIGRATION,
    "--schema",
    schemaPath,
  ]);
  runPrismaCommand(appRoot, ["migrate", "deploy", "--schema", schemaPath]);
  logger.info(
    `Recovery succeeded for migration ${SYNC_COLUMNS_MIGRATION}. Database migrations completed.`,
  );
}

export function runMigrations(): void {
  const config = appConfigProvider.config;
  const appRoot = config.getAppRootDir();
  const schemaPath = path.join(appRoot, "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    logger.warn("Prisma schema not found; skipping migrations.");
    return;
  }

  try {
    logger.info("Running Prisma migrations...");
    runPrismaCommand(appRoot, ["migrate", "deploy", "--schema", schemaPath]);
    logger.info("Database migrations completed successfully.");
  } catch (error) {
    const message = String(error);
    if (isLegacyWorkflowSyncMigrationFailure(message)) {
      recoverLegacyWorkflowSyncMigration(appRoot, schemaPath);
      return;
    }

    if (message.includes("P3005")) {
      logger.warn(
        "Prisma reported a non-empty schema without migration history. " +
          `Marking baseline migration ${BASELINE_MIGRATION} as applied.`,
      );
      runPrismaCommand(appRoot, [
        "migrate",
        "resolve",
        "--applied",
        BASELINE_MIGRATION,
        "--schema",
        schemaPath,
      ]);
      runPrismaCommand(appRoot, ["migrate", "deploy", "--schema", schemaPath]);
      logger.info("Baseline migration resolved; database migrations completed.");
      return;
    }
    logger.error(`Error running database migrations: ${message}`);
    throw error;
  }
}
