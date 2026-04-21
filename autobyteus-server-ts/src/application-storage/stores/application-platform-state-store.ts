import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ApplicationStorageLayout } from "../domain/models.js";
import type { ApplicationStoragePathConfig } from "../utils/application-storage-paths.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  ApplicationStorageLifecycleService,
  getApplicationStorageLifecycleService,
} from "../services/application-storage-lifecycle-service.js";

export type ApplicationExistingStatePresence = "PRESENT" | "ABSENT";

const resolveStoredApplicationId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const decodeReadableStorageKey = (storageKey: string): string | null => {
  if (/^[^/]+__[^/]+__[a-f0-9]{64}$/i.test(storageKey)) {
    return null;
  }

  try {
    return resolveStoredApplicationId(decodeURIComponent(storageKey));
  } catch {
    return null;
  }
};

const readApplicationIdFromDatabase = (databasePath: string): string | null => {
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(databasePath, { readOnly: true });
    const tables = new Set(
      (db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{ name: string }>).
        map((table) => table.name),
    );

    if (tables.has("__autobyteus_storage_meta")) {
      const metaRow = db.prepare(
        `SELECT meta_value FROM __autobyteus_storage_meta WHERE meta_key = 'application_id' LIMIT 1`,
      ).get() as { meta_value: string | null } | undefined;
      const metaApplicationId = resolveStoredApplicationId(metaRow?.meta_value ?? null);
      if (metaApplicationId) {
        return metaApplicationId;
      }
    }

    const recoveryQueries: Array<[string, string]> = [
      ["__autobyteus_session_index", `SELECT application_id FROM __autobyteus_session_index WHERE application_id <> '' LIMIT 1`],
      ["__autobyteus_session_projection", `SELECT application_id FROM __autobyteus_session_projection WHERE application_id <> '' LIMIT 1`],
      ["__autobyteus_publication_journal", `SELECT application_id FROM __autobyteus_publication_journal WHERE application_id <> '' LIMIT 1`],
      ["__autobyteus_run_bindings", `SELECT json_extract(summary_json, '$.applicationId') AS application_id FROM __autobyteus_run_bindings WHERE json_extract(summary_json, '$.applicationId') IS NOT NULL AND json_extract(summary_json, '$.applicationId') <> '' LIMIT 1`],
      ["__autobyteus_execution_event_journal", `SELECT application_id FROM __autobyteus_execution_event_journal WHERE application_id <> '' LIMIT 1`],
    ];

    for (const [tableName, sql] of recoveryQueries) {
      if (!tables.has(tableName)) {
        continue;
      }
      const row = db.prepare(sql).get() as { application_id: string | null } | undefined;
      const applicationId = resolveStoredApplicationId(row?.application_id ?? null);
      if (applicationId) {
        return applicationId;
      }
    }
  } catch {
    return null;
  } finally {
    db?.close();
  }

  return null;
};

export class ApplicationPlatformStateStore {
  constructor(
    private readonly dependencies: {
      appConfig?: ApplicationStoragePathConfig;
      storageLifecycleService?: ApplicationStorageLifecycleService;
    } = {},
  ) {}

  private get appConfig(): ApplicationStoragePathConfig {
    return this.dependencies.appConfig ?? appConfigProvider.config;
  }

  private get storageLifecycleService(): ApplicationStorageLifecycleService {
    return this.dependencies.storageLifecycleService ?? getApplicationStorageLifecycleService();
  }

  listExistingPlatformDatabasePaths(): string[] {
    const applicationsRoot = path.join(this.appConfig.getAppDataDir(), "applications");
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(applicationsRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(applicationsRoot, entry.name, "db", "platform.sqlite"))
      .filter((databasePath) => fs.existsSync(databasePath) && fs.statSync(databasePath).isFile())
      .sort((left, right) => left.localeCompare(right));
  }

  async listKnownApplicationIds(): Promise<string[]> {
    const applicationsRoot = path.join(this.appConfig.getAppDataDir(), "applications");
    const knownApplicationIds = new Set<string>();

    for (const databasePath of this.listExistingPlatformDatabasePaths()) {
      const storageKey = path.relative(applicationsRoot, databasePath).split(path.sep)[0]?.trim() ?? "";
      if (!storageKey) {
        continue;
      }

      const resolvedApplicationId = readApplicationIdFromDatabase(databasePath)
        ?? decodeReadableStorageKey(storageKey);
      if (!resolvedApplicationId) {
        continue;
      }
      knownApplicationIds.add(resolvedApplicationId);
    }

    return Array.from(knownApplicationIds).sort((left, right) => left.localeCompare(right));
  }

  async getExistingStatePresence(applicationId: string): Promise<ApplicationExistingStatePresence> {
    const layout = this.storageLifecycleService.getStorageLayout(applicationId);
    return fs.existsSync(layout.platformDatabasePath) ? "PRESENT" : "ABSENT";
  }

  async withDatabase<T>(
    applicationId: string,
    fn: (db: DatabaseSync, layout: ApplicationStorageLayout) => T,
  ): Promise<T> {
    const layout = await this.storageLifecycleService.ensurePlatformStatePrepared(applicationId);
    const db = new DatabaseSync(layout.platformDatabasePath);
    try {
      return fn(db, layout);
    } finally {
      db.close();
    }
  }

  async withExistingDatabase<T>(
    applicationId: string,
    fn: (db: DatabaseSync, layout: ApplicationStorageLayout) => T,
  ): Promise<T | null> {
    const layout = this.storageLifecycleService.getStorageLayout(applicationId);
    if (!fs.existsSync(layout.platformDatabasePath)) {
      return null;
    }

    const db = new DatabaseSync(layout.platformDatabasePath);
    try {
      return fn(db, layout);
    } finally {
      db.close();
    }
  }

  async withTransaction<T>(
    applicationId: string,
    fn: (db: DatabaseSync, layout: ApplicationStorageLayout) => T,
  ): Promise<T> {
    return this.withDatabase(applicationId, (db, layout) => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = fn(db, layout);
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
