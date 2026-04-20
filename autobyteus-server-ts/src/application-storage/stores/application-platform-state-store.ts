import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ApplicationStorageLayout } from "../domain/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  ApplicationStorageLifecycleService,
  getApplicationStorageLifecycleService,
} from "../services/application-storage-lifecycle-service.js";

export class ApplicationPlatformStateStore {
  constructor(
    private readonly dependencies: {
      storageLifecycleService?: ApplicationStorageLifecycleService;
    } = {},
  ) {}

  private get storageLifecycleService(): ApplicationStorageLifecycleService {
    return this.dependencies.storageLifecycleService ?? getApplicationStorageLifecycleService();
  }

  listExistingPlatformDatabasePaths(): string[] {
    const applicationsRoot = path.join(appConfigProvider.config.getAppDataDir(), "applications");
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
