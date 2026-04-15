import { DatabaseSync } from "node:sqlite";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationStorageLayout } from "../domain/models.js";
import {
  buildApplicationStorageLayout,
  ensureApplicationStorageDirectories,
  type ApplicationStoragePathConfig,
} from "../utils/application-storage-paths.js";
import { ApplicationMigrationService } from "./application-migration-service.js";

export class ApplicationStorageLifecycleService {
  private static instance: ApplicationStorageLifecycleService | null = null;

  static getInstance(
    dependencies: ConstructorParameters<typeof ApplicationStorageLifecycleService>[0] = {},
  ): ApplicationStorageLifecycleService {
    if (!ApplicationStorageLifecycleService.instance) {
      ApplicationStorageLifecycleService.instance = new ApplicationStorageLifecycleService(dependencies);
    }
    return ApplicationStorageLifecycleService.instance;
  }

  static resetInstance(): void {
    ApplicationStorageLifecycleService.instance = null;
  }

  private readonly platformPreparationPromiseByApplicationId = new Map<string, Promise<ApplicationStorageLayout>>();
  private readonly preparationPromiseByApplicationId = new Map<string, Promise<ApplicationStorageLayout>>();

  constructor(
    private readonly dependencies: {
      appConfig?: ApplicationStoragePathConfig;
      applicationBundleService?: ApplicationBundleService;
      migrationService?: ApplicationMigrationService;
    } = {},
  ) {}

  private get appConfig(): ApplicationStoragePathConfig {
    return this.dependencies.appConfig ?? appConfigProvider.config;
  }

  private get applicationBundleService(): ApplicationBundleService {
    return this.dependencies.applicationBundleService ?? ApplicationBundleService.getInstance();
  }

  private get migrationService(): ApplicationMigrationService {
    return this.dependencies.migrationService ?? new ApplicationMigrationService();
  }

  getStorageLayout(applicationId: string): ApplicationStorageLayout {
    return buildApplicationStorageLayout(this.appConfig, applicationId);
  }

  async ensurePlatformStatePrepared(applicationId: string): Promise<ApplicationStorageLayout> {
    return this.cachePreparation(
      applicationId,
      this.platformPreparationPromiseByApplicationId,
      () => this.preparePlatformState(applicationId),
    );
  }

  async ensureStoragePrepared(applicationId: string): Promise<ApplicationStorageLayout> {
    return this.cachePreparation(
      applicationId,
      this.preparationPromiseByApplicationId,
      () => this.prepareStorage(applicationId),
    );
  }

  private cachePreparation(
    applicationId: string,
    cache: Map<string, Promise<ApplicationStorageLayout>>,
    prepare: () => Promise<ApplicationStorageLayout>,
  ): Promise<ApplicationStorageLayout> {
    const cached = cache.get(applicationId);
    if (cached) {
      return cached;
    }

    const promise = prepare().finally(() => {
      cache.delete(applicationId);
    });
    cache.set(applicationId, promise);
    return promise;
  }

  private async preparePlatformState(applicationId: string): Promise<ApplicationStorageLayout> {
    await this.requireApplicationBundle(applicationId);

    const layout = this.getStorageLayout(applicationId);
    ensureApplicationStorageDirectories(layout);

    const platformDb = new DatabaseSync(layout.platformDatabasePath);
    try {
      this.bootstrapPlatformTables(platformDb);
    } finally {
      platformDb.close();
    }

    return layout;
  }

  private async prepareStorage(applicationId: string): Promise<ApplicationStorageLayout> {
    const bundle = await this.requireApplicationBundle(applicationId);
    const layout = await this.ensurePlatformStatePrepared(applicationId);
    const appDb = new DatabaseSync(layout.appDatabasePath);
    try {
      // Opening the database file is enough to materialize app.sqlite before migration execution.
    } finally {
      appDb.close();
    }

    await this.migrationService.applyPendingMigrations({
      applicationId,
      appDatabasePath: layout.appDatabasePath,
      platformDatabasePath: layout.platformDatabasePath,
      migrationsDirPath: bundle.backend.migrationsDirPath,
    });

    return layout;
  }

  private async requireApplicationBundle(applicationId: string) {
    const bundle = await this.applicationBundleService.getApplicationById(applicationId);
    if (!bundle) {
      throw new Error(`Application '${applicationId}' was not found.`);
    }
    return bundle;
  }

  private bootstrapPlatformTables(platformDb: DatabaseSync): void {
    platformDb.exec(`
      CREATE TABLE IF NOT EXISTS __autobyteus_storage_meta (
        meta_key TEXT PRIMARY KEY,
        meta_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS __autobyteus_app_migrations (
        migration_name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS __autobyteus_session_index (
        application_session_id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        status TEXT NOT NULL,
        active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        terminated_at TEXT,
        runtime_kind TEXT NOT NULL,
        runtime_run_id TEXT NOT NULL,
        runtime_definition_id TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS __autobyteus_active_session_by_app
        ON __autobyteus_session_index (application_id)
        WHERE active = 1;

      CREATE TABLE IF NOT EXISTS __autobyteus_session_projection (
        application_session_id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS __autobyteus_publication_journal (
        journal_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        application_id TEXT NOT NULL,
        application_session_id TEXT NOT NULL,
        family TEXT NOT NULL,
        published_at TEXT NOT NULL,
        producer_json TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        acked_at TEXT,
        last_dispatch_attempt_number INTEGER NOT NULL DEFAULT 0,
        last_dispatched_at TEXT,
        last_error_kind TEXT,
        last_error_message TEXT,
        next_attempt_after TEXT
      );

      CREATE TABLE IF NOT EXISTS __autobyteus_publication_dispatch_cursor (
        singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
        last_acked_journal_sequence INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    const journalColumns = platformDb
      .prepare(`PRAGMA table_info(__autobyteus_publication_journal)`)
      .all() as Array<{ name: string }>;
    if (!journalColumns.some((column) => column.name === "application_id")) {
      platformDb.exec(`ALTER TABLE __autobyteus_publication_journal ADD COLUMN application_id TEXT NOT NULL DEFAULT ''`);
    }

    platformDb
      .prepare(
        `INSERT OR IGNORE INTO __autobyteus_publication_dispatch_cursor (
           singleton_id,
           last_acked_journal_sequence,
           updated_at
         ) VALUES (1, 0, ?)`,
      )
      .run(new Date().toISOString());
    platformDb
      .prepare(
        `INSERT OR IGNORE INTO __autobyteus_storage_meta (meta_key, meta_value, updated_at)
         VALUES ('schema_version', '1', ?)`,
      )
      .run(new Date().toISOString());
  }
}

let cachedApplicationStorageLifecycleService: ApplicationStorageLifecycleService | null = null;

export const getApplicationStorageLifecycleService = (): ApplicationStorageLifecycleService => {
  if (!cachedApplicationStorageLifecycleService) {
    cachedApplicationStorageLifecycleService = ApplicationStorageLifecycleService.getInstance();
  }
  return cachedApplicationStorageLifecycleService;
};
