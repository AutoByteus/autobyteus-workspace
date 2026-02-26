import { Prisma } from "@prisma/client";
import { BaseRepository } from "repository_prisma";
import type {
  ChannelIdempotencyProvider,
  ChannelIdempotencyRecord,
  ChannelIdempotencyReservationResult,
} from "./channel-idempotency-provider.js";

class SqlChannelCallbackIdempotencyRepository extends BaseRepository.forModel(
  Prisma.ModelName.ChannelCallbackIdempotencyKey,
) {}

export class SqlChannelCallbackIdempotencyProvider
  implements ChannelIdempotencyProvider
{
  private readonly repository = new SqlChannelCallbackIdempotencyRepository();

  async reserveKey(
    key: string,
    ttlSeconds: number,
  ): Promise<ChannelIdempotencyReservationResult> {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      throw new Error("Callback idempotency key must be a non-empty string.");
    }
    if (!Number.isFinite(ttlSeconds) || ttlSeconds < 0) {
      throw new Error(`ttlSeconds must be a finite number >= 0. Received: ${ttlSeconds}`);
    }

    const now = new Date();
    const expiresAt = computeExpiry(now, ttlSeconds);

    try {
      const created = await this.repository.create({
        data: {
          key: normalizedKey,
          expiresAt: expiresAt ?? undefined,
        },
      });
      return {
        firstSeen: true,
        record: toRecord(created),
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const existing = await this.repository.findUnique({
      where: { key: normalizedKey },
    });
    if (!existing) {
      return { firstSeen: false, record: null };
    }

    if (existing.expiresAt && existing.expiresAt.getTime() <= now.getTime()) {
      const refreshed = await this.repository.update({
        where: { key: normalizedKey },
        data: {
          firstSeenAt: now,
          expiresAt: expiresAt ?? undefined,
        },
      });
      return {
        firstSeen: true,
        record: toRecord(refreshed),
      };
    }

    return {
      firstSeen: false,
      record: toRecord(existing),
    };
  }
}

const computeExpiry = (now: Date, ttlSeconds: number): Date | null => {
  if (ttlSeconds <= 0) {
    return null;
  }
  return new Date(now.getTime() + ttlSeconds * 1000);
};

const toRecord = (value: {
  key: string;
  firstSeenAt: Date;
  expiresAt: Date | null;
}): ChannelIdempotencyRecord => ({
  key: value.key,
  firstSeenAt: value.firstSeenAt,
  expiresAt: value.expiresAt,
});

const isUniqueConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "P2002";
};
