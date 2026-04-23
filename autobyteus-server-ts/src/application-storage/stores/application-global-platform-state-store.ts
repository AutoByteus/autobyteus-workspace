import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { appConfigProvider } from "../../config/app-config-provider.js";

const resolveGlobalDatabasePath = (): string =>
  path.join(appConfigProvider.config.getAppDataDir(), "applications", "_global", "db", "orchestration.sqlite");

const ensureGlobalDatabasePrepared = (): string => {
  const databasePath = resolveGlobalDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS __autobyteus_application_run_lookup (
        run_id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        binding_id TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS __autobyteus_application_run_lookup_by_binding
        ON __autobyteus_application_run_lookup (application_id, binding_id);
    `);
  } finally {
    db.close();
  }
  return databasePath;
};

export class ApplicationGlobalPlatformStateStore {
  withDatabase<T>(fn: (db: DatabaseSync) => T): T {
    const db = new DatabaseSync(ensureGlobalDatabasePrepared());
    try {
      return fn(db);
    } finally {
      db.close();
    }
  }

  withTransaction<T>(fn: (db: DatabaseSync) => T): T {
    return this.withDatabase((db) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = fn(db);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // no-op
        }
        throw error;
      }
    });
  }
}
