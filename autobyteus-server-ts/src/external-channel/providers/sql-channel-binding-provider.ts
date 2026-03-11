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
  ChannelBindingLaunchPreset,
  ChannelBindingTeamLaunchPreset,
  ChannelBindingLookup,
  ChannelBindingProviderDefaultLookup,
  ChannelDispatchTarget,
  ChannelSourceRoute,
  UpsertChannelBindingInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "./channel-binding-provider.js";
import { normalizeRuntimeKind } from "../../runtime-management/runtime-kind.js";

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

  async findProviderDefaultBinding(
    input: ChannelBindingProviderDefaultLookup,
  ): Promise<ChannelBinding | null> {
    const found = await this.repository.findFirst({
      where: {
        provider: input.provider,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        allowTransportFallback: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return found ? toDomain(found) : null;
  }

  async findBindingByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelBinding | null> {
    const agentRunId = normalizeNullableString(target.agentRunId);
    const teamRunId = normalizeNullableString(target.teamRunId);

    if (agentRunId) {
      const agentBinding = await this.repository.findFirst({
        where: {
          targetType: "AGENT",
          agentRunId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
      if (agentBinding) {
        return toDomain(agentBinding);
      }
    }

    if (!teamRunId) {
      return null;
    }

    const teamBinding = await this.repository.findFirst({
      where: {
        targetType: "TEAM",
        teamRunId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return teamBinding ? toDomain(teamBinding) : null;
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
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    return bindings.map((binding) => toDomain(binding));
  }

  async upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding> {
    const existing = await this.repository.findUnique({
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
    const resetCachedAgentRun = shouldResetCachedAgentRun(existing, input);
    const resetCachedTeamRun = shouldResetCachedTeamRun(existing, input);
    const createOrUpdateData = buildUpsertPayload(
      input,
      existing,
      resetCachedAgentRun,
      resetCachedTeamRun,
    );
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
      create: createOrUpdateData,
      update: createOrUpdateData,
    });

    return toDomain(createdOrUpdated);
  }

  async upsertBindingAgentRunId(
    bindingId: string,
    agentRunId: string,
  ): Promise<ChannelBinding> {
    const normalizedId = parseBindingId(bindingId);
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const updated = await this.repository.update({
      where: {
        id: normalizedId,
      },
      data: {
        agentRunId: normalizedAgentRunId,
        targetType: "AGENT",
      },
    });
    return toDomain(updated);
  }

  async upsertBindingTeamRunId(
    bindingId: string,
    teamRunId: string,
  ): Promise<ChannelBinding> {
    const normalizedId = parseBindingId(bindingId);
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const updated = await this.repository.update({
      where: {
        id: normalizedId,
      },
      data: {
        teamRunId: normalizedTeamRunId,
        targetType: "TEAM",
      },
    });
    return toDomain(updated);
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

const parseNullableJsonObject = (
  value: string | null | undefined,
): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const serializeNullableJsonObject = (
  value: Record<string, unknown> | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }
  return JSON.stringify(value);
};

const toDomainLaunchPreset = (value: {
  workspaceRootPath: string | null;
  llmModelIdentifier: string | null;
  runtimeKind: string | null;
  autoExecuteTools: boolean | null;
  skillAccessMode: string | null;
  llmConfigJson: string | null;
}): ChannelBindingLaunchPreset | null => {
  const workspaceRootPath = normalizeNullableString(value.workspaceRootPath);
  const llmModelIdentifier = normalizeNullableString(value.llmModelIdentifier);
  if (!workspaceRootPath || !llmModelIdentifier) {
    return null;
  }

  return {
    workspaceRootPath,
    llmModelIdentifier,
    runtimeKind: normalizeRuntimeKind(value.runtimeKind),
    autoExecuteTools: value.autoExecuteTools ?? false,
    skillAccessMode: normalizeNullableString(value.skillAccessMode) as
      | ChannelBindingLaunchPreset["skillAccessMode"]
      | null,
    llmConfig: parseNullableJsonObject(value.llmConfigJson),
  };
};

const toDomainTeamLaunchPreset = (value: {
  workspaceRootPath: string | null;
  llmModelIdentifier: string | null;
  runtimeKind: string | null;
  autoExecuteTools: boolean | null;
  llmConfigJson: string | null;
}): ChannelBindingTeamLaunchPreset | null => {
  const workspaceRootPath = normalizeNullableString(value.workspaceRootPath);
  const llmModelIdentifier = normalizeNullableString(value.llmModelIdentifier);
  if (!workspaceRootPath || !llmModelIdentifier) {
    return null;
  }

  return {
    workspaceRootPath,
    llmModelIdentifier,
    runtimeKind: normalizeRuntimeKind(value.runtimeKind),
    autoExecuteTools: value.autoExecuteTools ?? false,
    llmConfig: parseNullableJsonObject(value.llmConfigJson),
  };
};

const shouldResetCachedAgentRun = (
  current:
    | {
        targetType: string;
        agentDefinitionId: string | null;
        teamDefinitionId: string | null;
        workspaceRootPath: string | null;
        llmModelIdentifier: string | null;
        runtimeKind: string | null;
        autoExecuteTools: boolean | null;
        skillAccessMode: string | null;
        llmConfigJson: string | null;
      }
    | null,
  input: UpsertChannelBindingInput,
): boolean => {
  if (!current) {
    return false;
  }
  if (current.targetType !== input.targetType) {
    return true;
  }
  if (input.targetType !== "AGENT") {
    return false;
  }
  if (normalizeNullableString(current.agentDefinitionId) !== normalizeNullableString(input.agentDefinitionId ?? null)) {
    return true;
  }

  return serializePreset(
    toDomainLaunchPreset({
      workspaceRootPath: current.workspaceRootPath,
      llmModelIdentifier: current.llmModelIdentifier,
      runtimeKind: current.runtimeKind,
      autoExecuteTools: current.autoExecuteTools,
      skillAccessMode: current.skillAccessMode,
      llmConfigJson: current.llmConfigJson,
    }),
  ) !== serializePreset(input.launchPreset ?? null);
};

const shouldResetCachedTeamRun = (
  current:
    | {
        targetType: string;
        teamDefinitionId: string | null;
        workspaceRootPath: string | null;
        llmModelIdentifier: string | null;
        runtimeKind: string | null;
        autoExecuteTools: boolean | null;
        llmConfigJson: string | null;
      }
    | null,
  input: UpsertChannelBindingInput,
): boolean => {
  if (!current) {
    return false;
  }
  if (current.targetType !== input.targetType) {
    return true;
  }
  if (input.targetType !== "TEAM") {
    return false;
  }
  if (
    normalizeNullableString(current.teamDefinitionId) !==
    normalizeNullableString(input.teamDefinitionId ?? null)
  ) {
    return true;
  }

  return serializePreset(
    toDomainTeamLaunchPreset({
      workspaceRootPath: current.workspaceRootPath,
      llmModelIdentifier: current.llmModelIdentifier,
      runtimeKind: current.runtimeKind,
      autoExecuteTools: current.autoExecuteTools,
      llmConfigJson: current.llmConfigJson,
    }),
  ) !== serializePreset(input.teamLaunchPreset ?? null);
};

const serializePreset = (
  value: ChannelBindingLaunchPreset | ChannelBindingTeamLaunchPreset | null | undefined,
): string => JSON.stringify(value ?? null);

const buildUpsertPayload = (
  input: UpsertChannelBindingInput,
  existing:
    | {
        agentRunId: string | null;
        teamRunId: string | null;
      }
    | null,
  resetCachedAgentRun: boolean,
  resetCachedTeamRun: boolean,
) => {
  const nextTargetType = input.targetType;
  return {
    provider: input.provider,
    transport: input.transport,
    accountId: input.accountId,
    peerId: input.peerId,
    threadId: toThreadStorage(input.threadId),
    targetType: nextTargetType,
    agentDefinitionId:
      nextTargetType === "AGENT"
        ? normalizeNullableString(input.agentDefinitionId ?? null) ?? undefined
        : null,
    teamDefinitionId:
      nextTargetType === "TEAM"
        ? normalizeNullableString(input.teamDefinitionId ?? null) ?? undefined
        : null,
    workspaceRootPath:
      nextTargetType === "AGENT"
        ? normalizeNullableString(input.launchPreset?.workspaceRootPath ?? null) ?? undefined
        : nextTargetType === "TEAM"
          ? normalizeNullableString(input.teamLaunchPreset?.workspaceRootPath ?? null) ?? undefined
          : null,
    llmModelIdentifier:
      nextTargetType === "AGENT"
        ? normalizeNullableString(input.launchPreset?.llmModelIdentifier ?? null) ?? undefined
        : nextTargetType === "TEAM"
          ? normalizeNullableString(input.teamLaunchPreset?.llmModelIdentifier ?? null) ?? undefined
          : null,
    runtimeKind:
      nextTargetType === "AGENT"
        ? normalizeRuntimeKind(input.launchPreset?.runtimeKind)
        : nextTargetType === "TEAM"
          ? normalizeRuntimeKind(input.teamLaunchPreset?.runtimeKind)
          : null,
    autoExecuteTools:
      nextTargetType === "AGENT"
        ? input.launchPreset?.autoExecuteTools ?? false
        : nextTargetType === "TEAM"
          ? input.teamLaunchPreset?.autoExecuteTools ?? false
          : null,
    skillAccessMode:
      nextTargetType === "AGENT"
        ? normalizeNullableString(input.launchPreset?.skillAccessMode ?? null) ?? null
        : null,
    llmConfigJson:
      nextTargetType === "AGENT"
        ? serializeNullableJsonObject(input.launchPreset?.llmConfig ?? null)
        : nextTargetType === "TEAM"
          ? serializeNullableJsonObject(input.teamLaunchPreset?.llmConfig ?? null)
          : null,
    agentRunId:
      nextTargetType === "AGENT"
        ? resetCachedAgentRun
          ? null
          : normalizeNullableString(input.agentRunId ?? null) ??
            normalizeNullableString(existing?.agentRunId ?? null)
        : null,
    teamRunId:
      nextTargetType === "TEAM"
        ? resetCachedTeamRun
          ? null
          : normalizeNullableString(input.teamRunId ?? null) ??
            normalizeNullableString(existing?.teamRunId ?? null)
        : null,
    targetNodeName: normalizeNullableString(input.targetNodeName ?? null),
    allowTransportFallback: input.allowTransportFallback ?? false,
  };
};

const toDomain = (value: {
  id: number;
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  targetType: string;
  agentDefinitionId: string | null;
  teamDefinitionId: string | null;
  workspaceRootPath: string | null;
  llmModelIdentifier: string | null;
  runtimeKind: string | null;
  autoExecuteTools: boolean | null;
  skillAccessMode: string | null;
  llmConfigJson: string | null;
  agentRunId: string | null;
  teamRunId: string | null;
  targetNodeName: string | null;
  allowTransportFallback: boolean;
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
  agentDefinitionId: normalizeNullableString(value.agentDefinitionId),
  launchPreset: value.targetType === "AGENT" ? toDomainLaunchPreset(value) : null,
  agentRunId: value.agentRunId,
  teamDefinitionId: normalizeNullableString(value.teamDefinitionId),
  teamLaunchPreset: value.targetType === "TEAM" ? toDomainTeamLaunchPreset(value) : null,
  teamRunId: value.teamRunId,
  targetNodeName: value.targetNodeName,
  allowTransportFallback: value.allowTransportFallback,
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
