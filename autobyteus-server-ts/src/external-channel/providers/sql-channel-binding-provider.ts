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
  ChannelBinding,
  ChannelDispatchTarget,
  ChannelBindingLookup,
  ChannelSourceRoute,
  UpsertChannelBindingInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "./channel-binding-provider.js";

class SqlChannelBindingRepository extends BaseRepository.forModel(
  Prisma.ModelName.ChannelBinding,
) {}

export class SqlChannelBindingProvider implements ChannelBindingProvider {
  private readonly repository = new SqlChannelBindingRepository();

  async findBinding(input: ChannelBindingLookup): Promise<ChannelBinding | null> {
    const found = await this.repository.findUnique({
      where: {
        provider_transport_accountId_peerId_threadId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
        },
      },
    });

    return found ? toDomain(found) : null;
  }

  async isRouteBoundToTarget(
    route: ChannelSourceRoute,
    target: ChannelDispatchTarget,
  ): Promise<boolean> {
    const agentRunId = normalizeNullableString(target.agentRunId);
    const teamRunId = normalizeNullableString(target.teamRunId);
    const or: Array<Record<string, unknown>> = [];
    if (agentRunId) {
      or.push({
        targetType: "AGENT",
        agentRunId,
      });
    }
    if (teamRunId) {
      or.push({
        targetType: "TEAM",
        teamRunId,
      });
    }
    if (or.length === 0) {
      return false;
    }

    const found = await this.repository.findFirst({
      where: {
        provider: route.provider,
        transport: route.transport,
        accountId: route.accountId,
        peerId: route.peerId,
        threadId: toThreadStorage(route.threadId),
        OR: or as any,
      },
    });
    return found !== null;
  }

  async listBindings(): Promise<ChannelBinding[]> {
    const bindings = await this.repository.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    return bindings.map((binding) => toDomain(binding));
  }

  async upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding> {
    const createdOrUpdated = await this.repository.upsert({
      where: {
        provider_transport_accountId_peerId_threadId: {
          provider: input.provider,
          transport: input.transport,
          accountId: input.accountId,
          peerId: input.peerId,
          threadId: toThreadStorage(input.threadId),
        },
      },
      create: {
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        targetType: input.targetType,
        agentRunId: normalizeNullableString(input.agentRunId ?? null) ?? undefined,
        teamRunId: normalizeNullableString(input.teamRunId ?? null) ?? undefined,
        targetNodeName:
          normalizeNullableString(input.targetMemberName ?? null) ?? undefined,
      },
      update: {
        targetType: input.targetType,
        agentRunId: normalizeNullableString(input.agentRunId ?? null),
        teamRunId: normalizeNullableString(input.teamRunId ?? null),
        targetNodeName: normalizeNullableString(input.targetMemberName ?? null),
      },
    });

    return toDomain(createdOrUpdated);
  }

  async deleteBinding(bindingId: string): Promise<boolean> {
    const normalizedId = parseBindingId(bindingId);
    const existing = await this.repository.findUnique({
      where: {
        id: normalizedId,
      },
    });
    if (!existing) {
      return false;
    }

    await this.repository.delete({
      where: {
        id: normalizedId,
      },
    });
    return true;
  }
}

const toThreadStorage = (threadId: string | null): string =>
  normalizeNullableString(threadId) ?? "";

const fromThreadStorage = (threadId: string): string | null => {
  const normalized = threadId.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseBindingId = (value: string): number => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error("bindingId must be a non-empty string.");
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`bindingId must be a positive integer string. Received: ${value}`);
  }
  return parsed;
};

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toDomain = (value: {
  id: number;
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  targetType: string;
  agentRunId: string | null;
  teamRunId: string | null;
  targetNodeName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ChannelBinding => ({
  id: value.id.toString(),
  provider: parseProvider(value.provider),
  transport: parseTransport(value.transport),
  accountId: value.accountId,
  peerId: value.peerId,
  threadId: fromThreadStorage(value.threadId),
  targetType: parseTargetType(value.targetType),
  agentRunId: value.agentRunId,
  teamRunId: value.teamRunId,
  targetMemberName: value.targetNodeName,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

const parseProvider = (value: string): ExternalChannelProvider =>
  parseExternalChannelProvider(value);

const parseTransport = (value: string): ExternalChannelTransport =>
  parseExternalChannelTransport(value);

const parseTargetType = (value: string): "AGENT" | "TEAM" => {
  if (value === "AGENT" || value === "TEAM") {
    return value;
  }
  throw new Error(`Unsupported channel target type stored in DB: ${value}`);
};
