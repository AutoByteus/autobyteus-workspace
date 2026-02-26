import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { getTestDatabasePath, getTestDatabaseUrl } from "./prisma-test-config.js";

const applySqliteMigrationsFallback = (databasePath: string): void => {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.rmSync(databasePath, { force: true });

  const migrationsRoot = path.resolve(process.cwd(), "prisma", "migrations");
  const migrationDirs = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const migrationDir of migrationDirs) {
    const migrationSqlPath = path.join(migrationsRoot, migrationDir, "migration.sql");
    if (!fs.existsSync(migrationSqlPath)) {
      continue;
    }
    const sql = fs.readFileSync(migrationSqlPath, "utf-8");
    execFileSync("sqlite3", [databasePath], {
      input: sql,
      stdio: ["pipe", "inherit", "inherit"],
    });
  }
};

export default async (): Promise<void> => {
  const databaseUrl = getTestDatabaseUrl();
  try {
    execSync("./node_modules/.bin/prisma migrate reset --force --skip-generate", {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
  } catch {
    applySqliteMigrationsFallback(getTestDatabasePath());
  }
};
