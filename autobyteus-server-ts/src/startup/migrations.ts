import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { appConfigProvider } from "../config/app-config-provider.js";
import { getPersistenceProfile, isFilePersistenceProfile } from "../persistence/profile.js";

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

function runPrismaCommand(appRoot: string, args: string[]): void {
  const { command, argsPrefix } = getPrismaCommand(appRoot);
  execFileSync(command, [...argsPrefix, ...args], {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  });
}

export function runMigrations(): void {
  const profile = getPersistenceProfile();
  if (isFilePersistenceProfile(profile)) {
    logger.info("Skipping Prisma migrations for file persistence profile.");
    return;
  }

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
