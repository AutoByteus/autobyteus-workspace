import type { TeamRunMetadataPayload } from '~/stores/runHistoryTypes';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig';
import type { MemberConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig';

const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeSkillAccessMode = (value: SkillAccessMode | null | undefined): SkillAccessMode => {
  if (value === 'NONE' || value === 'PRELOADED_ONLY' || value === 'GLOBAL_DISCOVERY') {
    return value;
  }
  return 'PRELOADED_ONLY';
};

const normalizeModelConfig = (
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(config)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
};

const modelConfigKey = (config: Record<string, unknown> | null | undefined): string =>
  JSON.stringify(normalizeModelConfig(config) ?? null);

const memberRouteKey = (member: { memberRouteKey: string; memberName: string }): string =>
  member.memberRouteKey?.trim() || member.memberName.trim();

type TeamMetadataMember = TeamRunMetadataPayload['memberMetadata'][number];

const pickDominantValue = <T>(
  members: TeamMetadataMember[],
  getValue: (member: TeamMetadataMember) => T,
  getKey: (value: T) => string,
  preferredRouteKey: string,
): T | null => {
  if (members.length === 0) {
    return null;
  }

  const tally = new Map<string, {
    value: T;
    count: number;
    firstIndex: number;
    includesPreferred: boolean;
  }>();

  members.forEach((member, index) => {
    const value = getValue(member);
    const key = getKey(value);
    const existing = tally.get(key);
    if (existing) {
      existing.count += 1;
      if (memberRouteKey(member) === preferredRouteKey) {
        existing.includesPreferred = true;
      }
      return;
    }

    tally.set(key, {
      value,
      count: 1,
      firstIndex: index,
      includesPreferred: memberRouteKey(member) === preferredRouteKey,
    });
  });

  const winner = Array.from(tally.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    if (left.includesPreferred !== right.includesPreferred) {
      return left.includesPreferred ? -1 : 1;
    }
    return left.firstIndex - right.firstIndex;
  })[0];

  return winner?.value ?? null;
};

export const modelConfigsEqual = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean => modelConfigKey(left) === modelConfigKey(right);

export const hasExplicitMemberLlmConfigOverride = (
  override: MemberConfigOverride | null | undefined,
): boolean => {
  if (!override) {
    return false;
  }

  return hasOwn(override, 'llmConfig') && override.llmConfig !== undefined;
};

export const resolveEffectiveMemberLlmConfig = (
  override: MemberConfigOverride | null | undefined,
  globalLlmConfig: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (hasExplicitMemberLlmConfigOverride(override)) {
    return normalizeModelConfig(override?.llmConfig ?? null);
  }
  return normalizeModelConfig(globalLlmConfig ?? null);
};

export const hasMeaningfulMemberOverride = (
  override: MemberConfigOverride | null | undefined,
): boolean => {
  if (!override) {
    return false;
  }

  return (
    Boolean(override.llmModelIdentifier) ||
    override.autoExecuteTools !== undefined ||
    hasExplicitMemberLlmConfigOverride(override)
  );
};

export const reconstructTeamRunConfigFromMetadata = (params: {
  metadata: TeamRunMetadataPayload;
  firstWorkspaceId: string | null;
  isLocked: boolean;
}): TeamRunConfig => {
  const members = params.metadata.memberMetadata;
  if (members.length === 0) {
    return {
      teamDefinitionId: params.metadata.teamDefinitionId,
      teamDefinitionName: params.metadata.teamDefinitionName,
      runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: params.firstWorkspaceId,
      llmModelIdentifier: '',
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      memberOverrides: {},
      isLocked: params.isLocked,
    };
  }

  const preferredRouteKey =
    params.metadata.coordinatorMemberRouteKey?.trim() || memberRouteKey(members[0]);

  const runtimeKind =
    pickDominantValue(
      members,
      (member) => (member.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind,
      (value) => String(value),
      preferredRouteKey,
    ) ?? DEFAULT_AGENT_RUNTIME_KIND;

  const llmModelIdentifier =
    pickDominantValue(
      members,
      (member) => member.llmModelIdentifier || '',
      (value) => value,
      preferredRouteKey,
    ) ?? '';

  const autoExecuteTools =
    pickDominantValue(
      members,
      (member) => Boolean(member.autoExecuteTools),
      (value) => String(value),
      preferredRouteKey,
    ) ?? false;

  const skillAccessMode =
    pickDominantValue(
      members,
      (member) => normalizeSkillAccessMode(member.skillAccessMode),
      (value) => value,
      preferredRouteKey,
    ) ?? 'PRELOADED_ONLY';

  const configSourceMembers =
    members.filter((member) => (member.llmModelIdentifier || '') === llmModelIdentifier);

  const llmConfig =
    pickDominantValue(
      configSourceMembers.length > 0 ? configSourceMembers : members,
      (member) => normalizeModelConfig(member.llmConfig ?? null),
      (value) => modelConfigKey(value),
      preferredRouteKey,
    ) ?? null;

  const memberOverrides: Record<string, MemberConfigOverride> = {};
  members.forEach((member) => {
    const override: MemberConfigOverride = {
      agentDefinitionId: member.agentDefinitionId,
    };

    if ((member.llmModelIdentifier || '') !== llmModelIdentifier) {
      override.llmModelIdentifier = member.llmModelIdentifier;
    }

    if (Boolean(member.autoExecuteTools) !== autoExecuteTools) {
      override.autoExecuteTools = Boolean(member.autoExecuteTools);
    }

    const memberConfig = normalizeModelConfig(member.llmConfig ?? null);
    if (!modelConfigsEqual(memberConfig, llmConfig)) {
      override.llmConfig = memberConfig;
    }

    if (hasMeaningfulMemberOverride(override)) {
      memberOverrides[member.memberName] = override;
    }
  });

  return {
    teamDefinitionId: params.metadata.teamDefinitionId,
    teamDefinitionName: params.metadata.teamDefinitionName,
    runtimeKind,
    workspaceId: params.firstWorkspaceId,
    llmModelIdentifier,
    llmConfig,
    autoExecuteTools,
    skillAccessMode,
    memberOverrides,
    isLocked: params.isLocked,
  };
};
