import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { parseExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { FileQueueStateStore } from "../queue/file-queue-state-store.js";
import type {
  OutboxStore,
  OutboundOutboxCreateInput,
  OutboundOutboxRecord,
  OutboundOutboxStatus,
  OutboundOutboxStatusUpdate,
  OutboundOutboxUpsertResult,
} from "../../domain/models/outbox-store.js";

type OutboxFileState = {
  version: 1;
  records: OutboundOutboxRecord[];
};

const DEFAULT_FILENAME = "outbound-outbox.json";

export class FileOutboxStore implements OutboxStore {
  private readonly stateStore: FileQueueStateStore<OutboxFileState>;

  constructor(rootDir: string, fileName: string = DEFAULT_FILENAME) {
    this.stateStore = new FileQueueStateStore({
      queueName: "outbound outbox",
      filePath: path.join(rootDir, fileName),
      createEmptyState,
      parseState,
    });
  }

  async upsertByDispatchKey(input: OutboundOutboxCreateInput): Promise<OutboundOutboxUpsertResult> {
    return this.stateStore.withMutation<OutboundOutboxUpsertResult>((state) => {
      const existing = state.records.find((record) => record.dispatchKey === input.dispatchKey);
      if (existing) {
        return {
          result: {
            record: existing,
            duplicate: true,
          },
          persist: false,
        };
      }

      const nowIso = toIsoTimestamp(input.createdAt ?? new Date().toISOString(), "createdAt");
      const next: OutboundOutboxRecord = {
        id: randomUUID(),
        dispatchKey: normalizeRequiredString(input.dispatchKey, "dispatchKey"),
        provider: input.payload.provider,
        transport: input.payload.transport,
        accountId: input.payload.accountId,
        peerId: input.payload.peerId,
        threadId: input.payload.threadId,
        payload: input.payload,
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: null,
        lastError: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      state.records.push(next);
      return {
        result: {
          record: next,
          duplicate: false,
        },
        persist: true,
      };
    });
  }

  async getById(recordId: string): Promise<OutboundOutboxRecord | null> {
    const state = await this.stateStore.load();
    return state.records.find((record) => record.id === recordId) ?? null;
  }

  async leasePending(limit: number, nowIso: string): Promise<OutboundOutboxRecord[]> {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
    if (normalizedLimit === 0) {
      return [];
    }

    const state = await this.stateStore.load();
    const nowEpoch = toEpochMs(nowIso, "nowIso");
    const leaseStatuses: OutboundOutboxStatus[] = ["PENDING", "FAILED_RETRY"];

    return state.records
      .filter((record) => leaseStatuses.includes(record.status))
      .filter((record) => {
        if (!record.nextAttemptAt) {
          return true;
        }
        return toEpochMs(record.nextAttemptAt, "nextAttemptAt") <= nowEpoch;
      })
      .sort((left, right) => compareTimestamps(left.createdAt, right.createdAt))
      .slice(0, normalizedLimit);
  }

  async updateStatus(
    recordId: string,
    update: OutboundOutboxStatusUpdate,
  ): Promise<OutboundOutboxRecord> {
    return this.stateStore.withMutation((state) => {
      const index = state.records.findIndex((record) => record.id === recordId);
      if (index < 0) {
        throw new Error(`Outbox record not found: ${recordId}`);
      }

      const current = state.records[index];
      const next: OutboundOutboxRecord = {
        ...current,
        status: update.status,
        attemptCount:
          update.attemptCount === undefined
            ? current.attemptCount
            : normalizeNonNegativeInteger(update.attemptCount, "attemptCount"),
        nextAttemptAt:
          update.nextAttemptAt === undefined
            ? current.nextAttemptAt
            : normalizeOptionalIso(update.nextAttemptAt, "nextAttemptAt"),
        lastError:
          update.lastError === undefined
            ? current.lastError
            : normalizeOptionalString(update.lastError),
        updatedAt: toIsoTimestamp(update.updatedAt ?? new Date().toISOString(), "updatedAt"),
      };

      state.records[index] = next;
      return {
        result: next,
        persist: true,
      };
    });
  }

  async listByStatus(statuses: OutboundOutboxStatus[]): Promise<OutboundOutboxRecord[]> {
    const filter = new Set(statuses);
    if (filter.size === 0) {
      return [];
    }
    const state = await this.stateStore.load();
    return state.records.filter((record) => filter.has(record.status));
  }
}

const createEmptyState = (): OutboxFileState => ({
  version: 1,
  records: [],
});

const parseState = (value: unknown): OutboxFileState => {
  if (!isRecord(value)) {
    throw new Error("Invalid outbound outbox state payload.");
  }

  if (value.version !== 1) {
    throw new Error("Unsupported outbound outbox file state version.");
  }

  if (!Array.isArray(value.records)) {
    throw new Error("Outbound outbox state records must be an array.");
  }

  return {
    version: 1,
    records: value.records.map((entry) => parseRecord(entry)),
  };
};

const parseRecord = (value: unknown): OutboundOutboxRecord => {
  if (!isRecord(value)) {
    throw new Error("Outbound outbox record must be an object.");
  }

  const id = normalizeRequiredString(value.id, "id");
  const dispatchKey = normalizeRequiredString(value.dispatchKey, "dispatchKey");
  const provider = parseExternalChannelProvider(value.provider);
  const transport = parseExternalChannelTransport(value.transport);
  const accountId = normalizeRequiredString(value.accountId, "accountId");
  const peerId = normalizeRequiredString(value.peerId, "peerId");
  const threadId = normalizeOptionalString(value.threadId);
  const payload = parsePayload(value.payload);
  const status = parseStatus(value.status);
  const attemptCount = normalizeNonNegativeInteger(value.attemptCount, "attemptCount");
  const nextAttemptAt = normalizeOptionalIso(value.nextAttemptAt, "nextAttemptAt");
  const lastError = normalizeOptionalString(value.lastError);
  const createdAt = toIsoTimestamp(value.createdAt, "createdAt");
  const updatedAt = toIsoTimestamp(value.updatedAt, "updatedAt");

  return {
    id,
    dispatchKey,
    provider,
    transport,
    accountId,
    peerId,
    threadId,
    payload,
    status,
    attemptCount,
    nextAttemptAt,
    lastError,
    createdAt,
    updatedAt,
  };
};

const parsePayload = (value: unknown): OutboundOutboxRecord["payload"] => {
  if (!isRecord(value)) {
    throw new Error("Outbound outbox payload must be an object.");
  }
  return value as OutboundOutboxRecord["payload"];
};

const parseStatus = (value: unknown): OutboundOutboxStatus => {
  if (
    value === "PENDING" ||
    value === "SENDING" ||
    value === "SENT" ||
    value === "FAILED_RETRY" ||
    value === "DEAD_LETTER"
  ) {
    return value;
  }
  throw new Error(`Unsupported outbound outbox status: ${String(value)}`);
};

const compareTimestamps = (left: string, right: string): number =>
  toEpochMs(left, "timestamp") - toEpochMs(right, "timestamp");

const toEpochMs = (value: unknown, key: string): number => {
  const normalized = toIsoTimestamp(value, key);
  return Date.parse(normalized);
};

const toIsoTimestamp = (value: unknown, key: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${key} must be an ISO timestamp string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${key} must be a non-empty ISO timestamp string.`);
  }
  const epoch = Date.parse(trimmed);
  if (!Number.isFinite(epoch)) {
    throw new Error(`${key} must be a valid ISO timestamp.`);
  }
  return new Date(epoch).toISOString();
};

const normalizeRequiredString = (value: unknown, key: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeOptionalIso = (value: unknown, key: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return toIsoTimestamp(value, key);
};

const normalizeNonNegativeInteger = (value: unknown, key: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer.`);
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
