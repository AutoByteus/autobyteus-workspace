import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type {
  RunMemberSettingChange,
  RunMemberSettingReset,
  RunModelChoice,
  RunSettingsValues,
} from '~/types/runSettings/RunSettings'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { applyModelOption, onlyModelOptions, withoutModelOptions } from '~/utils/runSettings/modelOptions'
import { withNewRuntimeOverridePolicy } from '~/utils/agentRunRuntimeDraftPolicy'
import {
  modelConfigsEqual,
  normalizeModelConfig,
  resolveOverrideLlmConfig,
  resolveOverrideLlmModelIdentifier,
  resolveOverrideRuntimeKind,
} from '~/utils/teamRunConfigUtils'

/**
 * How a member's own settings (an `AgentConfigOverride`: a Team member, an Org direct agent, a
 * placed team or its member) change in the Member settings drawer. Only fields that differ from
 * the parent are kept (REQ-009): a member whose settings match its parent's again follows it again.
 * A row seeded from its own definition default is pinned (`pinnedModel`): it keeps its own runtime,
 * model and model settings even when they equal the parent's, until its model, the row or all
 * rows are reset (DEC-009, REQ-010); the draft store holds the pin.
 */
export interface MemberOverrideDeps {
  /** The model config a newly chosen model starts with (its defaults, as in the message box). */
  defaultConfigFor(choice: RunModelChoice): Record<string, unknown> | null
  schemaFor(runtimeKind: string, llmModelIdentifier: string): UiModelConfigSchema | null
}

type Settings = Pick<RunSettingsValues, 'runtimeKind' | 'llmModelIdentifier' | 'llmConfig' | 'autoExecuteTools'>

export type MemberOverrideOptions = Readonly<{ pinnedModel?: boolean }>

/** What a member runs with: its own fields over its parent's. */
export const resolveMemberSettings = <T extends Settings>(parent: T, override: AgentConfigOverride | null | undefined): T => ({
  ...parent,
  runtimeKind: resolveOverrideRuntimeKind(override, parent.runtimeKind),
  llmModelIdentifier: resolveOverrideLlmModelIdentifier(override, parent.llmModelIdentifier),
  llmConfig: resolveOverrideLlmConfig(override, parent.llmConfig),
  autoExecuteTools: override?.autoExecuteTools ?? parent.autoExecuteTools,
})

/**
 * Keep only what differs from the parent. An own model always carries its own model config. A
 * pinned member always keeps its own runtime, model and model config.
 */
export const normalizeMemberOverride = (
  override: AgentConfigOverride | null | undefined,
  parent: Settings,
  options: MemberOverrideOptions = {},
): AgentConfigOverride | null => {
  if (!override) return null
  const effective = resolveMemberSettings(parent, override)
  const result: AgentConfigOverride = {}
  const sameModel = !options.pinnedModel
    && effective.runtimeKind === parent.runtimeKind && effective.llmModelIdentifier === parent.llmModelIdentifier
  if (!sameModel) {
    if (options.pinnedModel || effective.runtimeKind !== parent.runtimeKind) result.runtimeKind = effective.runtimeKind
    result.llmModelIdentifier = effective.llmModelIdentifier
    result.llmConfig = normalizeModelConfig(effective.llmConfig)
  } else if (!modelConfigsEqual(effective.llmConfig, parent.llmConfig)) {
    result.llmConfig = normalizeModelConfig(effective.llmConfig)
  }
  if (effective.autoExecuteTools !== parent.autoExecuteTools) result.autoExecuteTools = effective.autoExecuteTools
  return Object.keys(result).length ? result : null
}

/** Apply one drawer edit (never `workspace`; a placed team's workspace is kept separately). */
export const editMemberOverride = (
  current: AgentConfigOverride | null | undefined,
  parent: Settings,
  change: Exclude<RunMemberSettingChange, { field: 'workspace' }>,
  deps: MemberOverrideDeps,
  options: MemberOverrideOptions = {},
): AgentConfigOverride | null => {
  const effective = resolveMemberSettings(parent, current)
  let next: AgentConfigOverride = {
    runtimeKind: effective.runtimeKind,
    llmModelIdentifier: effective.llmModelIdentifier,
    llmConfig: effective.llmConfig,
    autoExecuteTools: effective.autoExecuteTools,
  }
  if (change.field === 'model') {
    next = withNewRuntimeOverridePolicy(current, {
      ...next,
      runtimeKind: change.choice.runtimeKind,
      llmModelIdentifier: change.choice.llmModelIdentifier,
      // Choosing another model resets thinking and the other settings to that model's defaults.
      llmConfig: deps.defaultConfigFor(change.choice),
    })!
  } else if (change.field === 'thinking') {
    next.llmConfig = change.llmConfig
  } else {
    next.autoExecuteTools = change.value
  }
  return normalizeMemberOverride(next, parent, options)
}

/**
 * Reset one field, one other model setting, or the whole member to the parent's value. Resetting
 * the model or the whole row releases a pin; the store drops it (see `releasesMemberPin`).
 */
export const resetMemberOverride = (
  current: AgentConfigOverride | null | undefined,
  parent: Settings,
  reset: RunMemberSettingReset,
  deps: MemberOverrideDeps,
  options: MemberOverrideOptions = {},
): AgentConfigOverride | null => {
  if (!current || reset.field === 'all') return null
  const effective = resolveMemberSettings(parent, current)
  const schema = deps.schemaFor(effective.runtimeKind, effective.llmModelIdentifier)
  let next: AgentConfigOverride = { ...current }
  if (reset.field === 'model') {
    delete next.runtimeKind
    delete next.llmModelIdentifier
    delete next.llmConfig
  } else if (reset.field === 'thinking') {
    // Thinking returns to the parent's; the member's own other settings (e.g. Fast mode) stay.
    let config = withoutModelOptions(schema, parent.llmConfig)
    for (const [key, value] of Object.entries(onlyModelOptions(schema, effective.llmConfig) ?? {})) {
      config = applyModelOption(config, key, value)
    }
    next = { ...next, llmConfig: config }
  } else if (reset.field === 'option') {
    next = { ...next, llmConfig: applyModelOption(effective.llmConfig, reset.key, parent.llmConfig?.[reset.key]) }
  } else if (reset.field === 'approval') {
    delete next.autoExecuteTools
  }
  return normalizeMemberOverride(next, parent, releasesMemberPin(reset) ? {} : options)
}

/** A row's model reset or row reset makes a seeded row follow its parent again (REQ-010). */
export const releasesMemberPin = (reset: RunMemberSettingReset): boolean => reset.field === 'model' || reset.field === 'all'

