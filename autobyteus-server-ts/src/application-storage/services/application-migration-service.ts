import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bATTACH\b/i, message: "ATTACH is not allowed in app migrations." },
  { pattern: /\bDETACH\b/i, message: "DETACH is not allowed in app migrations." },
  { pattern: /\bVACUUM\s+INTO\b/i, message: "VACUUM INTO is not allowed in app migrations." },
  { pattern: /\bload_extension\s*\(/i, message: "load_extension is not allowed in app migrations." },
  { pattern: /\bPRAGMA\s+writable_schema\b/i, message: "PRAGMA writable_schema is not allowed in app migrations." },
  { pattern: /\b__autobyteus_[A-Za-z0-9_]*\b/i, message: "The __autobyteus_ prefix is reserved for platform-owned state." },
  { pattern: /\bsqlite_[A-Za-z0-9_]*\b/i, message: "SQLite system tables are not allowed in app migrations." },
];

export class ApplicationMigrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationMigrationValidationError";
  }
}

const stripComments = (sql: string): string =>
  sql
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");

const sha256 = (content: string): string =>
  createHash("sha256").update(content, "utf-8").digest("hex");

export class ApplicationMigrationService {
  validateMigrationSql(sql: string, migrationFileName: string): void {
    const normalizedSql = stripComments(sql);
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(normalizedSql)) {
        throw new ApplicationMigrationValidationError(
          `Migration '${migrationFileName}' is invalid: ${rule.message}`,
        );
      }
    }
  }

  async applyPendingMigrations(input: {
    applicationId: string;
    appDatabasePath: string;
    platformDatabasePath: string;
    migrationsDirPath: string | null;
  }): Promise<void> {
    if (!input.migrationsDirPath) {
      return;
    }

    let entries: Array<{ name: string; absolutePath: string }> = [];
    try {
      const dirEntries = await fs.readdir(input.migrationsDirPath, { withFileTypes: true });
      entries = dirEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => ({
          name: entry.name,
          absolutePath: path.join(input.migrationsDirPath!, entry.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      throw new Error(
        `Failed to read migrations for application '${input.applicationId}': ${String(error)}`,
      );
    }

    if (entries.length === 0) {
      return;
    }

    const appDb = new DatabaseSync(input.appDatabasePath);
    const platformDb = new DatabaseSync(input.platformDatabasePath);
    try {
      const appliedRows = platformDb
        .prepare(
          `SELECT migration_name, checksum
             FROM __autobyteus_app_migrations
            ORDER BY migration_name ASC`,
        )
        .all() as Array<{ migration_name: string; checksum: string }>;
      const appliedByName = new Map(appliedRows.map((row) => [row.migration_name, row.checksum]));

      for (const entry of entries) {
        const sql = await fs.readFile(entry.absolutePath, "utf-8");
        this.validateMigrationSql(sql, entry.name);
        const checksum = sha256(sql);
        const appliedChecksum = appliedByName.get(entry.name) ?? null;
        if (appliedChecksum) {
          if (appliedChecksum !== checksum) {
            throw new Error(
              `Migration '${entry.name}' for application '${input.applicationId}' was already applied with a different checksum.`,
            );
          }
          continue;
        }

        try {
          appDb.exec("BEGIN IMMEDIATE");
          appDb.exec(sql);
          appDb.exec("COMMIT");
        } catch (error) {
          try {
            appDb.exec("ROLLBACK");
          } catch {
            // no-op
          }
          throw new Error(
            `Failed to apply migration '${entry.name}' for application '${input.applicationId}': ${String(error)}`,
          );
        }

        platformDb
          .prepare(
            `INSERT INTO __autobyteus_app_migrations (migration_name, checksum, applied_at)
             VALUES (?, ?, ?)`,
          )
          .run(entry.name, checksum, new Date().toISOString());
        appliedByName.set(entry.name, checksum);
      }
    } finally {
      platformDb.close();
      appDb.close();
    }
  }
}
