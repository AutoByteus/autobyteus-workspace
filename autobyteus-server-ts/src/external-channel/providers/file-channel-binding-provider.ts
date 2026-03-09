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
  ChannelBindingLookup,
  ChannelBindingProviderDefaultLookup,
  ChannelDispatchTarget,
  ChannelSourceRoute,
  UpsertChannelBindingInput,
} from "../domain/models.js";
import type { ChannelBindingProvider } from "./channel-binding-provider.js";
import { normalizeRuntimeKind } from "../../runtime-management/runtime-kind.js";
import {
  nextNumericStringId,
  normalizeNullableString,
  normalizeRequiredString,
  parseDate,
  readJsonArrayFile,
  resolvePersistencePath,
  updateJsonArrayFile,
} from "../../persistence/file/store-utils.js";

type ChannelBindingRecord = {
  id: string;
  provider: string;
  transport: string;
  accountId: string;
  peerId: string;
  threadId: string;
  targetType: "AGENT" | "TEAM";
  agentDefinitionId?: string | null;
  launchPreset?: ChannelBindingLaunchPresetRecord | null;
  agentRunId: string | null;
  teamRunId: string | null;
  targetNodeName: string | null;
  allowTransportFallback: boolean;
  createdAt: string;
  updatedAt: string;
};

type ChannelBindingLaunchPresetRecord = {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  runtimeKind: string;
  autoExecuteTools: boolean;
  skillAccessMode: string | null;
  llmConfig: Record<string, unknown> | null;
};

const bindingsFilePath = resolvePersistencePath("external-channel", "bindings.json");

const toThreadStorage = (threadId: string | null): string => normalizeNullableString(threadId) ?? "";
const fromThreadStorage = (threadId: string): string | null => normalizeNullableString(threadId);

const parseTargetType = (value: string): "AGENT" | "TEAM" => {
  if (value === "AGENT" || value === "TEAM") {
    return value;
  }
  throw new Error(`Unsupported channel target type stored in file: ${value}`);
};

const toDomainLaunchPreset = (
  value: ChannelBindingLaunchPresetRecord | null | undefined,
): ChannelBindingLaunchPreset | null => {
  if (!value) {
    return null;
  }

  return {
    workspaceRootPath: normalizeRequiredString(
      value.workspaceRootPath,
      "launchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      value.llmModelIdentifier,
      "launchPreset.llmModelIdentifier",
    ),
    runtimeKind: normalizeRuntimeKind(value.runtimeKind),
    autoExecuteTools: value.autoExecuteTools,
    skillAccessMode: normalizeNullableString(value.skillAccessMode) as
      | ChannelBindingLaunchPreset["skillAccessMode"]
      | null,
    llmConfig: isJsonObject(value.llmConfig) ? value.llmConfig : null,
  };
};

const toRecordLaunchPreset = (
  value: ChannelBindingLaunchPreset | null | undefined,
): ChannelBindingLaunchPresetRecord | null => {
  if (!value) {
    return null;
  }

  return {
    workspaceRootPath: normalizeRequiredString(
      value.workspaceRootPath,
      "launchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      value.llmModelIdentifier,
      "launchPreset.llmModelIdentifier",
    ),
    runtimeKind: normalizeRuntimeKind(value.runtimeKind),
    autoExecuteTools: value.autoExecuteTools,
    skillAccessMode: normalizeNullableString(value.skillAccessMode),
    llmConfig: isJsonObject(value.llmConfig) ? value.llmConfig : null,
  };
};

const toDomain = (value: ChannelBindingRecord): ChannelBinding => ({
  id: value.id,
  provider: parseExternalChannelProvider(value.provider),
  transport: parseExternalChannelTransport(value.transport),
  accountId: value.accountId,
  peerId: value.peerId,
  threadId: fromThreadStorage(value.threadId),
  targetType: parseTargetType(value.targetType),
  agentDefinitionId: normalizeNullableString(value.agentDefinitionId ?? null),
  launchPreset: toDomainLaunchPreset(value.launchPreset),
  agentRunId: value.agentRunId,
  teamRunId: value.teamRunId,
  targetNodeName: value.targetNodeName,
  allowTransportFallback: value.allowTransportFallback,
  createdAt: parseDate(value.createdAt),
  updatedAt: parseDate(value.updatedAt),
});

const sortByUpdatedAtDesc = (rows: ChannelBindingRecord[]): ChannelBindingRecord[] =>
  [...rows].sort((a, b) => {
    const updatedDiff = parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime();
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime();
  });

const shouldResetCachedAgentRun = (
  current: ChannelBindingRecord,
  input: UpsertChannelBindingInput,
): boolean => {
  if (current.targetType !== input.targetType) {
    return true;
  }

  if (input.targetType !== "AGENT") {
    return false;
  }

  const currentAgentDefinitionId = normalizeNullableString(current.agentDefinitionId ?? null);
  const nextAgentDefinitionId = normalizeNullableString(input.agentDefinitionId ?? null);
  if (currentAgentDefinitionId !== nextAgentDefinitionId) {
    return true;
  }

  return serializeLaunchPreset(current.launchPreset) !== serializeLaunchPreset(
    toRecordLaunchPreset(input.launchPreset),
  );
};

const serializeLaunchPreset = (
  value: ChannelBindingLaunchPresetRecord | null | undefined,
): string => JSON.stringify(value ?? null);

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export class FileChannelBindingProvider implements ChannelBindingProvider {
  async findBinding(input: ChannelBindingLookup): Promise<ChannelBinding | null> {
    const rows = await readJsonArrayFile<ChannelBindingRecord>(bindingsFilePath);
    const found = rows.find(
      (row) =>
        row.provider === input.provider &&
        row.transport === input.transport &&
        row.accountId === input.accountId &&
        row.peerId === input.peerId &&
        row.threadId === toThreadStorage(input.threadId),
    );
    return found ? toDomain(found) : null;
  }

  async findProviderDefaultBinding(
    input: ChannelBindingProviderDefaultLookup,
  ): Promise<ChannelBinding | null> {
    const rows = await readJsonArrayFile<ChannelBindingRecord>(bindingsFilePath);
    const found = sortByUpdatedAtDesc(rows).find(
      (row) =>
        row.provider === input.provider &&
        row.accountId === input.accountId &&
        row.peerId === input.peerId &&
        row.threadId === toThreadStorage(input.threadId) &&
        row.allowTransportFallback,
    );
    return found ? toDomain(found) : null;
  }

  async findBindingByDispatchTarget(
    target: ChannelDispatchTarget,
  ): Promise<ChannelBinding | null> {
    const rows = await readJsonArrayFile<ChannelBindingRecord>(bindingsFilePath);
    const sorted = sortByUpdatedAtDesc(rows);

    const agentRunId = normalizeNullableString(target.agentRunId);
    if (agentRunId) {
      const byAgent = sorted.find((row) => row.targetType === "AGENT" && row.agentRunId === agentRunId);
      if (byAgent) {
        return toDomain(byAgent);
      }
    }

    const teamRunId = normalizeNullableString(target.teamRunId);
    if (!teamRunId) {
      return null;
    }

    const byTeam = sorted.find((row) => row.targetType === "TEAM" && row.teamRunId === teamRunId);
    return byTeam ? toDomain(byTeam) : null;
  }

  async isRouteBoundToTarget(
    route: ChannelSourceRoute,
    target: ChannelDispatchTarget,
  ): Promise<boolean> {
    const rows = await readJsonArrayFile<ChannelBindingRecord>(bindingsFilePath);
    const agentRunId = normalizeNullableString(target.agentRunId);
    const teamRunId = normalizeNullableString(target.teamRunId);

    return rows.some((row) => {
      const routeMatched =
        row.provider === route.provider &&
        row.transport === route.transport &&
        row.accountId === route.accountId &&
        row.peerId === route.peerId &&
        row.threadId === toThreadStorage(route.threadId);
      if (!routeMatched) {
        return false;
      }
      return (
        (agentRunId && row.targetType === "AGENT" && row.agentRunId === agentRunId) ||
        (teamRunId && row.targetType === "TEAM" && row.teamRunId === teamRunId)
      );
    });
  }

  async listBindings(): Promise<ChannelBinding[]> {
    const rows = await readJsonArrayFile<ChannelBindingRecord>(bindingsFilePath);
    return sortByUpdatedAtDesc(rows).map((row) => toDomain(row));
  }

  async upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding> {
    const now = new Date().toISOString();
    let saved: ChannelBindingRecord | null = null;

    await updateJsonArrayFile<ChannelBindingRecord>(bindingsFilePath, (rows) => {
      const index = rows.findIndex(
        (row) =>
          row.provider === input.provider &&
          row.transport === input.transport &&
          row.accountId === input.accountId &&
          row.peerId === input.peerId &&
          row.threadId === toThreadStorage(input.threadId),
      );

      if (index >= 0) {
        const current = rows[index] as ChannelBindingRecord;
        const nextTargetType = input.targetType;
        const resetCachedAgentRun = shouldResetCachedAgentRun(current, input);
        const savedRecord: ChannelBindingRecord = {
          ...current,
          targetType: nextTargetType,
          agentDefinitionId:
            nextTargetType === "AGENT"
              ? normalizeNullableString(input.agentDefinitionId ?? null)
              : null,
          launchPreset:
            nextTargetType === "AGENT" ? toRecordLaunchPreset(input.launchPreset) : null,
          agentRunId:
            nextTargetType === "AGENT"
              ? resetCachedAgentRun
                ? null
                : normalizeNullableString(input.agentRunId ?? null) ?? current.agentRunId
              : null,
          teamRunId:
            nextTargetType === "TEAM"
              ? normalizeNullableString(input.teamRunId ?? null)
              : null,
          targetNodeName: normalizeNullableString(input.targetNodeName ?? null),
          allowTransportFallback: input.allowTransportFallback ?? false,
          updatedAt: now,
        };
        const next = [...rows];
        saved = savedRecord;
        next[index] = savedRecord;
        return next;
      }

      const savedRecord: ChannelBindingRecord = {
        id: nextNumericStringId(rows),
        provider: input.provider,
        transport: input.transport,
        accountId: input.accountId,
        peerId: input.peerId,
        threadId: toThreadStorage(input.threadId),
        targetType: input.targetType,
        agentDefinitionId:
          input.targetType === "AGENT"
            ? normalizeNullableString(input.agentDefinitionId ?? null)
            : null,
        launchPreset:
          input.targetType === "AGENT" ? toRecordLaunchPreset(input.launchPreset) : null,
        agentRunId:
          input.targetType === "AGENT"
            ? normalizeNullableString(input.agentRunId ?? null)
            : null,
        teamRunId:
          input.targetType === "TEAM"
            ? normalizeNullableString(input.teamRunId ?? null)
            : null,
        targetNodeName: normalizeNullableString(input.targetNodeName ?? null),
        allowTransportFallback: input.allowTransportFallback ?? false,
        createdAt: now,
        updatedAt: now,
      };
      saved = savedRecord;
      return [...rows, savedRecord];
    });

    if (!saved) {
      throw new Error("Failed to upsert channel binding record.");
    }
    return toDomain(saved);
  }

  async upsertBindingAgentRunId(bindingId: string, agentRunId: string): Promise<ChannelBinding> {
    const normalizedId = normalizeRequiredString(bindingId, "bindingId");
    const normalizedAgentRunId = normalizeRequiredString(agentRunId, "agentRunId");
    const now = new Date().toISOString();
    let saved: ChannelBindingRecord | null = null;

    await updateJsonArrayFile<ChannelBindingRecord>(bindingsFilePath, (rows) => {
      const index = rows.findIndex((row) => row.id === normalizedId);
      if (index < 0) {
        throw new Error("Binding not found");
      }
      const current = rows[index] as ChannelBindingRecord;
      const savedRecord: ChannelBindingRecord = {
        ...current,
        targetType: "AGENT",
        agentRunId: normalizedAgentRunId,
        updatedAt: now,
      };
      const next = [...rows];
      saved = savedRecord;
      next[index] = savedRecord;
      return next;
    });

    if (!saved) {
      throw new Error("Failed to update channel binding agent run id.");
    }
    return toDomain(saved);
  }

  async deleteBinding(bindingId: string): Promise<boolean> {
    const normalizedId = normalizeRequiredString(bindingId, "bindingId");
    let removed = false;

    await updateJsonArrayFile<ChannelBindingRecord>(bindingsFilePath, (rows) => {
      const next = rows.filter((row) => row.id !== normalizedId);
      removed = next.length !== rows.length;
      return next;
    });

    return removed;
  }
}

export type { ExternalChannelProvider, ExternalChannelTransport };
