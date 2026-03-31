import { Prisma } from "@prisma/client";
import { BaseRepository } from "repository_prisma";
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

class SqlChannelMessageReceiptRepository extends BaseRepository.forModel(
  Prisma.ModelName.ChannelMessageReceipt,
) {}

export class SqlChannelMessageReceiptProvider
  implements ChannelMessageReceiptProvider
{
  private readonly repository = new SqlChannelMessageReceiptRepository();
  private readonly sourceLookupStates = ["ACCEPTED", "ROUTED"] as const;

  async getReceiptByExternalMessage(
    input: ChannelIngressReceiptKey,
  ): Promise<ChannelMessageReceipt | null> {
    const found = await this.repository.findUnique({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
    });
    return found ? toReceipt(found) : null;
  }

  async createPendingIngressReceipt(
    input: ChannelPendingIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const saved = await this.repository.upsert({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
      create: {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        externalMessageId: input.externalMessageId,
        ingressState: "PENDING",
        receivedAt: input.receivedAt,
      },
      update: {},
    });
    return toReceipt(saved);
  }

  async claimIngressDispatch(
    input: ChannelClaimIngressDispatchInput,
  ): Promise<ChannelMessageReceipt> {
    const dispatchLeaseToken = randomUUID();
    const dispatchLeaseExpiresAt = new Date(
      input.claimedAt.getTime() + input.leaseDurationMs,
    );
    const saved = await this.repository.upsert({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
      create: {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        externalMessageId: input.externalMessageId,
        ingressState: "DISPATCHING",
        receivedAt: input.receivedAt,
        dispatchLeaseToken,
        dispatchLeaseExpiresAt,
      },
      update: {
        ingressState: "DISPATCHING",
        receivedAt: input.receivedAt,
        dispatchLeaseToken,
        dispatchLeaseExpiresAt,
      },
    });
    return toReceipt(saved);
  }

  async recordAcceptedDispatch(
    input: ChannelAcceptedIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const current = await this.requireReceipt(input);
    if (normalizeNullableString(current.dispatchLeaseToken) !== input.dispatchLeaseToken) {
      throw new Error(
        `Ingress dispatch lease mismatch for '${input.externalMessageId}'.`,
      );
    }

    const saved = await this.repository.update({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
      data: {
        ingressState: "ACCEPTED",
        turnId: normalizeNullableString(input.turnId ?? null),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt,
      },
    });
    return toReceipt(saved);
  }

  async markIngressUnbound(
    input: ChannelUnboundIngressReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const saved = await this.repository.upsert({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
      create: {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        externalMessageId: input.externalMessageId,
        ingressState: "UNBOUND",
        receivedAt: input.receivedAt,
      },
      update: {
        ingressState: "UNBOUND",
        agentRunId: null,
        teamRunId: null,
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt,
      },
    });
    return toReceipt(saved);
  }

  async updateAcceptedReceiptCorrelation(
    input: ChannelAcceptedReceiptCorrelationInput,
  ): Promise<ChannelMessageReceipt> {
    const current = await this.requireReceipt(input);
    if (current.ingressState !== "ACCEPTED") {
      throw new Error(
        `Cannot update accepted receipt correlation for '${input.externalMessageId}' because it is not in ACCEPTED state.`,
      );
    }

    const saved = await this.repository.update({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
      data: {
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        receivedAt: input.receivedAt,
      },
    });
    return toReceipt(saved);
  }

  async markReplyPublished(
    input: ChannelReplyPublishedReceiptInput,
  ): Promise<ChannelMessageReceipt> {
    const saved = await this.repository.update({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
      data: {
        ingressState: "ROUTED",
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        dispatchLeaseToken: null,
        dispatchLeaseExpiresAt: null,
        receivedAt: input.receivedAt,
      },
    });
    return toReceipt(saved);
  }

  async listReceiptsByIngressState(
    state: ChannelIngressReceiptState,
  ): Promise<ChannelMessageReceipt[]> {
    const rows = await this.repository.findMany({
      where: { ingressState: state },
      orderBy: [{ updatedAt: "desc" }, { receivedAt: "desc" }],
    });
    return rows.map((row) => toReceipt(row));
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const normalizedTurnId = normalizeRequiredString(turnId, "turnId");
    const found = await this.repository.findFirst({
      where: {
        agentRunId: normalizedAgentRunId,
        turnId: normalizedTurnId,
        ingressState: { in: [...this.sourceLookupStates] },
      },
      orderBy: [{ updatedAt: "desc" }, { receivedAt: "desc" }],
    });
    return found ? toSourceContext(found) : null;
  }

  private async requireReceipt(
    input: ChannelIngressReceiptKey,
  ): Promise<{
    provider: string;
    transport: string;
    accountId: string;
    peerId: string;
    threadId: string;
    externalMessageId: string;
    ingressState: string;
    turnId: string | null;
    agentRunId: string | null;
    teamRunId: string | null;
    dispatchLeaseToken: string | null;
    dispatchLeaseExpiresAt: Date | null;
    receivedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const found = await this.repository.findUnique({
      where: {
        provider_transport_accountId_peerId_threadId_externalMessageId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
          externalMessageId: input.externalMessageId,
        },
      },
    });
    if (!found) {
      throw new Error(
        `Cannot find ingress receipt for '${input.externalMessageId}'.`,
      );
    }
    return found;
  }
}

const toThreadStorage = (threadId: string | null): string =>
  normalizeNullableString(threadId) ?? "";

const fromThreadStorage = (threadId: string): string | null => {
  const normalized = threadId.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toSourceContext = (value: {
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  externalMessageId: string;
  receivedAt: Date;
  turnId?: string | null;
}): ChannelSourceContext => ({
  provider: parseProvider(value.provider),
  transport: parseTransport(value.transport),
  accountId: value.accountId,
  peerId: value.peerId,
  threadId: fromThreadStorage(value.threadId),
  externalMessageId: value.externalMessageId,
  receivedAt: value.receivedAt,
  turnId: normalizeNullableString(value.turnId ?? null),
});

const toReceipt = (value: {
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  externalMessageId: string;
  ingressState: string;
  turnId?: string | null;
  agentRunId?: string | null;
  teamRunId?: string | null;
  dispatchLeaseToken?: string | null;
  dispatchLeaseExpiresAt?: Date | null;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ChannelMessageReceipt => ({
  ...toSourceContext(value),
  ingressState: parseIngressState(value.ingressState),
  agentRunId: normalizeNullableString(value.agentRunId ?? null),
  teamRunId: normalizeNullableString(value.teamRunId ?? null),
  dispatchLeaseToken: normalizeNullableString(value.dispatchLeaseToken ?? null),
  dispatchLeaseExpiresAt: value.dispatchLeaseExpiresAt ?? null,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

const parseIngressState = (
  value: string,
): ChannelMessageReceipt["ingressState"] => {
  switch (value) {
    case "PENDING":
    case "DISPATCHING":
    case "ACCEPTED":
    case "ROUTED":
    case "UNBOUND":
      return value;
    default:
      throw new Error(`Unknown ingress state '${value}'.`);
  }
};

const parseProvider = (value: string): ExternalChannelProvider =>
  parseExternalChannelProvider(value);

const parseTransport = (value: string): ExternalChannelTransport =>
  parseExternalChannelTransport(value);
