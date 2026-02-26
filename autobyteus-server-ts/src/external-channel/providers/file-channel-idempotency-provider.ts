import type {
  ChannelIdempotencyProvider,
  ChannelIdempotencyRecord,
  ChannelIdempotencyReservationResult,
} from "./channel-idempotency-provider.js";
import {
  normalizeRequiredString,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type ChannelIdempotencyRow = {
  key: string;
  firstSeenAt: string;
  expiresAt: string | null;
};

const computeExpiry = (now: Date, ttlSeconds: number): Date | null => {
  if (ttlSeconds <= 0) {
    return null;
  }
  return new Date(now.getTime() + ttlSeconds * 1000);
};

const toRecord = (row: ChannelIdempotencyRow): ChannelIdempotencyRecord => ({
  key: row.key,
  firstSeenAt: parseDate(row.firstSeenAt),
  expiresAt: row.expiresAt ? parseDate(row.expiresAt) : null,
});

export class FileChannelIdempotencyProvider implements ChannelIdempotencyProvider {
  constructor(private readonly filePath: string = resolvePersistencePath("external-channel", "ingress-idempotency.json")) {}

  async reserveKey(
    key: string,
    ttlSeconds: number,
  ): Promise<ChannelIdempotencyReservationResult> {
    const normalizedKey = normalizeRequiredString(key, "key");
    if (!Number.isFinite(ttlSeconds) || ttlSeconds < 0) {
      throw new Error(`ttlSeconds must be a finite number >= 0. Received: ${ttlSeconds}`);
    }

    const now = new Date();
    const expiresAt = computeExpiry(now, ttlSeconds);
    let result: ChannelIdempotencyReservationResult = {
      firstSeen: false,
      record: null,
    };

    await updateJsonArrayFile<ChannelIdempotencyRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => row.key === normalizedKey);
      if (index < 0) {
        const created: ChannelIdempotencyRow = {
          key: normalizedKey,
          firstSeenAt: now.toISOString(),
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
        };
        result = { firstSeen: true, record: toRecord(created) };
        return [...rows, created];
      }

      const existing = rows[index] as ChannelIdempotencyRow;
      const existingExpiry = existing.expiresAt ? parseDate(existing.expiresAt) : null;
      if (existingExpiry && existingExpiry.getTime() <= now.getTime()) {
        const refreshed: ChannelIdempotencyRow = {
          ...existing,
          firstSeenAt: now.toISOString(),
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
        };
        const next = [...rows];
        next[index] = refreshed;
        result = { firstSeen: true, record: toRecord(refreshed) };
        return next;
      }

      result = { firstSeen: false, record: toRecord(existing) };
      return rows;
    });

    return result;
  }
}
