import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import type {
  AgentConfigOverride,
  ResolvedTeamRunLaunchConfig,
  TeamScopeConfigOverride,
} from '~/types/agent/TeamRunConfig'
import { normalizeModelConfigRecord } from '~/types/launch/defaultLaunchConfig'

export type LaunchConfigOverride = AgentConfigOverride | TeamScopeConfigOverride
export const normalizeModelIdentifier = (value: string | null | undefined): string => (value || '').trim()
export const normalizeRuntimeKind = (value: string | null | undefined): AgentRuntimeKind =>
  ((value || '').trim() || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
export const normalizeModelConfig = normalizeModelConfigRecord
const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key)
const modelConfigKey = (config: Record<string, unknown> | null | undefined): string => JSON.stringify(normalizeModelConfig(config) ?? null)
export const modelConfigsEqual = (left: Record<string, unknown> | null | undefined, right: Record<string, unknown> | null | undefined): boolean =>
  modelConfigKey(left) === modelConfigKey(right)
export const resolvedTeamRunLaunchConfigsEqual = (
  left: Readonly<ResolvedTeamRunLaunchConfig>,
  right: Readonly<ResolvedTeamRunLaunchConfig>,
): boolean => left.runtimeKind === right.runtimeKind
  && left.workspaceRootPath === right.workspaceRootPath
  && left.llmModelIdentifier === right.llmModelIdentifier
  && modelConfigsEqual(left.llmConfig, right.llmConfig)
  && left.autoExecuteTools === right.autoExecuteTools
  && left.skillAccessMode === right.skillAccessMode
export const hasExplicitRuntimeOverride = (override?: LaunchConfigOverride | null): boolean => Boolean((override?.runtimeKind || '').trim())
export const hasExplicitLlmModelOverride = (override?: LaunchConfigOverride | null): boolean => Boolean((override?.llmModelIdentifier || '').trim())
export const hasExplicitLlmConfigOverride = (override?: LaunchConfigOverride | null): boolean =>
  Boolean(override && hasOwn(override, 'llmConfig') && override.llmConfig !== undefined)
export const resolveOverrideRuntimeKind = (override: LaunchConfigOverride | null | undefined, inherited: string | null | undefined): AgentRuntimeKind =>
  normalizeRuntimeKind(override?.runtimeKind ?? inherited)
export const resolveOverrideLlmModelIdentifier = (override: LaunchConfigOverride | null | undefined, inherited: string | null | undefined): string =>
  normalizeModelIdentifier(override?.llmModelIdentifier || inherited)
export const resolveOverrideLlmConfig = (
  override: LaunchConfigOverride | null | undefined,
  inherited: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (hasExplicitLlmConfigOverride(override)) return normalizeModelConfig(override?.llmConfig ?? null)
  if (hasExplicitRuntimeOverride(override) || hasExplicitLlmModelOverride(override)) return null
  return normalizeModelConfig(inherited ?? null)
}
export const buildUnavailableInheritedModelMessage = (params: {
  inheritedLlmModelIdentifier?: string
  globalLlmModelIdentifier?: string
  runtimeKind: string
  memberName?: string | null
}): string => {
  const model = params.inheritedLlmModelIdentifier ?? params.globalLlmModelIdentifier ?? ''
  const prefix = params.memberName?.trim() ? `${params.memberName.trim()} ` : ''
  return `Inherited model ${model} is unavailable for ${runtimeKindToLabel(params.runtimeKind)}; choose a compatible ${prefix}model or reset the runtime override.`
}
export const hasMeaningfulLaunchOverride = (override?: LaunchConfigOverride | null): boolean => Boolean(override && (
  hasExplicitRuntimeOverride(override)
  || hasExplicitLlmModelOverride(override)
  || override.autoExecuteTools !== undefined
  || hasExplicitLlmConfigOverride(override)
  || ('workspace' in override && override.workspace !== undefined)
))
export const hasExplicitMemberRuntimeOverride = hasExplicitRuntimeOverride
export const hasExplicitMemberLlmModelOverride = hasExplicitLlmModelOverride
export const hasExplicitMemberLlmConfigOverride = hasExplicitLlmConfigOverride
export const resolveEffectiveMemberRuntimeKind = resolveOverrideRuntimeKind
export const resolveEffectiveMemberLlmModelIdentifier = resolveOverrideLlmModelIdentifier
export const resolveEffectiveMemberLlmConfig = resolveOverrideLlmConfig
export const hasMeaningfulMemberOverride = hasMeaningfulLaunchOverride
