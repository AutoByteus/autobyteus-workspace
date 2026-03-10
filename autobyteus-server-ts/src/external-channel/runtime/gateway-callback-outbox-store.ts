import { randomUUID } from "node:crypto";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import {
  readJsonFile,
  resolvePersistencePath,
  updateJsonFile,
} from "../../persistence/file/store-utils.js";

export type GatewayCallbackOutboxStatus =
  | "PENDING"
  | "DISPATCHING"
  | "FAILED_RETRY"
  | "SENT"
  | "DEAD_LETTER";

export type GatewayCallbackOutboxRecord = {
  id: string;
  callbackIdempotencyKey: string;
  payload: ExternalOutboundEnvelope;
  status: GatewayCallbackOutboxStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  leaseToken: string | null;
  leaseExpiresAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GatewayCallbackOutboxEnqueueResult = {
  record: GatewayCallbackOutboxRecord;
  duplicate: boolean;
};

type GatewayCallbackOutboxState = {
  version: 1;
  records: GatewayCallbackOutboxRecord[];
};

const EMPTY_STATE: GatewayCallbackOutboxState = {
  version: 1,
  records: [],
};

export class FileGatewayCallbackOutboxStore {
  constructor(
    private readonly filePath: string = resolvePersistencePath(
      "external-channel",
      "gateway-callback-outbox.json",
    ),
  ) {}

  async enqueueOrGet(input: {
    callbackIdempotencyKey: string;
    payload: ExternalOutboundEnvelope;
    createdAt?: string;
  }): Promise<GatewayCallbackOutboxEnqueueResult> {
    const createdAt = toIsoTimestamp(
      input.createdAt ?? new Date().toISOString(),
      "createdAt",
    );
    const callbackIdempotencyKey = normalizeRequiredString(
      input.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    );

    let result: GatewayCallbackOutboxEnqueueResult | null = null;
    await updateJsonFile(this.filePath, EMPTY_STATE, (current) => {
      const state = parseState(current);
      const existing = state.records.find(
        (record) => record.callbackIdempotencyKey === callbackIdempotencyKey,
      );
      if (existing) {
        result = {
          record: existing,
          duplicate: true,
        };
        return state;
      }

      const next: GatewayCallbackOutboxRecord = {
        id: randomUUID(),
        callbackIdempotencyKey,
        payload: input.payload,
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: null,
        leaseToken: null,
        leaseExpiresAt: null,
        lastError: null,
        createdAt,
        updatedAt: createdAt,
      };
      state.records.push(next);
      result = {
        record: next,
        duplicate: false,
      };
      return state;
    });

    if (!result) {
      throw new Error("Failed to enqueue gateway callback outbox record.");
    }
    return result;
  }

  async leaseBatch(input: {
    limit: number;
    nowIso: string;
    leaseDurationMs: number;
  }): Promise<GatewayCallbackOutboxRecord[]> {
    const limit = normalizeNonNegativeInteger(input.limit, "limit");
    if (limit === 0) {
      return [];
    }

    const nowIso = toIsoTimestamp(input.nowIso, "nowIso");
    const leaseDurationMs = normalizePositiveInteger(
      input.leaseDurationMs,
      "leaseDurationMs",
    );
    const nowEpoch = Date.parse(nowIso);
    const leaseExpiresAt = new Date(nowEpoch + leaseDurationMs).toISOString();
    const leased: GatewayCallbackOutboxRecord[] = [];

    await updateJsonFile(this.filePath, EMPTY_STATE, (current) => {
      const state = parseState(current);
      const eligible = state.records
        .filter((record) => isLeaseEligible(record, nowEpoch))
        .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
        .slice(0, limit);

      const eligibleIds = new Set(eligible.map((record) => record.id));
      state.records = state.records.map((record) => {
        if (!eligibleIds.has(record.id)) {
          return record;
        }
        const next: GatewayCallbackOutboxRecord = {
          ...record,
          status: "DISPATCHING",
          leaseToken: randomUUID(),
          leaseExpiresAt,
          updatedAt: nowIso,
        };
        leased.push(next);
        return next;
      });
      return state;
    });

    return leased;
  }

  async markSent(
    recordId: string,
    leaseToken: string,
    updatedAt?: string,
  ): Promise<GatewayCallbackOutboxRecord> {
    return this.updateLeasedRecord(recordId, leaseToken, (record, nextUpdatedAt) => ({
      ...record,
      status: "SENT",
      attemptCount: record.attemptCount + 1,
      nextAttemptAt: null,
      leaseToken: null,
      leaseExpiresAt: null,
      lastError: null,
      updatedAt: nextUpdatedAt,
    }), updatedAt);
  }

  async markRetry(
    recordId: string,
    leaseToken: string,
    input: { nextAttemptAt: string; lastError: string; updatedAt?: string },
  ): Promise<GatewayCallbackOutboxRecord> {
    const nextAttemptAt = toIsoTimestamp(input.nextAttemptAt, "nextAttemptAt");
    const lastError = normalizeRequiredString(input.lastError, "lastError");
    return this.updateLeasedRecord(recordId, leaseToken, (record, nextUpdatedAt) => ({
      ...record,
      status: "FAILED_RETRY",
      attemptCount: record.attemptCount + 1,
      nextAttemptAt,
      leaseToken: null,
      leaseExpiresAt: null,
      lastError,
      updatedAt: nextUpdatedAt,
    }), input.updatedAt);
  }

  async markDeadLetter(
    recordId: string,
    leaseToken: string,
    input: { lastError: string; updatedAt?: string },
  ): Promise<GatewayCallbackOutboxRecord> {
    const lastError = normalizeRequiredString(input.lastError, "lastError");
    return this.updateLeasedRecord(recordId, leaseToken, (record, nextUpdatedAt) => ({
      ...record,
      status: "DEAD_LETTER",
      attemptCount: record.attemptCount + 1,
      nextAttemptAt: null,
      leaseToken: null,
      leaseExpiresAt: null,
      lastError,
      updatedAt: nextUpdatedAt,
    }), input.updatedAt);
  }

  async getById(recordId: string): Promise<GatewayCallbackOutboxRecord | null> {
    const state = parseState(await readJsonFile(this.filePath, EMPTY_STATE));
    return state.records.find((record) => record.id === recordId) ?? null;
  }

  async listByStatus(
    statuses: GatewayCallbackOutboxStatus[],
  ): Promise<GatewayCallbackOutboxRecord[]> {
    const filter = new Set(statuses);
    if (filter.size === 0) {
      return [];
    }
    const state = parseState(await readJsonFile(this.filePath, EMPTY_STATE));
    return state.records.filter((record) => filter.has(record.status));
  }

  private async updateLeasedRecord(
    recordId: string,
    leaseToken: string,
    updater: (
      record: GatewayCallbackOutboxRecord,
      updatedAt: string,
    ) => GatewayCallbackOutboxRecord,
    updatedAt?: string,
  ): Promise<GatewayCallbackOutboxRecord> {
    const recordIdValue = normalizeRequiredString(recordId, "recordId");
    const leaseTokenValue = normalizeRequiredString(leaseToken, "leaseToken");
    const nextUpdatedAt = toIsoTimestamp(
      updatedAt ?? new Date().toISOString(),
      "updatedAt",
    );

    let result: GatewayCallbackOutboxRecord | null = null;
    await updateJsonFile(this.filePath, EMPTY_STATE, (current) => {
      const state = parseState(current);
      const index = state.records.findIndex((record) => record.id === recordIdValue);
      if (index < 0) {
        throw new Error(`Gateway callback outbox record not found: ${recordIdValue}`);
      }
      const existing = state.records[index];
      if (existing.leaseToken !== leaseTokenValue) {
        throw new Error(
          `Gateway callback outbox lease mismatch for record ${recordIdValue}.`,
        );
      }
      const next = updater(existing, nextUpdatedAt);
      state.records[index] = next;
      result = next;
      return state;
    });

    if (!result) {
      throw new Error(`Failed to update gateway callback outbox record: ${recordIdValue}`);
    }
    return result;
  }
}

const isLeaseEligible = (
  record: GatewayCallbackOutboxRecord,
  nowEpoch: number,
): boolean => {
  if (record.status === "PENDING") {
    return true;
  }
  if (record.status === "FAILED_RETRY") {
    return !record.nextAttemptAt || Date.parse(record.nextAttemptAt) <= nowEpoch;
  }
  if (record.status === "DISPATCHING") {
    const leaseExpiresAt = record.leaseExpiresAt;
    return leaseExpiresAt !== null && Date.parse(leaseExpiresAt) <= nowEpoch;
  }
  return false;
};

const parseState = (value: unknown): GatewayCallbackOutboxState => {
  if (!isRecord(value)) {
    return EMPTY_STATE;
  }
  const rawVersion = value.version;
  const rawRecords = value.records;
  if (rawVersion !== 1 || !Array.isArray(rawRecords)) {
    return EMPTY_STATE;
  }
  return {
    version: 1,
    records: rawRecords.map((record) => parseRecord(record)),
  };
};

const parseRecord = (value: unknown): GatewayCallbackOutboxRecord => {
  if (!isRecord(value)) {
    throw new Error("Invalid gateway callback outbox record.");
  }
  return {
    id: normalizeRequiredString(value.id, "id"),
    callbackIdempotencyKey: normalizeRequiredString(
      value.callbackIdempotencyKey,
      "callbackIdempotencyKey",
    ),
    payload: value.payload as ExternalOutboundEnvelope,
    status: parseStatus(value.status),
    attemptCount: normalizeNonNegativeInteger(value.attemptCount, "attemptCount"),
    nextAttemptAt: normalizeOptionalIso(value.nextAttemptAt, "nextAttemptAt"),
    leaseToken: normalizeOptionalString(value.leaseToken),
    leaseExpiresAt: normalizeOptionalIso(value.leaseExpiresAt, "leaseExpiresAt"),
    lastError: normalizeOptionalString(value.lastError),
    createdAt: toIsoTimestamp(value.createdAt, "createdAt"),
    updatedAt: toIsoTimestamp(value.updatedAt, "updatedAt"),
  };
};

const parseStatus = (value: unknown): GatewayCallbackOutboxStatus => {
  if (
    value === "PENDING" ||
    value === "DISPATCHING" ||
    value === "FAILED_RETRY" ||
    value === "SENT" ||
    value === "DEAD_LETTER"
  ) {
    return value;
  }
  throw new Error(`Unsupported gateway callback outbox status: ${String(value)}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
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

const normalizeOptionalIso = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return toIsoTimestamp(value, field);
};

const normalizeNonNegativeInteger = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
  return parsed;
};

const normalizePositiveInteger = (value: unknown, field: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer.`);
  }
  return parsed;
};

const toIsoTimestamp = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${field} must be an ISO timestamp string.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty ISO timestamp string.`);
  }
  const epoch = Date.parse(normalized);
  if (!Number.isFinite(epoch)) {
    throw new Error(`${field} must be a valid ISO timestamp.`);
  }
  return new Date(epoch).toISOString();
};
