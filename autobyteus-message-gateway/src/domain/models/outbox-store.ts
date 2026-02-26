import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";

export type OutboundOutboxStatus =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "FAILED_RETRY"
  | "DEAD_LETTER";

export type OutboundOutboxRecord = {
  id: string;
  dispatchKey: string;
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  payload: ExternalOutboundEnvelope;
  status: OutboundOutboxStatus;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutboundOutboxCreateInput = {
  dispatchKey: string;
  payload: ExternalOutboundEnvelope;
  createdAt?: string;
};

export type OutboundOutboxStatusUpdate = {
  status: OutboundOutboxStatus;
  attemptCount?: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  updatedAt?: string;
};

export type OutboundOutboxUpsertResult = {
  record: OutboundOutboxRecord;
  duplicate: boolean;
};

export interface OutboxStore {
  upsertByDispatchKey(input: OutboundOutboxCreateInput): Promise<OutboundOutboxUpsertResult>;
  getById(recordId: string): Promise<OutboundOutboxRecord | null>;
  leasePending(limit: number, nowIso: string): Promise<OutboundOutboxRecord[]>;
  updateStatus(recordId: string, update: OutboundOutboxStatusUpdate): Promise<OutboundOutboxRecord>;
  listByStatus(statuses: OutboundOutboxStatus[]): Promise<OutboundOutboxRecord[]>;
}
