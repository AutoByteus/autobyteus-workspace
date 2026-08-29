import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const applicationEngineStorageNeedsRepair = (
  appDatabasePath: string,
): boolean => {
  try {
    const stats = fs.statSync(appDatabasePath);
    if (stats.size <= 0) {
      return true;
    }

    const db = new DatabaseSync(appDatabasePath);
    try {
      const row = db
        .prepare(
          `SELECT COUNT(*) AS tableCount
             FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'`,
        )
        .get() as { tableCount?: number } | undefined;
      return Number(row?.tableCount ?? 0) === 0;
    } finally {
      db.close();
    }
  } catch {
    return true;
  }
};
