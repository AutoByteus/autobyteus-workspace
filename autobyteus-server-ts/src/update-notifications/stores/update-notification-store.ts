import path from "node:path";
import { readJsonArrayFile, writeJsonArrayFile } from "../../persistence/file/store-utils.js";
import {
  UPDATE_NOTIFICATION_KINDS,
  UPDATE_OUTCOMES,
  type UpdateNotificationKind,
  type UpdateNotificationRecord,
  type UpdateOutcome,
} from "../domain/update-notification.js";

const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const nullableString = (value: unknown): value is string | null => value === null || nonEmptyString(value);

/** An outcome that is absent or not one of the current ones reads as none (rows written before outcomes existed). */
const toOutcome = (value: Record<string, unknown>): Pick<UpdateNotificationRecord, "outcome" | "outcomeReason" | "outcomeAt"> =>
  UPDATE_OUTCOMES.includes(value.outcome as UpdateOutcome) && nonEmptyString(value.outcomeAt)
    ? { outcome: value.outcome as UpdateOutcome, outcomeReason: nonEmptyString(value.outcomeReason) ? value.outcomeReason : null, outcomeAt: value.outcomeAt }
    : { outcome: null, outcomeReason: null, outcomeAt: null };

/** Keeps a stored row only when it has the current shape; unknown fields are dropped. */
const toRecord = (row: unknown): UpdateNotificationRecord | null => {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (!UPDATE_NOTIFICATION_KINDS.includes(value.kind as UpdateNotificationKind)) return null;
  if (!nonEmptyString(value.sourceId) || !nonEmptyString(value.latestRevision) ||
      !nonEmptyString(value.fromRevision) || !nonEmptyString(value.foundAt) || typeof value.read !== "boolean" ||
      !nullableString(value.handledRevision) || !nullableString(value.handledAt)) {
    return null;
  }
  return {
    kind: value.kind as UpdateNotificationKind,
    sourceId: value.sourceId,
    latestRevision: value.latestRevision,
    fromRevision: value.fromRevision,
    foundAt: value.foundAt,
    read: value.read,
    handledRevision: value.handledRevision,
    handledAt: value.handledAt,
    ...toOutcome(value),
  };
};

/** `<app-data>/update-notifications/notifications.json`: tolerant read, exact write. No rules. */
export class UpdateNotificationStore {
  readonly filePath: string;

  constructor(appDataDir: string) {
    this.filePath = path.join(appDataDir, "update-notifications", "notifications.json");
  }

  /** A missing, unreadable or malformed file reads as empty; it is rewritten on the next change. */
  async read(): Promise<UpdateNotificationRecord[]> {
    let rows: unknown[];
    try {
      rows = await readJsonArrayFile<unknown>(this.filePath);
    } catch (error) {
      console.warn(`UPDATE_NOTIFICATIONS_FILE_UNREADABLE:${this.filePath}`, error);
      return [];
    }
    const records: UpdateNotificationRecord[] = [];
    for (const row of rows) {
      const record = toRecord(row);
      if (record) records.push(record);
      else console.warn(`UPDATE_NOTIFICATIONS_ROW_SKIPPED:${this.filePath}`);
    }
    return records;
  }

  async write(records: UpdateNotificationRecord[]): Promise<void> {
    await writeJsonArrayFile(this.filePath, records.map((record) => ({
      kind: record.kind,
      sourceId: record.sourceId,
      latestRevision: record.latestRevision,
      fromRevision: record.fromRevision,
      foundAt: record.foundAt,
      read: record.read,
      handledRevision: record.handledRevision,
      handledAt: record.handledAt,
      outcome: record.outcome,
      outcomeReason: record.outcomeReason,
      outcomeAt: record.outcomeAt,
    })));
  }
}
