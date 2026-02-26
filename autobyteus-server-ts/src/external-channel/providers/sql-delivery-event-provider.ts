import { Prisma } from "@prisma/client";
import { BaseRepository } from "repository_prisma";
import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelDeliveryEvent,
  ChannelDeliveryStatus,
  UpsertChannelDeliveryEventInput,
} from "../domain/models.js";
import type { DeliveryEventProvider } from "./delivery-event-provider.js";

class SqlChannelDeliveryEventRepository extends BaseRepository.forModel(
  Prisma.ModelName.ChannelDeliveryEvent,
) {}

export class SqlDeliveryEventProvider implements DeliveryEventProvider {
  private readonly repository = new SqlChannelDeliveryEventRepository();

  async upsertByCallbackKey(
    input: UpsertChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    const callbackIdempotencyKey = normalizeRequiredString(
      input.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );
    const saved = await this.repository.upsert({
      where: {
        callbackIdempotencyKey,
      },
      create: {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        correlationMessageId:
          normalizeNullableString(input.correlationMessageId ?? null) ?? undefined,
        callbackIdempotencyKey,
        status: input.status,
        errorMessage: normalizeNullableString(input.errorMessage ?? null) ?? undefined,
        metadataJson: serializeMetadata(input.metadata),
      },
      update: {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        correlationMessageId: normalizeNullableString(
          input.correlationMessageId ?? null,
        ),
        status: input.status,
        errorMessage: normalizeNullableString(input.errorMessage ?? null),
        metadataJson: serializeMetadata(input.metadata),
      },
    });
    return toDomain(saved);
  }

  async findByCallbackKey(
    callbackIdempotencyKey: string,
  ): Promise<ChannelDeliveryEvent | null> {
    const key = normalizeRequiredString(
      callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );
    const found = await this.repository.findUnique({
      where: { callbackIdempotencyKey: key },
    });

    return found ? toDomain(found) : null;
  }
}

const toThreadStorage = (threadId: string | null): string =>
  normalizeNullableString(threadId) ?? "";

const fromThreadStorage = (threadId: string): string | null => {
  const normalized = threadId.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const serializeMetadata = (
  metadata: Record<string, unknown> | undefined,
): string => JSON.stringify(metadata ?? {});

const parseMetadata = (value: string | null): Record<string, unknown> => {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const toDomain = (value: {
  id: number;
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  correlationMessageId: string | null;
  callbackIdempotencyKey: string;
  status: string;
  errorMessage: string | null;
  metadataJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ChannelDeliveryEvent => ({
  id: value.id.toString(),
  provider: parseProvider(value.provider),
  transport: parseTransport(value.transport),
  accountId: value.accountId,
  peerId: value.peerId,
  threadId: fromThreadStorage(value.threadId),
  correlationMessageId: value.correlationMessageId,
  callbackIdempotencyKey: value.callbackIdempotencyKey,
  status: parseStatus(value.status),
  errorMessage: value.errorMessage,
  metadata: parseMetadata(value.metadataJson),
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

const parseProvider = (value: string): ExternalChannelProvider =>
  parseExternalChannelProvider(value);

const parseTransport = (value: string): ExternalChannelTransport =>
  parseExternalChannelTransport(value);

const parseStatus = (value: string): ChannelDeliveryStatus => {
  if (
    value === "PENDING" ||
    value === "SENT" ||
    value === "DELIVERED" ||
    value === "FAILED"
  ) {
    return value;
  }
  throw new Error(`Unsupported channel delivery status stored in DB: ${value}`);
};

