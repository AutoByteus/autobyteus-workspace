import type {
  AgentConfigOverride,
  TeamScopeConfigOverride,
  TeamWorkspaceSelection,
} from '~/types/agent/TeamRunConfig'
import { normalizeModelConfigRecord } from '~/types/launch/defaultLaunchConfig'

export type AgentOrgPlacementLaunchPatch = AgentConfigOverride | TeamScopeConfigOverride

export type AgentOrgPlacementLaunchConfiguration = Readonly<{
  runtimeKind?: string
  llmModelIdentifier?: string
  llmConfig?: Record<string, unknown> | null
  autoExecuteTools?: boolean
  workspaceRootPath?: string
}>

const owns = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const cloneWorkspace = (workspace: TeamWorkspaceSelection): TeamWorkspaceSelection => ({
  workspaceId: workspace.workspaceId,
  workspaceMetadata: workspace.workspaceMetadata ? { ...workspace.workspaceMetadata } : null,
})

const comparableValue = (value: unknown): unknown => {
  if (value === undefined) return Object.freeze({ __agentOrgUndefined: true })
  if (Array.isArray(value)) return value.map(comparableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, comparableValue(nested)]),
    )
  }
  return value
}

/**
 * Canonical sparse placement intent for AgentOrg Team and Agent overrides.
 * Omission means inheritance. An owned runtime or model must explicitly clear
 * inherited provider-specific configuration unless an owned configuration was
 * supplied with it.
 */
export const canonicalizeAgentOrgPlacementLaunchPatch = <T extends AgentOrgPlacementLaunchPatch>(
  patch: Readonly<T>,
): T => {
  const result: AgentOrgPlacementLaunchPatch = {}

  if (owns(patch, 'runtimeKind') && patch.runtimeKind !== undefined) {
    result.runtimeKind = patch.runtimeKind
  }
  if (owns(patch, 'llmModelIdentifier') && patch.llmModelIdentifier !== undefined) {
    result.llmModelIdentifier = patch.llmModelIdentifier
  }
  if (owns(patch, 'autoExecuteTools') && patch.autoExecuteTools !== undefined) {
    result.autoExecuteTools = patch.autoExecuteTools
  }
  if ('workspace' in patch && owns(patch, 'workspace') && patch.workspace) {
    (result as TeamScopeConfigOverride).workspace = cloneWorkspace(patch.workspace)
  }

  if (owns(patch, 'llmConfig')) {
    result.llmConfig = normalizeModelConfigRecord(patch.llmConfig) ?? null
  } else if (owns(result, 'runtimeKind') || owns(result, 'llmModelIdentifier')) {
    result.llmConfig = null
  }

  return result as T
}

export const agentOrgPlacementLaunchPatchesEqual = (
  left: Readonly<AgentOrgPlacementLaunchPatch>,
  right: Readonly<AgentOrgPlacementLaunchPatch>,
): boolean => JSON.stringify(comparableValue(left)) === JSON.stringify(comparableValue(right))

export const toAgentOrgPlacementLaunchConfiguration = (
  patch: Readonly<AgentOrgPlacementLaunchPatch>,
  workspaceRootPath?: string | null,
): AgentOrgPlacementLaunchConfiguration => {
  const canonical = canonicalizeAgentOrgPlacementLaunchPatch(patch)
  return Object.freeze({
    ...(owns(canonical, 'runtimeKind') ? { runtimeKind: canonical.runtimeKind } : {}),
    ...(owns(canonical, 'llmModelIdentifier')
      ? { llmModelIdentifier: canonical.llmModelIdentifier }
      : {}),
    ...(owns(canonical, 'llmConfig') ? { llmConfig: canonical.llmConfig ?? null } : {}),
    ...(owns(canonical, 'autoExecuteTools')
      ? { autoExecuteTools: canonical.autoExecuteTools }
      : {}),
    ...(workspaceRootPath?.trim() ? { workspaceRootPath: workspaceRootPath.trim() } : {}),
  })
}
