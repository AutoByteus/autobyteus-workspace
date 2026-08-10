import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  rewriteCustomProviderModelIdentifier,
  type CustomProviderReadableIdMapping,
  type ReadableIdSelectorMigrationDetail,
} from './custom-provider-readable-id-json-selector-migrator.js';

const TABLE_NAME = '__autobyteus_resource_configurations';
type JsonRecord = Record<string, unknown>;

type ApplicationSelectorRow = {
  slotKey: string;
  launchProfileJson: string | null;
  launchDefaultsJson: string | null;
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const rewriteField = (
  record: JsonRecord,
  mappings: readonly CustomProviderReadableIdMapping[],
): number => {
  const current = record.llmModelIdentifier;
  if (current === undefined || current === null) return 0;
  if (typeof current !== 'string') {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
  }
  const next = rewriteCustomProviderModelIdentifier(current, mappings);
  if (next === current) return 0;
  record.llmModelIdentifier = next;
  return 1;
};

const rewriteLaunchProfile = (
  raw: string | null,
  mappings: readonly CustomProviderReadableIdMapping[],
): { value: string | null; count: number } => {
  if (raw === null) return { value: null, count: 0 };
  let value: unknown;
  try { value = JSON.parse(raw); } catch {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
  }
  if (!isRecord(value)) {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
  }

  let count = 0;
  if (value.kind === 'AGENT') {
    count = rewriteField(value, mappings);
  } else if (value.kind === 'AGENT_TEAM') {
    if (value.defaults !== null && value.defaults !== undefined) {
      if (!isRecord(value.defaults)) {
        throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
      }
      count += rewriteField(value.defaults, mappings);
    }
    if (!Array.isArray(value.memberProfiles)) {
      throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
    }
    for (const member of value.memberProfiles) {
      if (!isRecord(member)) {
        throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
      }
      count += rewriteField(member, mappings);
    }
  } else {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
  }
  return { value: count > 0 ? JSON.stringify(value) : raw, count };
};

const rewriteLaunchDefaults = (
  raw: string | null,
  mappings: readonly CustomProviderReadableIdMapping[],
): { value: string | null; count: number } => {
  if (raw === null) return { value: null, count: 0 };
  let value: unknown;
  try { value = JSON.parse(raw); } catch {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
  }
  if (!isRecord(value)) {
    throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_INVALID');
  }
  const count = rewriteField(value, mappings);
  return { value: count > 0 ? JSON.stringify(value) : raw, count };
};

const tableExists = (db: DatabaseSync): boolean => Boolean(db.prepare(
  `SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
).get(TABLE_NAME));

const listRows = (db: DatabaseSync): ApplicationSelectorRow[] =>
  (db.prepare(
    `SELECT slot_key, launch_profile_json, launch_defaults_json
       FROM ${TABLE_NAME}
      ORDER BY slot_key ASC`,
  ).all() as Array<Record<string, unknown>>).map((row) => ({
    slotKey: String(row.slot_key),
    launchProfileJson: row.launch_profile_json == null ? null : String(row.launch_profile_json),
    launchDefaultsJson: row.launch_defaults_json == null ? null : String(row.launch_defaults_json),
  }));

const sanitizeFailure = (error: unknown): string =>
  error instanceof Error
    && /^CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_[A-Z_]+$/.test(error.message)
    ? error.message
    : 'CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_UNAVAILABLE';

export class CustomProviderReadableIdApplicationSelectorMigrator {
  constructor(private readonly appDataDir: string) {}

  private listDatabasePaths(): string[] {
    const root = path.join(this.appDataDir, 'applications');
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    return entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .map((entry) => path.join(root, entry.name, 'db', 'platform.sqlite'))
      .filter((filePath) => {
        try { fs.lstatSync(filePath); return true; } catch (error) {
          return (error as NodeJS.ErrnoException).code !== 'ENOENT';
        }
      })
      .sort();
  }

  migrate(
    mappings: readonly CustomProviderReadableIdMapping[],
  ): ReadableIdSelectorMigrationDetail[] {
    let databasePaths: string[];
    try { databasePaths = this.listDatabasePaths(); } catch {
      return [{
        kind: 'APPLICATION_SQLITE_SELECTOR',
        filePath: path.join(this.appDataDir, 'applications'),
        status: 'FAILED',
        message: 'CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_UNAVAILABLE',
      }];
    }

    return databasePaths.map((filePath) => {
      let db: DatabaseSync | null = null;
      let transactionOpen = false;
      try {
        const stat = fs.lstatSync(filePath);
        if (!stat.isFile() || stat.isSymbolicLink()) {
          throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_UNSAFE');
        }
        if ((stat.mode & 0o222) === 0) {
          throw new Error('CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_READ_ONLY');
        }
        fs.accessSync(filePath, fs.constants.W_OK);
        fs.accessSync(path.dirname(filePath), fs.constants.W_OK);

        db = new DatabaseSync(filePath);
        if (!tableExists(db)) return {
          kind: 'APPLICATION_SQLITE_SELECTOR' as const,
          filePath,
          status: 'SKIPPED' as const,
          message: 'CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_NOT_AFFECTED',
        };
        db.exec('BEGIN IMMEDIATE');
        transactionOpen = true;
        const update = db.prepare(
          `UPDATE ${TABLE_NAME}
              SET launch_profile_json = ?, launch_defaults_json = ?
            WHERE slot_key = ?`,
        );
        let rewrittenCount = 0;
        for (const row of listRows(db)) {
          const profile = rewriteLaunchProfile(row.launchProfileJson, mappings);
          const defaults = rewriteLaunchDefaults(row.launchDefaultsJson, mappings);
          if (profile.count + defaults.count > 0) {
            update.run(profile.value, defaults.value, row.slotKey);
            rewrittenCount += profile.count + defaults.count;
          }
        }
        db.exec('COMMIT');
        transactionOpen = false;
        return {
          kind: 'APPLICATION_SQLITE_SELECTOR' as const,
          filePath,
          status: rewrittenCount > 0 ? 'MIGRATED' as const : 'SKIPPED' as const,
          message: rewrittenCount > 0
            ? `CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_REWRITTEN:${rewrittenCount}`
            : 'CUSTOM_PROVIDER_READABLE_ID_APPLICATION_SELECTOR_NOT_AFFECTED',
        };
      } catch (error) {
        if (transactionOpen && db) {
          try { db.exec('ROLLBACK'); } catch { /* preserve original failure */ }
        }
        return {
          kind: 'APPLICATION_SQLITE_SELECTOR' as const,
          filePath,
          status: 'FAILED' as const,
          message: sanitizeFailure(error),
        };
      } finally {
        try { db?.close(); } catch { /* result is already classified */ }
      }
    });
  }
}
