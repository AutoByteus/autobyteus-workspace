import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { AppUpdateNotification } from '../../shared/appUpdateTypes';
import { logger } from '../logger';

const APP_UPDATE_NOTIFICATION_FILE_NAME = 'app-update-notification.json';

type StoredRecord = {
  version: string;
  fromVersion: string;
  foundAt: string;
  read: boolean;
  handledVersion: string | null;
  handledAt: string | null;
};

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nullableNonEmpty = (value: unknown): value is string | null => value === null || nonEmpty(value);

/** Keeps the stored object only when it has the current shape; unknown fields are dropped. */
function toStoredRecord(value: unknown): StoredRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!nonEmpty(record.version) || !nonEmpty(record.fromVersion) || !nonEmpty(record.foundAt)
    || typeof record.read !== 'boolean' || !nullableNonEmpty(record.handledVersion) || !nullableNonEmpty(record.handledAt)) {
    return null;
  }
  return {
    version: record.version,
    fromVersion: record.fromVersion,
    foundAt: record.foundAt,
    read: record.read,
    handledVersion: record.handledVersion,
    handledAt: record.handledAt,
  };
}

/**
 * The app's update notification and its rules (the node's DS-007 rules, with versions), kept in
 * `<userData>/app-update-notification.json`: tolerant read, exact atomic write. A missing or
 * unreadable file means no notification; the next check finds the update again.
 */
export class AppUpdateNotificationRecord {
  private record: StoredRecord | null;

  constructor(
    private readonly userDataPath: string,
    private readonly runningVersion: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.record = this.load();
    this.reconcileWithRunningVersion();
  }

  /** A check found `version`: create the waiting notification, or replace it with a newer version. */
  recordFound(version: string): boolean {
    if (version === this.runningVersion) return false;
    const current = this.record;
    if (current && current.handledVersion === null && current.version === version) return false;
    return this.save({
      version, fromVersion: this.runningVersion, foundAt: this.now().toISOString(), read: false,
      handledVersion: null, handledAt: null,
    });
  }

  /**
   * A check found no update. A waiting record still has `fromVersion` = the running version (the
   * start handled any other), so nothing was updated: it is removed (DEC-015).
   */
  recordNotAvailable(): boolean {
    if (!this.record || this.record.handledVersion !== null) return false;
    return this.save(null);
  }

  markRead(): boolean {
    const current = this.record;
    if (!current || current.handledVersion !== null || current.read) return false;
    return this.save({ ...current, read: true });
  }

  /** Removes a handled notification; a waiting one goes only by an update or a newer version. */
  clear(): boolean {
    if (!this.record || this.record.handledVersion === null) return false;
    return this.save(null);
  }

  toNotification(releasePageUrl: (version: string) => string | null): AppUpdateNotification | null {
    const current = this.record;
    if (!current) return null;
    return {
      version: current.version,
      fromVersion: current.fromVersion,
      foundAt: current.foundAt,
      read: current.read,
      state: current.handledVersion === null ? 'waiting' : 'handled',
      handledVersion: current.handledVersion,
      releasePageUrl: releasePageUrl(current.version),
    };
  }

  /** At start: the app now runs another version than when the update was found, so it was updated. */
  private reconcileWithRunningVersion(): void {
    const current = this.record;
    if (current && current.handledVersion === null && current.fromVersion !== this.runningVersion) {
      this.save({ ...current, handledVersion: this.runningVersion, handledAt: this.now().toISOString() });
    }
  }

  private get filePath(): string {
    return path.join(this.userDataPath, APP_UPDATE_NOTIFICATION_FILE_NAME);
  }

  private load(): StoredRecord | null {
    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('[updater] The app update notification file is unreadable; starting without it.', error);
      }
      return null;
    }
    try {
      const record = toStoredRecord(JSON.parse(raw));
      if (!record) logger.warn('[updater] The app update notification file has an unknown shape; starting without it.');
      return record;
    } catch (error) {
      logger.warn('[updater] The app update notification file is not valid JSON; starting without it.', error);
      return null;
    }
  }

  /** Applies the change in memory and writes it; a failed write is logged and the change still applies. */
  private save(next: StoredRecord | null): boolean {
    this.record = next;
    try {
      if (next === null) {
        fs.rmSync(this.filePath, { force: true });
      } else {
        const temporary = `${this.filePath}.${randomUUID()}.tmp`;
        fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
        fs.renameSync(temporary, this.filePath);
      }
    } catch (error) {
      logger.error('[updater] Failed to save the app update notification.', error);
    }
    return true;
  }
}
