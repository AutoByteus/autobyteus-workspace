import {
  runtimeKindToLabel,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import type { MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import {
  normalizeModelConfig,
  normalizeModelIdentifier,
  normalizeRuntimeKind,
} from '~/composables/useDefinitionLaunchDefaults'

const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const modelConfigKey = (config: Record<string, unknown> | null | undefined): string =>
  JSON.stringify(normalizeModelConfig(config) ?? null)

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
