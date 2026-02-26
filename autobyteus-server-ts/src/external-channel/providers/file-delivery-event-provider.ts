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
import {
  nextNumericStringId,
  normalizeNullableString,
  normalizeRequiredString,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type ChannelDeliveryEventRow = {
  id: string;
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  correlationMessageId: string | null;
  callbackIdempotencyKey: string;
  status: ChannelDeliveryStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const deliveryFilePath = resolvePersistencePath("external-channel", "delivery-events.json");

const toThreadStorage = (threadId: string | null): string => normalizeNullableString(threadId) ?? "";
const fromThreadStorage = (threadId: string): string | null => normalizeNullableString(threadId);

const parseStatus = (value: string): ChannelDeliveryStatus => {
  if (value === "PENDING" || value === "SENT" || value === "DELIVERED" || value === "FAILED") {
    return value;
  }
  throw new Error(`Unsupported channel delivery status stored in file: ${value}`);
};

const toDomain = (row: ChannelDeliveryEventRow): ChannelDeliveryEvent => ({
  id: row.id,
  provider: parseExternalChannelProvider(row.provider),
  transport: parseExternalChannelTransport(row.transport),
  accountId: row.accountId,
  peerId: row.peerId,
  threadId: fromThreadStorage(row.threadId),
  correlationMessageId: row.correlationMessageId,
  callbackIdempotencyKey: row.callbackIdempotencyKey,
  status: parseStatus(row.status),
  errorMessage: row.errorMessage,
  metadata: row.metadata,
  createdAt: parseDate(row.createdAt),
  updatedAt: parseDate(row.updatedAt),
});

export class FileDeliveryEventProvider implements DeliveryEventProvider {
  async upsertByCallbackKey(
    input: UpsertChannelDeliveryEventInput,
  ): Promise<ChannelDeliveryEvent> {
    const callbackIdempotencyKey = normalizeRequiredString(
      input.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );

    const now = new Date().toISOString();
    let saved: ChannelDeliveryEventRow | null = null;

    await updateJsonArrayFile<ChannelDeliveryEventRow>(deliveryFilePath, (rows) => {
      const index = rows.findIndex((row) => row.callbackIdempotencyKey === callbackIdempotencyKey);
      if (index >= 0) {
        const current = rows[index] as ChannelDeliveryEventRow;
        const savedRecord: ChannelDeliveryEventRow = {
          ...current,
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          correlationMessageId: normalizeNullableString(input.correlationMessageId ?? null),
          status: input.status,
          errorMessage: normalizeNullableString(input.errorMessage ?? null),
          metadata: input.metadata ?? {},
          updatedAt: now,
        };
        const next = [...rows];
        saved = savedRecord;
        next[index] = savedRecord;
        return next;
      }

      const savedRecord: ChannelDeliveryEventRow = {
        id: nextNumericStringId(rows),
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        correlationMessageId: normalizeNullableString(input.correlationMessageId ?? null),
        callbackIdempotencyKey,
        status: input.status,
        errorMessage: normalizeNullableString(input.errorMessage ?? null),
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      saved = savedRecord;
      return [...rows, savedRecord];
    });

    if (!saved) {
      throw new Error("Failed to upsert channel delivery event.");
    }
    return toDomain(saved);
  }

  async findByCallbackKey(callbackIdempotencyKey: string): Promise<ChannelDeliveryEvent | null> {
    const key = normalizeRequiredString(callbackIdempotencyKey, "callbackIdempotencyKey");
    const rows = await readJsonArrayFile<ChannelDeliveryEventRow>(deliveryFilePath);
    const found = rows.find((row) => row.callbackIdempotencyKey === key);
    return found ? toDomain(found) : null;
  }
}

export type { ExternalChannelProvider, ExternalChannelTransport };
