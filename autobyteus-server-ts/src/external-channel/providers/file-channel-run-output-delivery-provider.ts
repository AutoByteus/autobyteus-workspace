import type {
  ChannelRunOutputDeliveryRecord,
  ChannelRunOutputDeliveryStatus,
  ChannelRunOutputObservedTurnInput,
  ChannelRunOutputPublishedInput,
  ChannelRunOutputPublishPendingInput,
  ChannelRunOutputReplyFinalizedInput,
  ChannelRunOutputTerminalInput,
} from "../domain/models.js";
import type { ChannelRunOutputDeliveryProvider } from "./channel-run-output-delivery-provider.js";
import {
  normalizeNullableString,
  normalizeRequiredString,
  readJsonArrayFile,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";
import { resolveExternalChannelStoragePath } from "./external-channel-storage.js";
import {
  type ChannelRunOutputDeliveryRow,
  routeToRow,
  sortByUpdatedDesc,
  targetToRow,
  toRecord,
} from "./file-channel-run-output-delivery-row.js";

export class FileChannelRunOutputDeliveryProvider
  implements ChannelRunOutputDeliveryProvider
{
  constructor(
    private readonly filePath: string = resolveExternalChannelStoragePath(
      "run-output-deliveries.json",
    ),
  ) {}

  async getByDeliveryKey(
    deliveryKey: string,
  ): Promise<ChannelRunOutputDeliveryRecord | null> {
    const normalizedKey = normalizeRequiredString(deliveryKey, "deliveryKey");
    const rows = await readJsonArrayFile<ChannelRunOutputDeliveryRow>(this.filePath);
    const found = rows.find((row) => row.deliveryKey === normalizedKey);
    return found ? toRecord(found) : null;
  }

  async upsertObservedTurn(
    input: ChannelRunOutputObservedTurnInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    const now = new Date().toISOString();
    const observedAt = input.observedAt.toISOString();
    let result: ChannelRunOutputDeliveryRow | null = null;

    await updateJsonArrayFile<ChannelRunOutputDeliveryRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => row.deliveryKey === input.deliveryKey);
      if (index >= 0) {
        const next = [...rows];
        const current = next[index] as ChannelRunOutputDeliveryRow;
        next[index] = {
          ...current,
          correlationMessageId:
            normalizeNullableString(input.correlationMessageId) ?? current.correlationMessageId,
          observedAt: current.observedAt ?? observedAt,
          updatedAt: now,
        };
        result = next[index] as ChannelRunOutputDeliveryRow;
        return next;
      }

      const created: ChannelRunOutputDeliveryRow = {
        deliveryKey: input.deliveryKey,
        bindingId: input.bindingId,
        ...routeToRow(input.route),
        target: targetToRow(input.target),
        turnId: input.turnId,
        correlationMessageId: normalizeNullableString(input.correlationMessageId),
        callbackIdempotencyKey: null,
        status: "OBSERVING",
        replyTextFinal: null,
        lastError: null,
        observedAt,
        finalizedAt: null,
        publishRequestedAt: null,
        publishedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      result = created;
      return [...rows, created];
    });

    if (!result) {
      throw new Error("Failed to upsert channel run output delivery record.");
    }
    return toRecord(result);
  }

  async markReplyFinalized(
    input: ChannelRunOutputReplyFinalizedInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return this.updateExisting(input.deliveryKey, (current) => ({
      ...current,
      status: current.status === "PUBLISHED" ? current.status : "REPLY_FINALIZED",
      replyTextFinal: input.replyTextFinal,
      finalizedAt: input.finalizedAt.toISOString(),
      lastError: null,
      updatedAt: input.finalizedAt.toISOString(),
    }));
  }

  async markPublishPending(
    input: ChannelRunOutputPublishPendingInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return this.updateExisting(input.deliveryKey, (current) => ({
      ...current,
      status: current.status === "PUBLISHED" ? current.status : "PUBLISH_PENDING",
      callbackIdempotencyKey: input.callbackIdempotencyKey,
      publishRequestedAt: input.publishRequestedAt.toISOString(),
      lastError: null,
      updatedAt: input.publishRequestedAt.toISOString(),
    }));
  }

  async markPublished(
    input: ChannelRunOutputPublishedInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return this.updateExisting(input.deliveryKey, (current) => ({
      ...current,
      status: "PUBLISHED",
      publishedAt: input.publishedAt.toISOString(),
      lastError: null,
      updatedAt: input.publishedAt.toISOString(),
    }));
  }

  async markTerminal(
    input: ChannelRunOutputTerminalInput,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    return this.updateExisting(input.deliveryKey, (current) => ({
      ...current,
      status: input.status,
      lastError: normalizeNullableString(input.lastError),
      updatedAt: input.updatedAt.toISOString(),
    }));
  }

  async listByStatuses(
    statuses: ChannelRunOutputDeliveryStatus[],
  ): Promise<ChannelRunOutputDeliveryRecord[]> {
    const allowed = new Set(statuses);
    const rows = await readJsonArrayFile<ChannelRunOutputDeliveryRow>(this.filePath);
    return sortByUpdatedDesc(rows)
      .filter((row) => allowed.has(row.status))
      .map((row) => toRecord(row));
  }

  async listByBindingId(bindingId: string): Promise<ChannelRunOutputDeliveryRecord[]> {
    const normalizedBindingId = normalizeRequiredString(bindingId, "bindingId");
    const rows = await readJsonArrayFile<ChannelRunOutputDeliveryRow>(this.filePath);
    return sortByUpdatedDesc(rows)
      .filter((row) => row.bindingId === normalizedBindingId)
      .map((row) => toRecord(row));
  }

  private async updateExisting(
    deliveryKey: string,
    apply: (current: ChannelRunOutputDeliveryRow) => ChannelRunOutputDeliveryRow,
  ): Promise<ChannelRunOutputDeliveryRecord> {
    const normalizedKey = normalizeRequiredString(deliveryKey, "deliveryKey");
    let result: ChannelRunOutputDeliveryRow | null = null;
    await updateJsonArrayFile<ChannelRunOutputDeliveryRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => row.deliveryKey === normalizedKey);
      if (index < 0) {
        throw new Error(`Channel run output delivery '${normalizedKey}' was not found.`);
      }
      const next = [...rows];
      next[index] = apply(next[index] as ChannelRunOutputDeliveryRow);
      result = next[index] as ChannelRunOutputDeliveryRow;
      return next;
    });

    if (!result) {
      throw new Error(`Failed to update channel run output delivery '${normalizedKey}'.`);
    }
    return toRecord(result);
  }
}
