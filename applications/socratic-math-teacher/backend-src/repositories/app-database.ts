import { DatabaseSync } from "node:sqlite";

export const withAppDatabase = <T>(appDatabasePath: string, fn: (db: DatabaseSync) => T): T => {
  const db = new DatabaseSync(appDatabasePath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
};

export const withTransaction = <T>(db: DatabaseSync, fn: () => T): T => {
  db.exec("BEGIN");
  try {
    const result = fn();
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
};

export const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
};
