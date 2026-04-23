import type { TeamRunMetadataPayload } from '~/stores/runHistoryTypes'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
  type SkillAccessMode,
} from '~/types/agent/AgentRunConfig'
import type { MemberConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig'
import { normalizeModelIdentifier, normalizeRuntimeKind } from '~/composables/useDefinitionLaunchDefaults'

const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const normalizeSkillAccessMode = (value: SkillAccessMode | null | undefined): SkillAccessMode => {
  if (value === 'NONE' || value === 'PRELOADED_ONLY' || value === 'GLOBAL_DISCOVERY') {
    return value
  }
  return 'PRELOADED_ONLY'
}

const normalizeModelConfig = (
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null
  }

  return Object.fromEntries(
    Object.entries(config)
      .sort(([left], [right]) => left.localeCompare(right)),
  )
}

const modelConfigKey = (config: Record<string, unknown> | null | undefined): string =>
  JSON.stringify(normalizeModelConfig(config) ?? null)

const memberRouteKey = (member: { memberRouteKey: string; memberName: string }): string =>
  member.memberRouteKey?.trim() || member.memberName.trim()

type TeamMetadataMember = TeamRunMetadataPayload['memberMetadata'][number]

const normalizedMetadataMemberRuntimeKind = (
  member: TeamMetadataMember,
): AgentRuntimeKind => normalizeRuntimeKind(member.runtimeKind || DEFAULT_AGENT_RUNTIME_KIND)

const normalizedMetadataMemberModelIdentifier = (
  member: TeamMetadataMember,
): string => normalizeModelIdentifier(member.llmModelIdentifier || '')

const pickDominantValue = <T>(
  members: TeamMetadataMember[],
  getValue: (member: TeamMetadataMember) => T,
  getKey: (value: T) => string,
  preferredRouteKey: string,
): T | null => {
  if (members.length === 0) {
    return null
  }

  const tally = new Map<string, {
    value: T
    count: number
    firstIndex: number
    includesPreferred: boolean
  }>()

  members.forEach((member, index) => {
    const value = getValue(member)
    const key = getKey(value)
    const existing = tally.get(key)
    if (existing) {
      existing.count += 1
      if (memberRouteKey(member) === preferredRouteKey) {
        existing.includesPreferred = true
      }
      return
    }

    tally.set(key, {
      value,
      count: 1,
      firstIndex: index,
      includesPreferred: memberRouteKey(member) === preferredRouteKey,
    })
  })

  const winner = Array.from(tally.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }
    if (left.includesPreferred !== right.includesPreferred) {
      return left.includesPreferred ? -1 : 1
    }
    return left.firstIndex - right.firstIndex
  })[0]

  return winner?.value ?? null
}

const pickDominantRuntimeModelConfig = (
  members: TeamMetadataMember[],
  preferredRouteKey: string,
): {
  runtimeKind: AgentRuntimeKind
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
} => {
  const runtimeKind =
    pickDominantValue(
      members,
      normalizedMetadataMemberRuntimeKind,
      (value) => String(value),
      preferredRouteKey,
    ) ?? DEFAULT_AGENT_RUNTIME_KIND

  const runtimeMembers = members.filter((member) =>
    normalizedMetadataMemberRuntimeKind(member) === runtimeKind,
  )

  const llmModelIdentifier =
    pickDominantValue(
      runtimeMembers,
      normalizedMetadataMemberModelIdentifier,
      (value) => value,
      preferredRouteKey,
    ) ?? ''

  const modelSourceMembers = runtimeMembers.filter((member) =>
    normalizedMetadataMemberModelIdentifier(member) === llmModelIdentifier,
  )

  const llmConfig =
    pickDominantValue(
      modelSourceMembers.length > 0 ? modelSourceMembers : runtimeMembers,
      (member) => normalizeModelConfig(member.llmConfig ?? null),
      (value) => modelConfigKey(value),
      preferredRouteKey,
    ) ?? null

  return {
    runtimeKind,
    llmModelIdentifier,
    llmConfig,
  }
}

export const modelConfigsEqual = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean => modelConfigKey(left) === modelConfigKey(right)

export const hasExplicitMemberRuntimeOverride = (
  override: MemberConfigOverride | null | undefined,
): boolean => Boolean((override?.runtimeKind || '').trim())

export const hasExplicitMemberLlmModelOverride = (
  override: MemberConfigOverride | null | undefined,
): boolean => Boolean((override?.llmModelIdentifier || '').trim())

export const hasExplicitMemberLlmConfigOverride = (
  override: MemberConfigOverride | null | undefined,
): boolean => {
  if (!override) {
    return false
  }

  return hasOwn(override, 'llmConfig') && override.llmConfig !== undefined
}

export const resolveEffectiveMemberRuntimeKind = (
  override: MemberConfigOverride | null | undefined,
  globalRuntimeKind: string | null | undefined,
): AgentRuntimeKind => normalizeRuntimeKind(override?.runtimeKind ?? globalRuntimeKind)

export const resolveEffectiveMemberLlmModelIdentifier = (
  override: MemberConfigOverride | null | undefined,
  globalLlmModelIdentifier: string | null | undefined,
): string => normalizeModelIdentifier(override?.llmModelIdentifier || globalLlmModelIdentifier)

export const resolveEffectiveMemberLlmConfig = (
  override: MemberConfigOverride | null | undefined,
  globalLlmConfig: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (hasExplicitMemberLlmConfigOverride(override)) {
    return normalizeModelConfig(override?.llmConfig ?? null)
  }
  return normalizeModelConfig(globalLlmConfig ?? null)
}

export const buildUnavailableInheritedModelMessage = (params: {
  globalLlmModelIdentifier: string
  runtimeKind: string
  memberName?: string | null
}): string => {
  const runtimeLabel = runtimeKindToLabel(params.runtimeKind)
  const memberPrefix = params.memberName?.trim()
    ? `${params.memberName.trim()} `
    : ''

  return `Global model ${params.globalLlmModelIdentifier} is unavailable for ${runtimeLabel}; choose a compatible ${memberPrefix}model or clear the runtime override.`
}

export const hasMeaningfulMemberOverride = (
  override: MemberConfigOverride | null | undefined,
): boolean => {
  if (!override) {
    return false
  }

  return (
    hasExplicitMemberRuntimeOverride(override) ||
    hasExplicitMemberLlmModelOverride(override) ||
    override.autoExecuteTools !== undefined ||
    hasExplicitMemberLlmConfigOverride(override)
  )
}

export const reconstructTeamRunConfigFromMetadata = (params: {
  metadata: TeamRunMetadataPayload
  firstWorkspaceId: string | null
  isLocked: boolean
}): TeamRunConfig => {
  const members = params.metadata.memberMetadata
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
    }
  }

  const preferredRouteKey =
    params.metadata.coordinatorMemberRouteKey?.trim() || memberRouteKey(members[0])

  const {
    runtimeKind,
    llmModelIdentifier,
    llmConfig,
  } = pickDominantRuntimeModelConfig(members, preferredRouteKey)

  const autoExecuteTools =
    pickDominantValue(
      members,
      (member) => Boolean(member.autoExecuteTools),
      (value) => String(value),
      preferredRouteKey,
    ) ?? false

  const skillAccessMode =
    pickDominantValue(
      members,
      (member) => normalizeSkillAccessMode(member.skillAccessMode),
      (value) => value,
      preferredRouteKey,
    ) ?? 'PRELOADED_ONLY'

  const memberOverrides: Record<string, MemberConfigOverride> = {}
  members.forEach((member) => {
    const override: MemberConfigOverride = {
      agentDefinitionId: member.agentDefinitionId,
    }

    if (normalizedMetadataMemberRuntimeKind(member) !== runtimeKind) {
      override.runtimeKind = normalizedMetadataMemberRuntimeKind(member)
    }

    const memberModelIdentifier = normalizedMetadataMemberModelIdentifier(member)
    if (memberModelIdentifier !== llmModelIdentifier) {
      override.llmModelIdentifier = memberModelIdentifier
    }

    if (Boolean(member.autoExecuteTools) !== autoExecuteTools) {
      override.autoExecuteTools = Boolean(member.autoExecuteTools)
    }

    const memberConfig = normalizeModelConfig(member.llmConfig ?? null)
    if (!modelConfigsEqual(memberConfig, llmConfig)) {
      override.llmConfig = memberConfig
    }

    if (hasMeaningfulMemberOverride(override)) {
      memberOverrides[member.memberName] = override
    }
  })

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
  }
}
