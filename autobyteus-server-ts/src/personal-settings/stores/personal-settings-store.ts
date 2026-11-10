import fs from "node:fs";
import path from "node:path";
import { writeAtomicJsonSync } from "../../persistence/file/atomic-json-sync.js";
import {
  parsePersonalSettingKey,
  readPersonalSettingRecord,
  type PersonalSettingRecord,
} from "../domain/personal-setting-record.js";

type Loaded = {
  /** The file's object as read; every write starts from it, so entries this version skips are kept. */
  raw: Record<string, unknown>;
  /** The file exists but is not a JSON object: it is copied aside before its first rewrite. */
  unreadable: boolean;
  records: Map<string, PersonalSettingRecord>;
};

/** `20261107T093000Z`, for file names. */
export const compactUtcTime = (date: Date): string => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/**
 * The personal settings file (contract §2, §4): a tolerant read, kept in memory after the first
 * read, and an exact atomic write. Reading never rewrites the file. Writes are synchronous, so one
 * change completes before the next starts; this store is the file's only writer.
 */
export class PersonalSettingsStore {
  private loaded: Loaded | null = null;

  constructor(
    private readonly resolveFilePath: () => string,
    private readonly logger: Pick<Console, "warn"> = console,
  ) {}

  get filePath(): string {
    return this.resolveFilePath();
  }

  /** The valid records by key (`<kind>:<definitionId>`). */
  records(): ReadonlyMap<string, PersonalSettingRecord> {
    return this.load().records;
  }

  get(key: string): PersonalSettingRecord | null {
    return this.load().records.get(key) ?? null;
  }

  /** Sets (a record) or removes (null) the given keys and writes the file once. */
  write(changes: ReadonlyMap<string, PersonalSettingRecord | null>): void {
    const current = this.load();
    const filePath = this.filePath;
    if (current.unreadable) {
      // The user's data is never deleted: the unreadable file is kept next to the new one.
      fs.copyFileSync(filePath, `${filePath}.unreadable-${compactUtcTime(new Date())}`);
    }
    const raw: Record<string, unknown> = current.unreadable ? {} : { ...current.raw };
    for (const [key, record] of changes) {
      if (record) raw[key] = record;
      else delete raw[key];
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    writeAtomicJsonSync(filePath, raw);
    const records = new Map(current.unreadable ? [] : current.records);
    for (const [key, record] of changes) {
      if (record) records.set(key, record);
      else records.delete(key);
    }
    this.loaded = { raw, unreadable: false, records };
  }

  private load(): Loaded {
    if (this.loaded) return this.loaded;
    const filePath = this.filePath;
    let text: string;
    try {
      text = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.loaded = { raw: {}, unreadable: false, records: new Map() };
      return this.loaded;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      raw = undefined;
      this.logger.warn(`PERSONAL_SETTINGS_FILE_UNREADABLE:${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      if (raw !== undefined) this.logger.warn(`PERSONAL_SETTINGS_FILE_UNREADABLE:${filePath}: not a JSON object`);
      this.loaded = { raw: {}, unreadable: true, records: new Map() };
      return this.loaded;
    }
    const records = new Map<string, PersonalSettingRecord>();
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const parsed = parsePersonalSettingKey(key);
      const read = parsed ? readPersonalSettingRecord(parsed.kind, value) : { record: null, skipped: ["<key>"] };
      if (read.skipped.length > 0) this.logger.warn(`PERSONAL_SETTINGS_ENTRY_SKIPPED:${key}: ${read.skipped.join(", ")}`);
      if (read.record) records.set(key, read.record);
    }
    this.loaded = { raw: raw as Record<string, unknown>, unreadable: false, records };
    return this.loaded;
  }
}
