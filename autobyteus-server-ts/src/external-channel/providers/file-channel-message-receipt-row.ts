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
  ChannelReceiptWorkflowState,
  ChannelSourceContext,
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
  workflowState?: ChannelReceiptWorkflowState;
  dispatchAcceptedAt?: string | null;
  turnId: string | null;
  agentRunId: string | null;
  teamRunId: string | null;
  replyTextFinal?: string | null;
  lastError?: string | null;
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
  turnId: normalizeNullableString(row.turnId),
});

export const toReceipt = (
  row: ChannelMessageReceiptRow,
): ChannelMessageReceipt => ({
  ...toSourceContext(row),
  ingressState: row.ingressState,
  workflowState: normalizeWorkflowState(row.workflowState),
  dispatchAcceptedAt: row.dispatchAcceptedAt
    ? parseDate(row.dispatchAcceptedAt)
    : null,
  agentRunId: normalizeNullableString(row.agentRunId),
  teamRunId: normalizeNullableString(row.teamRunId),
  replyTextFinal: normalizeNullableString(row.replyTextFinal ?? null),
  lastError: normalizeNullableString(row.lastError ?? null),
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

export const isSourceLookupState = (
  state: ChannelIngressReceiptState,
  workflowState: ChannelReceiptWorkflowState,
): boolean =>
  (state === "ACCEPTED" || state === "ROUTED") &&
  workflowState !== "FAILED" &&
  workflowState !== "EXPIRED" &&
  workflowState !== "UNBOUND";

export const normalizeWorkflowState = (
  value: ChannelReceiptWorkflowState | undefined,
): ChannelReceiptWorkflowState => {
  if (!value) {
    throw new Error(
      "Channel message receipt row is missing workflowState. Legacy runtime fallback is not supported.",
    );
  }
  return value;
};

export type { ExternalChannelProvider, ExternalChannelTransport };
