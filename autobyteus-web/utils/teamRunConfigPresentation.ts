import type { DefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'
import { normalizeModelConfigRecord } from '~/types/launch/defaultLaunchConfig'
import type { AgentTeamMemberNode } from '~/types/agent/AgentTeamContext'
import type { MemberConfigOverride, TeamRunConfig } from '~/types/agent/TeamRunConfig'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import {
  normalizeModelIdentifier,
  normalizeRuntimeKind,
} from '~/composables/useDefinitionLaunchDefaults'
import { hasMeaningfulMemberOverride } from '~/utils/teamRunConfigUtils'

export type TeamRunDefaultsSummaryState = 'team-defaults' | 'changed' | 'missing-model'

export interface TeamRunModelConfigEntry {
  key: string
  value: string
  title: string
  truncated: boolean
}

export interface TeamRunDefaultsPresentation {
  state: TeamRunDefaultsSummaryState
  runtimeLabel: string
  modelIdentifier: string
  hasModelConfig: boolean
  modelConfigEntries: TeamRunModelConfigEntry[]
  runtimeChangedFromDefinition: boolean
  modelChangedFromDefinition: boolean
  modelConfigChangedFromDefinition: boolean
}

export interface TeamMemberOverridesPresentation {
  totalMembers: number
  activeOverrideCount: number
  activeOverrideNames: string[]
  hiddenOverrideCount: number
}

export interface TeamRunLaunchSummaryPresentation {
  memberCount: number
  runtimeLabel: string
  modelIdentifier: string
  autoApproveEnabled: boolean
  workspace: TeamRunLaunchWorkspacePresentation
  memberOverrideTag: TeamRunLaunchOverrideTagPresentation | null
}

export type TeamRunLaunchWorkspaceMode = 'existing' | 'new' | 'unset'

export interface TeamRunLaunchWorkspacePresentation {
  mode: TeamRunLaunchWorkspaceMode
  name?: string
  path?: string
}

export interface TeamRunLaunchOverrideTagPresentation {
  count: number
  routeKeys: string[]
  visibleNames: string[]
}

const MODEL_CONFIG_VALUE_MAX_LENGTH = 64

const stableModelConfigKey = (
  value: Record<string, unknown> | null | undefined,
): string => JSON.stringify(normalizeModelConfigRecord(value) ?? null)

const modelConfigsMatch = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean => stableModelConfigKey(left) === stableModelConfigKey(right)

const formatModelConfigValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return String(value)
  }

  const serialized = JSON.stringify(value)
  return serialized ?? String(value)
}

const truncateModelConfigValue = (value: string): { value: string; truncated: boolean } => {
  if (value.length <= MODEL_CONFIG_VALUE_MAX_LENGTH) {
    return { value, truncated: false }
  }

  return {
    value: `${value.slice(0, MODEL_CONFIG_VALUE_MAX_LENGTH - 1)}…`,
    truncated: true,
  }
}

export const buildModelConfigEntries = (
  config: Record<string, unknown> | null | undefined,
): TeamRunModelConfigEntry[] => {
  const normalizedConfig = normalizeModelConfigRecord(config)
  if (!normalizedConfig) {
    return []
  }

  return Object.entries(normalizedConfig).map(([key, rawValue]) => {
    const title = formatModelConfigValue(rawValue)
    const display = truncateModelConfigValue(title)
    return {
      key,
      value: display.value,
      title,
      truncated: display.truncated,
    }
  })
}

const activeOverrideDisplayName = (
  member: AgentTeamMemberNode | undefined,
  memberRouteKey: string,
): string => {
  if (!member) {
    return memberRouteKey
  }

  const breadcrumb = member.memberPath
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(' / ')

  return breadcrumb || member.displayName || member.memberName || memberRouteKey
}

const buildActiveOverrideDetails = (params: {
  leafMembers: readonly AgentTeamMemberNode[]
  memberOverrides?: Record<string, MemberConfigOverride> | null
}): Array<{ routeKey: string; displayName: string }> => {
  const leafByRouteKey = new Map(
    params.leafMembers.map((member) => [member.memberRouteKey, member] as const),
  )

  return Object.entries(params.memberOverrides || {})
    .filter(([, override]) => hasMeaningfulMemberOverride(override))
    .map(([memberRouteKey]) => ({
      routeKey: memberRouteKey,
      displayName: activeOverrideDisplayName(
        leafByRouteKey.get(memberRouteKey),
        memberRouteKey,
      ),
    }))
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName) ||
      left.routeKey.localeCompare(right.routeKey),
    )
}

export const buildTeamRunDefaultsPresentation = (params: {
  config: TeamRunConfig
  defaultLaunchConfig?: DefaultLaunchConfig | null
}): TeamRunDefaultsPresentation => {
  const definitionDefaults = params.defaultLaunchConfig ?? null
  const currentRuntimeKind = normalizeRuntimeKind(params.config.runtimeKind)
  const currentModelIdentifier = normalizeModelIdentifier(params.config.llmModelIdentifier)
  const currentModelConfig = normalizeModelConfigRecord(params.config.llmConfig)

  const definitionRuntimeKind = normalizeRuntimeKind(definitionDefaults?.runtimeKind)
  const definitionModelIdentifier = normalizeModelIdentifier(definitionDefaults?.llmModelIdentifier)
  const definitionModelConfig = normalizeModelConfigRecord(definitionDefaults?.llmConfig)

  const runtimeChangedFromDefinition = currentRuntimeKind !== definitionRuntimeKind
  const modelChangedFromDefinition = currentModelIdentifier !== definitionModelIdentifier
  const modelConfigChangedFromDefinition = !modelConfigsMatch(
    currentModelConfig,
    definitionModelConfig,
  )
  const hasAnyRunDefaultChange =
    runtimeChangedFromDefinition ||
    modelChangedFromDefinition ||
    modelConfigChangedFromDefinition
  const modelConfigEntries = buildModelConfigEntries(currentModelConfig)

  return {
    state: currentModelIdentifier
      ? (hasAnyRunDefaultChange ? 'changed' : 'team-defaults')
      : 'missing-model',
    runtimeLabel: runtimeKindToLabel(currentRuntimeKind),
    modelIdentifier: currentModelIdentifier,
    hasModelConfig: modelConfigEntries.length > 0,
    modelConfigEntries,
    runtimeChangedFromDefinition,
    modelChangedFromDefinition,
    modelConfigChangedFromDefinition,
  }
}

export const buildTeamMemberOverridesPresentation = (params: {
  leafMembers: readonly AgentTeamMemberNode[]
  memberOverrides?: Record<string, MemberConfigOverride> | null
  maxVisibleNames?: number
}): TeamMemberOverridesPresentation => {
  const maxVisibleNames = Math.max(0, params.maxVisibleNames ?? 3)
  const activeOverrideNames = buildActiveOverrideDetails({
    leafMembers: params.leafMembers,
    memberOverrides: params.memberOverrides,
  }).map((detail) => detail.displayName)

  return {
    totalMembers: params.leafMembers.length,
    activeOverrideCount: activeOverrideNames.length,
    activeOverrideNames: activeOverrideNames.slice(0, maxVisibleNames),
    hiddenOverrideCount: Math.max(0, activeOverrideNames.length - maxVisibleNames),
  }
}

export const buildTeamRunLaunchSummaryPresentation = (params: {
  config: Pick<TeamRunConfig, 'runtimeKind' | 'llmModelIdentifier' | 'autoExecuteTools' | 'memberOverrides'>
  leafMembers?: readonly AgentTeamMemberNode[]
  leafMemberCount?: number
  workspace?: TeamRunLaunchWorkspacePresentation | null
}): TeamRunLaunchSummaryPresentation => {
  const leafMembers = params.leafMembers ?? []
  const overrideDetails = buildActiveOverrideDetails({
    leafMembers,
    memberOverrides: params.config.memberOverrides,
  })
  const memberCount = params.leafMemberCount ?? leafMembers.length

  return {
    memberCount: Math.max(0, memberCount),
    runtimeLabel: runtimeKindToLabel(normalizeRuntimeKind(params.config.runtimeKind)),
    modelIdentifier: normalizeModelIdentifier(params.config.llmModelIdentifier),
    autoApproveEnabled: params.config.autoExecuteTools === true,
    workspace: params.workspace ?? { mode: 'unset' },
    memberOverrideTag: buildMemberOverrideTagPresentation(overrideDetails),
  }
}

const buildMemberOverrideTagPresentation = (
  overrideDetails: Array<{ routeKey: string; displayName: string }>,
): TeamRunLaunchOverrideTagPresentation | null => {
  if (!overrideDetails.length) {
    return null
  }

  const visibleNames = overrideDetails.slice(0, 2).map((detail) => detail.displayName)

  return {
    count: overrideDetails.length,
    routeKeys: overrideDetails.map((detail) => detail.routeKey),
    visibleNames,
  }
}
