import type { DatabaseSync } from "node:sqlite";
import type {
  ApplicationConfiguredLaunchProfile,
  ApplicationRuntimeResourceRef,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";

export type LegacyApplicationConfiguredLaunchDefaults = {
  llmModelIdentifier?: string | null;
  runtimeKind?: string | null;
  workspaceRootPath?: string | null;
  autoExecuteTools?: boolean | null;
};

export type ApplicationPersistedResourceConfiguration = {
  slotKey: string;
  resourceRef: ApplicationRuntimeResourceRef | null;
  launchProfile: ApplicationConfiguredLaunchProfile | null;
  legacyLaunchDefaults: LegacyApplicationConfiguredLaunchDefaults | null;
  updatedAt: string;
};

const TABLE_NAME = "__autobyteus_resource_configurations";

const hasColumn = (db: DatabaseSync, columnName: string): boolean => {
  const rows = db.prepare(`PRAGMA table_info(${TABLE_NAME})`).all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === columnName);
};

const ensureTables = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      slot_key TEXT PRIMARY KEY,
      resource_ref_json TEXT,
      launch_profile_json TEXT,
      launch_defaults_json TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  if (!hasColumn(db, "launch_profile_json")) {
    db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN launch_profile_json TEXT`);
  }
  if (!hasColumn(db, "launch_defaults_json")) {
    db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN launch_defaults_json TEXT`);
  }
};

const hydrateRecord = (row: Record<string, unknown>): ApplicationPersistedResourceConfiguration => ({
  slotKey: String(row.slot_key),
  resourceRef: row.resource_ref_json
    ? JSON.parse(String(row.resource_ref_json)) as ApplicationRuntimeResourceRef
    : null,
  launchProfile: row.launch_profile_json
    ? JSON.parse(String(row.launch_profile_json)) as ApplicationConfiguredLaunchProfile
    : null,
  legacyLaunchDefaults: row.launch_defaults_json
    ? JSON.parse(String(row.launch_defaults_json)) as LegacyApplicationConfiguredLaunchDefaults
    : null,
  updatedAt: String(row.updated_at),
});

export class ApplicationResourceConfigurationStore {
  constructor(
    private readonly dependencies: {
      platformStateStore?: ApplicationPlatformStateStore;
    } = {},
  ) {}

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  async getConfiguration(
    applicationId: string,
    slotKey: string,
  ): Promise<ApplicationPersistedResourceConfiguration | null> {
    return this.platformStateStore.withDatabase(applicationId, (db) => {
      ensureTables(db);
      const row = db.prepare(
        `SELECT slot_key, resource_ref_json, launch_profile_json, launch_defaults_json, updated_at
           FROM ${TABLE_NAME}
          WHERE slot_key = ?
          LIMIT 1`,
      ).get(slotKey.trim()) as Record<string, unknown> | undefined;
      return row ? hydrateRecord(row) : null;
    });
  }

  async listConfigurations(applicationId: string): Promise<ApplicationPersistedResourceConfiguration[]> {
    return this.platformStateStore.withDatabase(applicationId, (db) => {
      ensureTables(db);
      const rows = db.prepare(
        `SELECT slot_key, resource_ref_json, launch_profile_json, launch_defaults_json, updated_at
           FROM ${TABLE_NAME}
          ORDER BY slot_key ASC`,
      ).all() as Record<string, unknown>[];
      return rows.map((row) => hydrateRecord(row));
    });
  }

  async upsertConfiguration(
    applicationId: string,
    input: ApplicationPersistedResourceConfiguration,
  ): Promise<ApplicationPersistedResourceConfiguration> {
    return this.platformStateStore.withTransaction(applicationId, (db) => {
      ensureTables(db);
      db.prepare(
        `INSERT INTO ${TABLE_NAME} (
           slot_key,
           resource_ref_json,
           launch_profile_json,
           launch_defaults_json,
           updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(slot_key) DO UPDATE SET
           resource_ref_json = excluded.resource_ref_json,
           launch_profile_json = excluded.launch_profile_json,
           launch_defaults_json = excluded.launch_defaults_json,
           updated_at = excluded.updated_at`,
      ).run(
        input.slotKey,
        input.resourceRef ? JSON.stringify(input.resourceRef) : null,
        input.launchProfile ? JSON.stringify(input.launchProfile) : null,
        input.legacyLaunchDefaults ? JSON.stringify(input.legacyLaunchDefaults) : null,
        input.updatedAt,
      );
      return structuredClone(input);
    });
  }

  async removeConfiguration(applicationId: string, slotKey: string): Promise<void> {
    await this.platformStateStore.withTransaction(applicationId, (db) => {
      ensureTables(db);
      db.prepare(`DELETE FROM ${TABLE_NAME} WHERE slot_key = ?`).run(slotKey.trim());
    });
  }
}
