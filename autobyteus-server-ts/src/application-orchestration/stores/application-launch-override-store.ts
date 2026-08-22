import type { DatabaseSync } from "node:sqlite";
import type {
  ApplicationExecutionResourceRef,
  ApplicationLaunchOverride,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationPlatformStateStore } from "../../application-storage/stores/application-platform-state-store.js";

export type StoredJsonCell =
  | { state: "absent" }
  | { state: "parsed"; value: unknown }
  | { state: "malformed"; rawText: string };

export type StoredApplicationLaunchOverride = {
  slotKey: string;
  executionResourceRef: StoredJsonCell;
  launchOverride: StoredJsonCell;
  legacyLaunchDefaults: StoredJsonCell;
  updatedAt: string;
};

export type ApplicationLaunchOverrideWrite = {
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef | null;
  launchOverride: ApplicationLaunchOverride | null;
  updatedAt: string;
};

const TABLE_NAME = "__autobyteus_resource_configurations";

const hasCurrentTable = (db: DatabaseSync): boolean => Boolean(
  db.prepare(
    `SELECT 1
       FROM sqlite_master
      WHERE type = 'table'
        AND name = ?
      LIMIT 1`,
  ).get(TABLE_NAME),
);

const ensureCurrentTableForWrite = (db: DatabaseSync): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      slot_key TEXT PRIMARY KEY,
      resource_ref_json TEXT,
      launch_profile_json TEXT,
      launch_defaults_json TEXT,
      updated_at TEXT NOT NULL
    );
  `);
};

const hydrateCell = (value: unknown): StoredJsonCell => {
  if (value === null || value === undefined) return { state: "absent" };
  const rawText = String(value);
  try {
    return { state: "parsed", value: JSON.parse(rawText) as unknown };
  } catch {
    return { state: "malformed", rawText };
  }
};

const hydrateRecord = (row: Record<string, unknown>): StoredApplicationLaunchOverride => ({
  slotKey: String(row.slot_key),
  executionResourceRef: hydrateCell(row.resource_ref_json),
  launchOverride: hydrateCell(row.launch_profile_json),
  legacyLaunchDefaults: hydrateCell(row.launch_defaults_json),
  updatedAt: String(row.updated_at),
});

export class ApplicationLaunchOverrideStore {
  constructor(
    private readonly dependencies: {
      platformStateStore?: ApplicationPlatformStateStore;
    } = {},
  ) {}

  private get platformStateStore(): ApplicationPlatformStateStore {
    return this.dependencies.platformStateStore ?? new ApplicationPlatformStateStore();
  }

  async getOverride(
    applicationId: string,
    slotKey: string,
  ): Promise<StoredApplicationLaunchOverride | null> {
    const result = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
      if (!hasCurrentTable(db)) {
        return null;
      }
      const row = db.prepare(
        `SELECT slot_key, resource_ref_json, launch_profile_json, launch_defaults_json, updated_at
           FROM ${TABLE_NAME}
          WHERE slot_key = ?
          LIMIT 1`,
      ).get(slotKey.trim()) as Record<string, unknown> | undefined;
      return row ? hydrateRecord(row) : null;
    });
    return result ?? null;
  }

  async listOverrides(applicationId: string): Promise<StoredApplicationLaunchOverride[]> {
    const result = await this.platformStateStore.withExistingDatabase(applicationId, (db) => {
      if (!hasCurrentTable(db)) {
        return [];
      }
      const rows = db.prepare(
        `SELECT slot_key, resource_ref_json, launch_profile_json, launch_defaults_json, updated_at
           FROM ${TABLE_NAME}
          ORDER BY slot_key ASC`,
      ).all() as Record<string, unknown>[];
      return rows.map(hydrateRecord);
    });
    return result ?? [];
  }

  async upsertOverride(
    applicationId: string,
    input: ApplicationLaunchOverrideWrite,
  ): Promise<StoredApplicationLaunchOverride> {
    return this.platformStateStore.withTransaction(applicationId, (db) => {
      ensureCurrentTableForWrite(db);
      db.prepare(
        `INSERT INTO ${TABLE_NAME} (
           slot_key, resource_ref_json, launch_profile_json, launch_defaults_json, updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(slot_key) DO UPDATE SET
           resource_ref_json = excluded.resource_ref_json,
           launch_profile_json = excluded.launch_profile_json,
           launch_defaults_json = excluded.launch_defaults_json,
           updated_at = excluded.updated_at`,
      ).run(
        input.slotKey,
        input.executionResourceRef ? JSON.stringify(input.executionResourceRef) : null,
        input.launchOverride ? JSON.stringify(input.launchOverride) : null,
        null,
        input.updatedAt,
      );
      return {
        slotKey: input.slotKey,
        executionResourceRef: input.executionResourceRef
          ? { state: "parsed", value: structuredClone(input.executionResourceRef) }
          : { state: "absent" },
        launchOverride: input.launchOverride
          ? { state: "parsed", value: structuredClone(input.launchOverride) }
          : { state: "absent" },
        legacyLaunchDefaults: { state: "absent" },
        updatedAt: input.updatedAt,
      };
    });
  }

  async removeOverride(applicationId: string, slotKey: string): Promise<void> {
    await this.platformStateStore.withExistingTransaction(applicationId, (db) => {
      if (!hasCurrentTable(db)) {
        return;
      }
      db.prepare(`DELETE FROM ${TABLE_NAME} WHERE slot_key = ?`).run(slotKey.trim());
    });
  }
}
