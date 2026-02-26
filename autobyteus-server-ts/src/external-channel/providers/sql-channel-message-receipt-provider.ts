import { Prisma } from "@prisma/client";
import { BaseRepository } from "repository_prisma";
import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelDispatchTarget,
  ChannelIngressReceiptInput,
  ChannelSourceContext,
  ChannelTurnReceiptBindingInput,
} from "../domain/models.js";
import type { ChannelMessageReceiptProvider } from "./channel-message-receipt-provider.js";

class SqlChannelMessageReceiptRepository extends BaseRepository.forModel(
  Prisma.ModelName.ChannelMessageReceipt,
) {}

export class SqlChannelMessageReceiptProvider
  implements ChannelMessageReceiptProvider
{
  private readonly repository = new SqlChannelMessageReceiptRepository();

  async recordIngressReceipt(input: ChannelIngressReceiptInput): Promise<void> {
    await this.repository.upsert({
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
        turnId: normalizeNullableString(input.turnId ?? null) ?? undefined,
        agentRunId: normalizeNullableString(input.agentRunId) ?? undefined,
        teamRunId: normalizeNullableString(input.teamRunId) ?? undefined,
        receivedAt: input.receivedAt,
      },
      update: {
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        receivedAt: input.receivedAt,
      },
    });
  }

  async bindTurnToReceipt(input: ChannelTurnReceiptBindingInput): Promise<void> {
    await this.repository.upsert({
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
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId) ?? undefined,
        teamRunId: normalizeNullableString(input.teamRunId) ?? undefined,
        receivedAt: input.receivedAt,
      },
      update: {
        turnId: normalizeRequiredString(input.turnId, "turnId"),
        agentRunId: normalizeNullableString(input.agentRunId),
        teamRunId: normalizeNullableString(input.teamRunId),
        receivedAt: input.receivedAt,
      },
    });
  }

  async getLatestSourceByAgentRunId(
    agentRunId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentId = normalizeRequiredString(agentRunId, "agentRunId");
    const latest = await this.repository.findFirst({
      where: {
        agentRunId: normalizedAgentId,
      },
      orderBy: [{ receivedAt: "desc" }, { updatedAt: "desc" }],
    });

    return latest ? toSourceContext(latest) : null;
  }

  async getLatestSourceByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelSourceContext | null> {
    const agentRunId = normalizeNullableString(target.agentRunId);
    const teamRunId = normalizeNullableString(target.teamRunId);

    if (agentRunId) {
      const byAgent = await this.repository.findFirst({
        where: {
          agentRunId,
        },
        orderBy: [{ receivedAt: "desc" }, { updatedAt: "desc" }],
      });
      if (byAgent) {
        return toSourceContext(byAgent);
      }
    }

    if (!teamRunId) {
      return null;
    }

    const byTeam = await this.repository.findFirst({
      where: {
        teamRunId,
      },
      orderBy: [{ receivedAt: "desc" }, { updatedAt: "desc" }],
    });

    return byTeam ? toSourceContext(byTeam) : null;
  }

  async getSourceByAgentRunTurn(
    agentRunId: string,
    turnId: string,
  ): Promise<ChannelSourceContext | null> {
    const normalizedAgentId = normalizeRequiredString(agentRunId, "agentRunId");
    const normalizedTurnId = normalizeRequiredString(turnId, "turnId");
    const found = await this.repository.findFirst({
      where: {
        agentRunId: normalizedAgentId,
        turnId: normalizedTurnId,
      },
      orderBy: [{ updatedAt: "desc" }, { receivedAt: "desc" }],
    });
    return found ? toSourceContext(found) : null;
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

const parseProvider = (value: string): ExternalChannelProvider =>
  parseExternalChannelProvider(value);

const parseTransport = (value: string): ExternalChannelTransport =>
  parseExternalChannelTransport(value);
