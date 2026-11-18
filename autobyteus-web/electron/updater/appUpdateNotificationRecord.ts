import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { AppUpdateNotification } from '../../shared/appUpdateTypes';
import { logger } from '../logger';

const APP_UPDATE_NOTIFICATION_FILE_NAME = 'app-update-notification.json';

/** An automatic install of `version` was requested at `startedAt`; it is resolved by the next start (autobyteus-356). */
type AutomaticInstall = { version: string; startedAt: string };
/** An automatic download or install of `version` failed; an install failure blocks that version (REQ-004). */
type AutomaticFailure = { version: string; step: 'download' | 'install'; reason: string };

type ManualFailure = { version: string; reason: 'refused' | 'not-running' | 'stage-gone' };

type StoredRecord = {
  manualInstall: string | null;
  manualFailure: ManualFailure | null;
  version: string;
  fromVersion: string;
  foundAt: string;
  read: boolean;
  handledVersion: string | null;
  handledAt: string | null;
  /** Optional fields (autobyteus-356): absent or invalid reads as none. */
  automatic: AutomaticInstall | null;
  automaticFailure: AutomaticFailure | null;
  outcome: 'AUTO_UPDATED' | null;
};

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nullableNonEmpty = (value: unknown): value is string | null => value === null || nonEmpty(value);

const toAutomaticInstall = (value: unknown): AutomaticInstall | null => {
  const candidate = value as Record<string, unknown> | null;
  return candidate && typeof candidate === 'object' && nonEmpty(candidate.version) && nonEmpty(candidate.startedAt)
    ? { version: candidate.version, startedAt: candidate.startedAt } : null;
};
const toAutomaticFailure = (value: unknown): AutomaticFailure | null => {
  const candidate = value as Record<string, unknown> | null;
  return candidate && typeof candidate === 'object' && nonEmpty(candidate.version) && nonEmpty(candidate.reason)
    && (candidate.step === 'download' || candidate.step === 'install')
    ? { version: candidate.version, step: candidate.step, reason: candidate.reason } : null;
};

const toManualFailure = (value: unknown): ManualFailure | null => {
  const candidate = value as ManualFailure | null;
  return candidate && nonEmpty(candidate.version) && (candidate.reason === 'refused' || candidate.reason === 'not-running' || candidate.reason === 'stage-gone')
    ? { version: candidate.version, reason: candidate.reason } : null;
};

/** Keeps the stored object only when it has the current shape; unknown fields are dropped, invalid optional ones read as none. */
function toStoredRecord(value: unknown): StoredRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!nonEmpty(record.version) || !nonEmpty(record.fromVersion) || !nonEmpty(record.foundAt)
    || typeof record.read !== 'boolean' || !nullableNonEmpty(record.handledVersion) || !nullableNonEmpty(record.handledAt)) {
    return null;
  }
  return {
    manualInstall: nonEmpty(record.manualInstall) ? record.manualInstall : null,
    manualFailure: toManualFailure(record.manualFailure),
    version: record.version,
    fromVersion: record.fromVersion,
    foundAt: record.foundAt,
    read: record.read,
    handledVersion: record.handledVersion,
    handledAt: record.handledAt,
    automatic: toAutomaticInstall(record.automatic),
    automaticFailure: toAutomaticFailure(record.automaticFailure),
    outcome: record.outcome === 'AUTO_UPDATED' ? 'AUTO_UPDATED' : null,
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
    return this.save(this.freshRecord(version));
  }

  /** An automatic install of `version` was accepted: resolved by the next start; an earlier failure of it is cleared. */
  recordAutomaticInstall(version: string): boolean {
    return this.save({ ...this.waitingRecordOf(version), automatic: { version, startedAt: this.now().toISOString() }, automaticFailure: null, manualInstall: null, manualFailure: null });
  }

  /** Managed explicit restart: expected target, reconciled only against the next running version. */
  recordManualInstall(version: string): boolean {
    return this.save({ ...this.waitingRecordOf(version), manualInstall: version, automatic: null });
  }

  /** A confirmed refusal does not change the separate automatic retry/block evidence. */
  recordManualInstallFailure(version: string, reason: ManualFailure['reason'] = 'refused'): boolean {
    return this.save({ ...this.waitingRecordOf(version), manualInstall: null,
      manualFailure: { version, reason }, read: false });
  }

  /** Confirmed old baseline and absent receipt: drop only this attempt, never independent failure history. */
  clearLostStageAttempt(version: string): void {
    const current = this.record;
    if (!current) return;
    this.save({ ...current, automatic: current.automatic?.version === version ? null : current.automatic,
      manualInstall: current.manualInstall === version ? null : current.manualInstall });
  }

  /**
   * An automatic download or install of `version` failed (its row shows the failure; an install failure blocks it). A
   * download failure never replaces an install failure of the same version.
   */
  recordAutomaticFailure(version: string, step: AutomaticFailure['step'], reason: string): boolean {
    if (step === 'download' && this.blocksAutomatic(version)) return false;
    return this.save({ ...this.waitingRecordOf(version), automatic: null, automaticFailure: { version, step, reason } });
  }

  /** `version`'s automatic install failed before: it is not installed automatically again (REQ-004). */
  blocksAutomatic(version: string): boolean {
    return this.automaticInstallBlockedVersion === version;
  }

  get automaticInstallBlockedVersion(): string | null {
    const failure = this.record?.automaticFailure;
    return failure?.step === 'install' ? failure.version : null;
  }

  /**
   * A check found no update. A waiting record still has `fromVersion` = the running version (the
   * start handled any other), so nothing was updated: it is removed (DEC-015).
   */
  recordNotAvailable(): boolean {
    if (!this.record || this.record.handledVersion !== null) return false;
    return this.save(null);
  }

  /** Marks a waiting notification, or one the app updated automatically, as seen. */
  markRead(): boolean {
    const current = this.record;
    if (!current || current.read || (current.handledVersion !== null && current.outcome !== 'AUTO_UPDATED')) return false;
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
      ...this.outcomeOf(current),
    };
  }

  private outcomeOf(current: StoredRecord): Pick<AppUpdateNotification, 'outcome' | 'outcomeReason' | 'outcomeStep'> {
    if (current.handledVersion !== null) return { outcome: current.outcome, outcomeReason: null, outcomeStep: null };
    if (current.manualFailure?.version === current.version) return { outcome: 'MANUAL_INSTALL_FAILED', outcomeReason: current.manualFailure.reason, outcomeStep: null };
    const failure = current.automaticFailure;
    return failure?.version === current.version
      ? { outcome: 'AUTO_FAILED', outcomeReason: failure.reason, outcomeStep: failure.step } : { outcome: null, outcomeReason: null, outcomeStep: null };
  }

  /**
   * At start. An automatic install (or an install-on-quit after a failed automatic install) now runs: updated automatically. An
   * automatic install that left the app on its old version failed. Otherwise the app runs another version than when
   * the update was found, so it was updated (by a click).
   */
  private reconcileWithRunningVersion(): void {
    const current = this.record;
    if (!current || current.handledVersion !== null) return;
    if (current.manualInstall === this.runningVersion || current.manualFailure?.version === this.runningVersion) {
      this.save({ ...current, handledVersion: this.runningVersion, handledAt: this.now().toISOString(), read: false,
        manualInstall: null, manualFailure: null, automatic: null, automaticFailure: null, outcome: null });
      return;
    }
    if (current.manualInstall && current.fromVersion === this.runningVersion) {
      this.save({ ...current, manualInstall: null, manualFailure: { version: current.manualInstall, reason: 'not-running' }, read: false });
      return;
    }
    const handled = { handledVersion: this.runningVersion, handledAt: this.now().toISOString() };
    const failedInstall = current.automaticFailure?.step === 'install' ? current.automaticFailure.version : null;
    if (current.automatic?.version === this.runningVersion || failedInstall === this.runningVersion) {
      this.save({ ...current, ...handled, read: false, automatic: null, automaticFailure: null, outcome: 'AUTO_UPDATED' });
    } else if (current.automatic && current.fromVersion === this.runningVersion) {
      const version = current.automatic.version;
      this.save({ ...current, automatic: null,
        automaticFailure: { version, step: 'install', reason: `The update did not install. The app is still on ${current.fromVersion}.` } });
    } else if (current.fromVersion !== this.runningVersion) {
      this.save({ ...current, ...handled, automatic: null, manualInstall: null, manualFailure: null });
    }
  }

  private freshRecord(version: string): StoredRecord {
    return {
      version, fromVersion: this.runningVersion, foundAt: this.now().toISOString(), read: false,
      handledVersion: null, handledAt: null, automatic: null, automaticFailure: null, outcome: null, manualInstall: null, manualFailure: null,
    };
  }

  /** The waiting record of `version`: the current one, or a new one when it is missing or for another version. */
  private waitingRecordOf(version: string): StoredRecord {
    const current = this.record;
    return current && current.handledVersion === null && current.version === version ? current : this.freshRecord(version);
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
      // A managed activation follows shutdown; its file logger can already be closed.
      process.stderr.write('[updater] Failed to persist the update notification; recovery will continue.\n');
    }
    return true;
  }
}
