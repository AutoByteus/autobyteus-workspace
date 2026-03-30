import {
  parseExternalChannelProvider,
  type ExternalChannelProvider,
} from "autobyteus-ts/external-channel/provider.js";
import {
  parseExternalChannelTransport,
  type ExternalChannelTransport,
} from "autobyteus-ts/external-channel/channel-transport.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
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
import { runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
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
  teamDefinitionId?: string | null;
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
    runtimeKind: runtimeKindFromString(value.runtimeKind, RuntimeKind.AUTOBYTEUS) ?? RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: value.autoExecuteTools,
    skillAccessMode:
      (normalizeNullableString(value.skillAccessMode) as ChannelBindingLaunchPreset["skillAccessMode"] | null) ??
      SkillAccessMode.PRELOADED_ONLY,
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
    runtimeKind: value.runtimeKind,
    autoExecuteTools: value.autoExecuteTools,
    skillAccessMode: normalizeNullableString(value.skillAccessMode),
    llmConfig: isJsonObject(value.llmConfig) ? value.llmConfig : null,
  };
};

const toDomainTeamLaunchPreset = (
  value: ChannelBindingLaunchPresetRecord | null | undefined,
): ChannelBindingTeamLaunchPreset | null => {
  if (!value) {
    return null;
  }

  return {
    workspaceRootPath: normalizeRequiredString(
      value.workspaceRootPath,
      "teamLaunchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      value.llmModelIdentifier,
      "teamLaunchPreset.llmModelIdentifier",
    ),
    runtimeKind: runtimeKindFromString(value.runtimeKind, RuntimeKind.AUTOBYTEUS) ?? RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: value.autoExecuteTools,
    skillAccessMode:
      (normalizeNullableString(value.skillAccessMode) as ChannelBindingTeamLaunchPreset["skillAccessMode"] | null) ??
      SkillAccessMode.PRELOADED_ONLY,
    llmConfig: isJsonObject(value.llmConfig) ? value.llmConfig : null,
  };
};

const toRecordTeamLaunchPreset = (
  value: ChannelBindingTeamLaunchPreset | null | undefined,
): ChannelBindingLaunchPresetRecord | null => {
  if (!value) {
    return null;
  }

  return {
    workspaceRootPath: normalizeRequiredString(
      value.workspaceRootPath,
      "teamLaunchPreset.workspaceRootPath",
    ),
    llmModelIdentifier: normalizeRequiredString(
      value.llmModelIdentifier,
      "teamLaunchPreset.llmModelIdentifier",
    ),
    runtimeKind: value.runtimeKind,
    autoExecuteTools: value.autoExecuteTools,
    skillAccessMode: value.skillAccessMode,
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
  launchPreset:
    value.targetType === "AGENT" ? toDomainLaunchPreset(value.launchPreset) : null,
  agentRunId: value.agentRunId,
  teamDefinitionId: normalizeNullableString(value.teamDefinitionId ?? null),
  teamLaunchPreset:
    value.targetType === "TEAM" ? toDomainTeamLaunchPreset(value.launchPreset) : null,
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

const shouldResetCachedTeamRun = (
  current: ChannelBindingRecord,
  input: UpsertChannelBindingInput,
): boolean => {
  if (current.targetType !== input.targetType) {
    return true;
  }

  if (input.targetType !== "TEAM") {
    return false;
  }

  const currentTeamDefinitionId = normalizeNullableString(current.teamDefinitionId ?? null);
  const nextTeamDefinitionId = normalizeNullableString(input.teamDefinitionId ?? null);
  if (currentTeamDefinitionId !== nextTeamDefinitionId) {
    return true;
  }

  return serializeLaunchPreset(current.launchPreset) !== serializeLaunchPreset(
    toRecordTeamLaunchPreset(input.teamLaunchPreset),
  );
};

const serializeLaunchPreset = (
  value: ChannelBindingLaunchPresetRecord | null | undefined,
): string => JSON.stringify(value ?? null);

const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export class FileChannelBindingProvider implements ChannelBindingProvider {
  constructor(
    private readonly filePath: string = resolvePersistencePath(
      "external-channel",
      "bindings.json",
    ),
  ) {}

  async findBinding(input: ChannelBindingLookup): Promise<ChannelBinding | null> {
    const rows = await readJsonArrayFile<ChannelBindingRecord>(this.filePath);
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
    const rows = await readJsonArrayFile<ChannelBindingRecord>(this.filePath);
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
    const rows = await readJsonArrayFile<ChannelBindingRecord>(this.filePath);
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
    const rows = await readJsonArrayFile<ChannelBindingRecord>(this.filePath);
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
    const rows = await readJsonArrayFile<ChannelBindingRecord>(this.filePath);
    return sortByUpdatedAtDesc(rows).map((row) => toDomain(row));
  }

  async upsertBinding(input: UpsertChannelBindingInput): Promise<ChannelBinding> {
    const now = new Date().toISOString();
    let saved: ChannelBindingRecord | null = null;

    await updateJsonArrayFile<ChannelBindingRecord>(this.filePath, (rows) => {
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
        const resetCachedTeamRun = shouldResetCachedTeamRun(current, input);
        const savedRecord: ChannelBindingRecord = {
          ...current,
          targetType: nextTargetType,
          agentDefinitionId:
            nextTargetType === "AGENT"
              ? normalizeNullableString(input.agentDefinitionId ?? null)
              : null,
          teamDefinitionId:
            nextTargetType === "TEAM"
              ? normalizeNullableString(input.teamDefinitionId ?? null)
              : null,
          launchPreset:
            nextTargetType === "AGENT"
              ? toRecordLaunchPreset(input.launchPreset)
              : nextTargetType === "TEAM"
                ? toRecordTeamLaunchPreset(input.teamLaunchPreset)
                : null,
          agentRunId:
            nextTargetType === "AGENT"
              ? resetCachedAgentRun
                ? null
                : normalizeNullableString(input.agentRunId ?? null) ?? current.agentRunId
              : null,
          teamRunId:
            nextTargetType === "TEAM"
              ? resetCachedTeamRun
                ? null
                : normalizeNullableString(input.teamRunId ?? null) ?? current.teamRunId
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
        teamDefinitionId:
          input.targetType === "TEAM"
            ? normalizeNullableString(input.teamDefinitionId ?? null)
            : null,
        launchPreset:
          input.targetType === "AGENT"
            ? toRecordLaunchPreset(input.launchPreset)
            : input.targetType === "TEAM"
              ? toRecordTeamLaunchPreset(input.teamLaunchPreset)
              : null,
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

    await updateJsonArrayFile<ChannelBindingRecord>(this.filePath, (rows) => {
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

  async upsertBindingTeamRunId(bindingId: string, teamRunId: string): Promise<ChannelBinding> {
    const normalizedId = normalizeRequiredString(bindingId, "bindingId");
    const normalizedTeamRunId = normalizeRequiredString(teamRunId, "teamRunId");
    const now = new Date().toISOString();
    let saved: ChannelBindingRecord | null = null;

    await updateJsonArrayFile<ChannelBindingRecord>(this.filePath, (rows) => {
      const index = rows.findIndex((row) => row.id === normalizedId);
      if (index < 0) {
        throw new Error("Binding not found");
      }
      const current = rows[index] as ChannelBindingRecord;
      const savedRecord: ChannelBindingRecord = {
        ...current,
        targetType: "TEAM",
        teamRunId: normalizedTeamRunId,
        updatedAt: now,
      };
      const next = [...rows];
      saved = savedRecord;
      next[index] = savedRecord;
      return next;
    });

    if (!saved) {
      throw new Error("Failed to update channel binding team run id.");
    }
    return toDomain(saved);
  }

  async deleteBinding(bindingId: string): Promise<boolean> {
    const normalizedId = normalizeRequiredString(bindingId, "bindingId");
    let removed = false;

    await updateJsonArrayFile<ChannelBindingRecord>(this.filePath, (rows) => {
      const next = rows.filter((row) => row.id !== normalizedId);
      removed = next.length !== rows.length;
      return next;
    });

    return removed;
  }
}

export type { ExternalChannelProvider, ExternalChannelTransport };
