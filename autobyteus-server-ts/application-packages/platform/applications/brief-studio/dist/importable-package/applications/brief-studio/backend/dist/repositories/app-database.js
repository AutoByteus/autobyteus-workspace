import { DatabaseSync } from "node:sqlite";
export const withAppDatabase = (appDatabasePath, fn) => {
    const db = new DatabaseSync(appDatabasePath);
    try {
        return fn(db);
    }
    finally {
        db.close();
    }
};
export const withTransaction = (db, fn) => {
    db.exec("BEGIN");
    try {
        const result = fn();
        db.exec("COMMIT");
        return result;
    }
    catch (error) {
        try {
            db.exec("ROLLBACK");
        }
        catch {
            // no-op
        }
        throw error;
    }
};
export const parseJson = (value) => {
    if (!value) {
        return null;
    }
    return JSON.parse(value);
};
export const stringifyJson = (value) => JSON.stringify(value);
