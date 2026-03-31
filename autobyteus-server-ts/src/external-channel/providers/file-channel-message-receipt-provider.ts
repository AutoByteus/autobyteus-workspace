import { randomUUID } from "node:crypto";
import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelAcceptedIngressReceiptInput,
  ChannelAcceptedReceiptCorrelationInput,
  ChannelClaimIngressDispatchInput,
  ChannelIngressReceiptKey,
  ChannelIngressReceiptState,
  ChannelMessageReceipt,
  ChannelPendingIngressReceiptInput,
  ChannelReplyPublishedReceiptInput,
  ChannelSourceContext,
  ChannelUnboundIngressReceiptInput,
} from "../domain/models.js";
import type { ChannelMessageReceiptProvider } from "./channel-message-receipt-provider.js";
import {
  normalizeNullableString,
  normalizeRequiredString,
  parseDate,
  readJsonArrayFile,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";
import { resolveExternalChannelStoragePath } from "./external-channel-storage.js";

type ChannelMessageReceiptRow = {
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  externalMessageId: string;
  ingressState: ChannelIngressReceiptState;
  turnId: string | null;
  agentRunId: string | null;
  teamRunId: string | null;
  dispatchLeaseToken: string | null;
  dispatchLeaseExpiresAt: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
};

const toThreadStorage = (threadId: string | null): string =>
  normalizeNullableString(threadId) ?? "";
const fromThreadStorage = (threadId: string): string | null =>
  normalizeNullableString(threadId);

const sortByUpdatedThenReceivedDesc = (
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

const toSourceContext = (row: ChannelMessageReceiptRow): ChannelSourceContext => ({
  provider: parseExternalChannelProvider(row.provider),
  transport: parseExternalChannelTransport(row.transport),
  accountId: row.accountId,
  peerId: row.peerId,
  threadId: fromThreadStorage(row.threadId),
  externalMessageId: row.externalMessageId,
  receivedAt: parseDate(row.receivedAt),
  turnId: normalizeNullableString(row.turnId),
});

const toReceipt = (row: ChannelMessageReceiptRow): ChannelMessageReceipt => ({
  ...toSourceContext(row),
  ingressState: row.ingressState,
  agentRunId: normalizeNullableString(row.agentRunId),
  teamRunId: normalizeNullableString(row.teamRunId),
  dispatchLeaseToken: normalizeNullableString(row.dispatchLeaseToken),
  dispatchLeaseExpiresAt: row.dispatchLeaseExpiresAt
    ? parseDate(row.dispatchLeaseExpiresAt)
    : null,
  createdAt: parseDate(row.createdAt),
  updatedAt: parseDate(row.updatedAt),
});

const matchesKey = (
  row: ChannelMessageReceiptRow,
  input: ChannelIngressReceiptKey,
): boolean =>
  row.provider === input.provider &&
  row.transport === input.transport &&
  row.accountId === input.accountId &&
  row.peerId === input.peerId &&
  row.threadId === toThreadStorage(input.threadId) &&
  row.externalMessageId === input.externalMessageId;

const isSourceLookupState = (state: ChannelIngressReceiptState): boolean =>
  state === "ACCEPTED" || state === "ROUTED";

export class FileChannelMessageReceiptProvider
  implements ChannelMessageReceiptProvider
{
  constructor(
    private readonly filePath: string = resolveExternalChannelStoragePath(
      "message-receipts.json",
    ),
  ) {}

  async getReceiptByExternalMessage(
    input: ChannelIngressReceiptKey,
  ): Promise<ChannelMessageReceipt | null> {
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    const found = rows.find((row) => matchesKey(row, input));
    return found ? toReceipt(found) : null;
  }

  async createPendingIngressReceipt(
    input: ChannelPendingIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const now = new Date().toISOString();
    let result: ChannelMessageReceiptRow | null = null;
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const existing = rows.find((row) => matchesKey(row, input));
      if (existing) {
        result = existing;
        return rows;
      }

      const created: ChannelMessageReceiptRow = {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        externalMessageId: input.externalMessageId,
        ingressState: "PENDING",
        turnId: null,
        agentRunId: null,
        teamRunId: null,
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt.toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      result = created;
      return [...rows, created];
    });

    if (!result) {
      throw new Error("Failed to create pending ingress receipt.");
    }
    return toReceipt(result);
  }

  async claimIngressDispatch(
    input: ChannelClaimIngressDispatchInput,
  ): Promise<ChannelMessageReceipt> {
    const claimedAt = input.claimedAt.toISOString();
    const leaseExpiresAt = new Date(
      input.claimedAt.getTime() + input.leaseDurationMs,
    ).toISOString();
    const leaseToken = randomUUID();
    let result: ChannelMessageReceiptRow | null = null;

    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => matchesKey(row, input));
      const next = [...rows];
      if (index < 0) {
        const created: ChannelMessageReceiptRow = {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
          ingressState: "DISPATCHING",
          turnId: null,
          agentRunId: null,
          teamRunId: null,
          dispatchLeaseToken: leaseToken,
          dispatchLeaseExpiresAt: leaseExpiresAt,
          receivedAt: input.receivedAt.toISOString(),
          createdAt: claimedAt,
          updatedAt: claimedAt,
        };
        result = created;
        return [...rows, created];
      }

      const current = next[index] as ChannelMessageReceiptRow;
      next[index] = {
        ...current,
        ingressState: "DISPATCHING",
        dispatchLeaseToken: leaseToken,
        dispatchLeaseExpiresAt: leaseExpiresAt,
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: claimedAt,
      };
      result = next[index] as ChannelMessageReceiptRow;
      return next;
    });

    if (!result) {
      throw new Error("Failed to claim ingress dispatch receipt.");
    }
    return toReceipt(result);
  }

  async recordAcceptedDispatch(
    input: ChannelAcceptedIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const now = new Date().toISOString();
    let result: ChannelMessageReceiptRow | null = null;
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => matchesKey(row, input));
      if (index < 0) {
        throw new Error(
          `Cannot mark routed ingress receipt for '${input.externalMessageId}' because it does not exist.`,
        );
      }

      const next = [...rows];
      const current = next[index] as ChannelMessageReceiptRow;
      if (
        normalizeNullableString(current.dispatchLeaseToken) !==
        normalizeRequiredString(input.dispatchLeaseToken, "dispatchLeaseToken")
      ) {
        throw new Error(
          `Ingress dispatch lease mismatch for '${input.externalMessageId}'.`,
        );
      }

      next[index] = {
        ...current,
        ingressState: "ACCEPTED",
        turnId: normalizeNullableString(input.turnId ?? null),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: now,
      };
      result = next[index] as ChannelMessageReceiptRow;
      return next;
    });

    if (!result) {
      throw new Error("Failed to record accepted ingress receipt.");
    }
    return toReceipt(result);
  }

  async markIngressUnbound(
    input: ChannelUnboundIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const now = new Date().toISOString();
    let result: ChannelMessageReceiptRow | null = null;
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => matchesKey(row, input));
      const next = [...rows];
      if (index < 0) {
        const created: ChannelMessageReceiptRow = {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
          ingressState: "UNBOUND",
          turnId: null,
          agentRunId: null,
          teamRunId: null,
          dispatchLeaseToken: null,
          dispatchLeaseExpiresAt: null,
          receivedAt: input.receivedAt.toISOString(),
          createdAt: now,
          updatedAt: now,
        };
        result = created;
        return [...rows, created];
      }

      const current = next[index] as ChannelMessageReceiptRow;
      next[index] = {
        ...current,
        ingressState: "UNBOUND",
        agentRunId: null,
        teamRunId: null,
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: now,
      };
      result = next[index] as ChannelMessageReceiptRow;
      return next;
    });

    if (!result) {
      throw new Error("Failed to mark ingress receipt as unbound.");
    }
    return toReceipt(result);
  }

  async updateAcceptedReceiptCorrelation(
    input: ChannelAcceptedReceiptCorrelationInput,
  ): Promise<ChannelMessageReceipt> {
    const now = new Date().toISOString();
    let result: ChannelMessageReceiptRow | null = null;
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => matchesKey(row, input));
      if (index < 0) {
        throw new Error(
          `Cannot update accepted receipt correlation for '${input.externalMessageId}' because it does not exist.`,
        );
      }

      const current = rows[index] as ChannelMessageReceiptRow;
      if (current.ingressState !== "ACCEPTED") {
        throw new Error(
          `Cannot update accepted receipt correlation for '${input.externalMessageId}' because it is not in ACCEPTED state.`,
        );
      }
      const next = [...rows];
      next[index] = {
        ...current,
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: now,
      };
      result = next[index] as ChannelMessageReceiptRow;
      return next;
    });

    if (!result) {
      throw new Error("Failed to update accepted receipt correlation.");
    }
    return toReceipt(result);
  }

  async markReplyPublished(
    input: ChannelReplyPublishedReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const now = new Date().toISOString();
    let result: ChannelMessageReceiptRow | null = null;
    await updateJsonArrayFile<ChannelMessageReceiptRow>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => matchesKey(row, input));
      if (index < 0) {
        throw new Error(
          `Cannot mark reply published for '${input.externalMessageId}' because it does not exist.`,
        );
      }

      const current = rows[index] as ChannelMessageReceiptRow;
      const next = [...rows];
      next[index] = {
        ...current,
        ingressState: "ROUTED",
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt.toISOString(),
        updatedAt: now,
      };
      result = next[index] as ChannelMessageReceiptRow;
      return next;
    });

    if (!result) {
      throw new Error("Failed to mark reply as published.");
    }
    return toReceipt(result);
  }

  async listReceiptsByIngressState(
    state: ChannelIngressReceiptState,
  ): Promise<ChannelMessageReceipt[]> {
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    return sortByUpdatedThenReceivedDesc(rows)
      .filter((row) => row.ingressState === state)
      .map((row) => toReceipt(row));
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const normalizedTurnId = normalizeRequiredString(turnId, "turnId");
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    const found = sortByUpdatedThenReceivedDesc(rows).find(
      (row) =>
        isSourceLookupState(row.ingressState) &&
        row.agentRunId === normalizedAgentRunId &&
        row.turnId === normalizedTurnId,
    );
    return found ? toSourceContext(found) : null;
  }
}

export type { ExternalChannelProvider, ExternalChannelTransport };
