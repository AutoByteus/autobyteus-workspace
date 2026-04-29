import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelIngressReceiptKey,
  ChannelIngressReceiptState,
  ChannelMessageReceipt,
  ChannelSourceContext,
  ChannelSourceRoute,
} from "../domain/models.js";
import {
  normalizeNullableString,
  parseDate,
} from "../../persistence/file/store-utils.js";

export type ChannelMessageReceiptRow = {
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  externalMessageId: string;
  ingressState: ChannelIngressReceiptState;
  dispatchAcceptedAt?: string | null;
  turnId: string | null;
  agentRunId: string | null;
  teamRunId: string | null;
  dispatchLeaseToken: string | null;
  dispatchLeaseExpiresAt: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
};

export const toThreadStorage = (threadId: string | null): string =>
  normalizeNullableString(threadId) ?? "";

const fromThreadStorage = (threadId: string): string | null =>
  normalizeNullableString(threadId);

export const sortByUpdatedThenReceivedDesc = (
  rows: ChannelMessageReceiptRow[],
): ChannelMessageReceiptRow[] =>
  [...rows].sort((a, b) => {
    const updatedDiff =
      parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime();
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return parseDate(b.receivedAt).getTime() - parseDate(a.receivedAt).getTime();
  });

export const toSourceContext = (
  row: ChannelMessageReceiptRow,
): ChannelSourceContext => ({
  provider: parseExternalChannelProvider(row.provider),
  transport: parseExternalChannelTransport(row.transport),
  accountId: row.accountId,
  peerId: row.peerId,
  threadId: fromThreadStorage(row.threadId),
  externalMessageId: row.externalMessageId,
  receivedAt: parseDate(row.receivedAt),
});

export const toReceipt = (
  row: ChannelMessageReceiptRow,
): ChannelMessageReceipt => ({
  ...toSourceContext(row),
  ingressState: row.ingressState,
  dispatchAcceptedAt: row.dispatchAcceptedAt
    ? parseDate(row.dispatchAcceptedAt)
    : null,
  turnId: normalizeNullableString(row.turnId),
  agentRunId: normalizeNullableString(row.agentRunId),
  teamRunId: normalizeNullableString(row.teamRunId),
  dispatchLeaseToken: normalizeNullableString(row.dispatchLeaseToken),
  dispatchLeaseExpiresAt: row.dispatchLeaseExpiresAt
    ? parseDate(row.dispatchLeaseExpiresAt)
    : null,
  createdAt: parseDate(row.createdAt),
  updatedAt: parseDate(row.updatedAt),
});

export const matchesKey = (
  row: ChannelMessageReceiptRow,
  input: ChannelIngressReceiptKey,
): boolean =>
  row.provider === input.provider &&
  row.transport === input.transport &&
  row.accountId === input.accountId &&
  row.peerId === input.peerId &&
  row.threadId === toThreadStorage(input.threadId) &&
  row.externalMessageId === input.externalMessageId;

export const matchesRoute = (
  row: ChannelMessageReceiptRow,
  route: ChannelSourceRoute,
): boolean =>
  row.provider === route.provider &&
  row.transport === route.transport &&
  row.accountId === route.accountId &&
  row.peerId === route.peerId &&
  row.threadId === toThreadStorage(route.threadId);

export type { ExternalChannelProvider, ExternalChannelTransport };
