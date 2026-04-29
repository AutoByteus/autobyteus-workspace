import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelOutputRoute,
  ChannelRunOutputDeliveryRecord,
  ChannelRunOutputDeliveryStatus,
  ChannelRunOutputTarget,
} from "../domain/models.js";
import { normalizeNullableString, parseDate } from "../../persistence/file/store-utils.js";

export type ChannelRunOutputTargetRow =
  | {
      targetType: "AGENT";
      agentRunId: string;
    }
  | {
      targetType: "TEAM";
      teamRunId: string;
      entryMemberRunId: string | null;
      entryMemberName: string | null;
    };

export type ChannelRunOutputDeliveryRow = {
  deliveryKey: string;
  bindingId: string;
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  target: ChannelRunOutputTargetRow;
  turnId: string;
  correlationMessageId: string | null;
  callbackIdempotencyKey: string | null;
  status: ChannelRunOutputDeliveryStatus;
  replyTextFinal: string | null;
  lastError: string | null;
  observedAt: string;
  finalizedAt: string | null;
  publishRequestedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const toThreadStorage = (threadId: string | null): string =>
  normalizeNullableString(threadId) ?? "";

const fromThreadStorage = (threadId: string): string | null =>
  normalizeNullableString(threadId);

export const routeToRow = (route: ChannelOutputRoute) => ({
  provider: route.provider,
  transport: route.transport,
  accountId: route.accountId,
  peerId: route.peerId,
  threadId: toThreadStorage(route.threadId),
});

export const rowToRoute = (row: ChannelRunOutputDeliveryRow): ChannelOutputRoute => ({
  provider: parseExternalChannelProvider(row.provider),
  transport: parseExternalChannelTransport(row.transport),
  accountId: row.accountId,
  peerId: row.peerId,
  threadId: fromThreadStorage(row.threadId),
});

export const targetToRow = (
  target: ChannelRunOutputTarget,
): ChannelRunOutputTargetRow =>
  target.targetType === "AGENT"
    ? {
        targetType: "AGENT",
        agentRunId: target.agentRunId,
      }
    : {
        targetType: "TEAM",
        teamRunId: target.teamRunId,
        entryMemberRunId: normalizeNullableString(target.entryMemberRunId),
        entryMemberName: normalizeNullableString(target.entryMemberName),
      };

export const rowToTarget = (
  target: ChannelRunOutputTargetRow,
): ChannelRunOutputTarget =>
  target.targetType === "AGENT"
    ? {
        targetType: "AGENT",
        agentRunId: target.agentRunId,
      }
    : {
        targetType: "TEAM",
        teamRunId: target.teamRunId,
        entryMemberRunId: normalizeNullableString(target.entryMemberRunId),
        entryMemberName: normalizeNullableString(target.entryMemberName),
      };

export const toRecord = (
  row: ChannelRunOutputDeliveryRow,
): ChannelRunOutputDeliveryRecord => ({
  deliveryKey: row.deliveryKey,
  bindingId: row.bindingId,
  route: rowToRoute(row),
  target: rowToTarget(row.target),
  turnId: row.turnId,
  correlationMessageId: normalizeNullableString(row.correlationMessageId),
  callbackIdempotencyKey: normalizeNullableString(row.callbackIdempotencyKey),
  status: row.status,
  replyTextFinal: normalizeNullableString(row.replyTextFinal),
  lastError: normalizeNullableString(row.lastError),
  observedAt: parseDate(row.observedAt),
  finalizedAt: row.finalizedAt ? parseDate(row.finalizedAt) : null,
  publishRequestedAt: row.publishRequestedAt ? parseDate(row.publishRequestedAt) : null,
  publishedAt: row.publishedAt ? parseDate(row.publishedAt) : null,
  createdAt: parseDate(row.createdAt),
  updatedAt: parseDate(row.updatedAt),
});

export const sortByUpdatedDesc = (
  rows: ChannelRunOutputDeliveryRow[],
): ChannelRunOutputDeliveryRow[] =>
  [...rows].sort((a, b) => parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime());

export type { ExternalChannelProvider, ExternalChannelTransport };
