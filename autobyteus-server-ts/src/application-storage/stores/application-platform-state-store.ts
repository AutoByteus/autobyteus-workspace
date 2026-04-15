import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { ApplicationStorageLayout } from "../domain/models.js";
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
