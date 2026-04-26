import { randomUUID } from "node:crypto";
import type {
  ChannelAcceptedIngressReceiptInput,
  ChannelClaimIngressDispatchInput,
  ChannelIngressReceiptKey,
  ChannelIngressReceiptState,
  ChannelMessageReceipt,
  ChannelPendingIngressReceiptInput,
  ChannelSourceContext,
  ChannelSourceRoute,
  ChannelUnboundIngressReceiptInput,
} from "../domain/models.js";
import type { ChannelMessageReceiptProvider } from "./channel-message-receipt-provider.js";
import {
  normalizeNullableString,
  normalizeRequiredString,
  readJsonArrayFile,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";
import { resolveExternalChannelStoragePath } from "./external-channel-storage.js";
import {
  type ChannelMessageReceiptRow,
  matchesKey,
  matchesRoute,
  sortByUpdatedThenReceivedDesc,
  toReceipt,
  toSourceContext,
  toThreadStorage,
  type ExternalChannelProvider,
  type ExternalChannelTransport,
} from "./file-channel-message-receipt-row.js";

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
        dispatchAcceptedAt: null,
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
          dispatchAcceptedAt: null,
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
        dispatchAcceptedAt: null,
        turnId: null,
        agentRunId: null,
        teamRunId: null,
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
          `Cannot mark accepted ingress receipt for '${input.externalMessageId}' because it does not exist.`,
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
        dispatchAcceptedAt: input.dispatchAcceptedAt.toISOString(),
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
          dispatchAcceptedAt: null,
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
        turnId: null,
        dispatchAcceptedAt: current.dispatchAcceptedAt ?? null,
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

  async listReceiptsByIngressState(
    state: ChannelIngressReceiptState,
  ): Promise<ChannelMessageReceipt[]> {
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    return sortByUpdatedThenReceivedDesc(rows)
      .filter((row) => row.ingressState === state)
      .map((row) => toReceipt(row));
  }

  async findLatestAcceptedSourceForRoute(
    route: ChannelSourceRoute,
  ): Promise<ChannelSourceContext | null> {
    const rows = await readJsonArrayFile<ChannelMessageReceiptRow>(this.filePath);
    const found = sortByUpdatedThenReceivedDesc(rows).find(
      (row) => row.ingressState === "ACCEPTED" && matchesRoute(row, route),
    );
    return found ? toSourceContext(found) : null;
  }
}

export type { ExternalChannelProvider, ExternalChannelTransport };
