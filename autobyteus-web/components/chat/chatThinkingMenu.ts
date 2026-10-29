import {
  applyThinkingParamChoice,
  applyThinkingToggle,
  getThinkingControlState,
  getIndependentThinkingParamKeys,
  getThinkingDependentParamKeys,
  getThinkingParamKeys,
  getThinkingToggleOwnedParamKeys,
  hasThinkingSwitch,
  humanizeThinkingValue,
} from '~/utils/llmThinkingConfigAdapter'
import { resolveEffectiveConfigValue, type UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Presentation model of the chat composer's thinking menu. It owns no thinking semantics: every
 * option carries the config it produces, computed through the thinking adapter.
 *
 * - `merged`: models with an on/off switch show `Off`, then `On` or, when effort only applies with
 *   thinking on (typed switch), each effort level; then the settings that apply with thinking on
 *   and off (Claude effort, always checked); then the other settings that only apply while thinking
 *   is on (display).
 * - `parameters`: every other model shows one group per thinking parameter.
 */
type ThinkingConfig = Record<string, unknown>
type Translate = (key: string, params?: Record<string, string>) => string

const EFFORT_KEY = 'reasoning_effort'

export type ChatThinkingOption = { id: string; label: string; checked: boolean; next: ThinkingConfig | null }
export type ChatThinkingParameter = { key: string; label: string; options: ChatThinkingOption[] }
export type ChatThinkingMenu =
  | { mode: 'hidden' }
  | { mode: 'merged'; title: string; primary: ChatThinkingOption[]; secondary: ChatThinkingParameter[]; summary: string; active: boolean }
  | { mode: 'parameters'; parameters: ChatThinkingParameter[]; summary: string; active: boolean }

const optionLabel = (value: unknown, t: Translate): string => {
  if (value === true) return t('chat.thinking.on')
  if (value === false) return t('chat.thinking.off')
  return humanizeThinkingValue(String(value))
}

/** One choice group; `choose` produces the config for a picked value, `showSelection` hides checks. */
const buildParameter = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null,
  key: string,
  t: Translate,
  choose: (value: unknown) => ThinkingConfig | null,
  showSelection: boolean,
): ChatThinkingParameter | null => {
  const param = schema[key]
  if (!param) return null
  const value = resolveEffectiveConfigValue(param, config?.[key])
  const label = param.title?.trim() || humanizeThinkingValue(key)
  const choices = Array.isArray(param.enum) && param.enum.length
    ? param.enum
    : param.type === 'boolean' ? [true, false] : null
  if (!choices) return null
  const current = param.type === 'boolean' && !param.enum?.length ? value === true : value
  return {
    key,
    label,
    options: choices.map((entry) => ({
      id: String(entry),
      label: optionLabel(entry, t),
      checked: showSelection && Object.is(entry, current),
      next: choose(entry),
    })),
  }
}

const buildMergedMenu = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null,
  t: Translate,
): ChatThinkingMenu => {
  const state = getThinkingControlState(schema, config)
  const choose = (key: string) => (value: unknown) => applyThinkingParamChoice(schema, config, key, value)
  const dependentKeys = getThinkingDependentParamKeys(schema)
  // An effort that only applies with thinking on (typed switch) merges into the primary list.
  const effortParam = schema[EFFORT_KEY]
  const dependentEffortLevels = dependentKeys.includes(EFFORT_KEY) && Array.isArray(effortParam?.enum) && effortParam.enum.length
    ? effortParam.enum
    : null
  const dependentEffort = dependentEffortLevels && effortParam ? resolveEffectiveConfigValue(effortParam, config?.[EFFORT_KEY]) : undefined

  const off: ChatThinkingOption = { id: 'off', label: t('chat.thinking.off'), checked: !state.enabled, next: applyThinkingToggle(schema, false, config) }
  const onOptions: ChatThinkingOption[] = dependentEffortLevels
    ? dependentEffortLevels.map((level) => ({
      id: String(level),
      label: optionLabel(level, t),
      checked: state.enabled && Object.is(dependentEffort, level),
      next: choose(EFFORT_KEY)(level),
    }))
    : [{ id: 'on', label: t('chat.thinking.on'), checked: state.enabled, next: applyThinkingToggle(schema, true, config) }]

  const independent = getIndependentThinkingParamKeys(schema)
    .map((key) => buildParameter(schema, config, key, t, choose(key), true))
    .filter((parameter): parameter is ChatThinkingParameter => parameter !== null)
  const dependent = dependentKeys
    .filter((key) => !(dependentEffortLevels && key === EFFORT_KEY))
    .map((key) => buildParameter(schema, config, key, t, choose(key), state.enabled))
    .filter((parameter): parameter is ChatThinkingParameter => parameter !== null)

  const stateLabel = state.enabled ? t('chat.thinking.on') : t('chat.thinking.off')
  const independentEffort = independent[0]?.options.find((option) => option.checked)?.label
  let summary = stateLabel
  if (independentEffort) summary = t('chat.thinking.summaryWithEffort', { state: stateLabel, effort: independentEffort })
  else if (state.enabled && dependentEffort !== undefined) summary = optionLabel(dependentEffort, t)

  return {
    mode: 'merged',
    title: t('chat.thinking.title'),
    primary: [off, ...onOptions],
    secondary: [...independent, ...dependent],
    summary,
    active: state.enabled,
  }
}

const buildParametersMenu = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null,
  t: Translate,
): ChatThinkingMenu => {
  const toggleOwnedKeys = getThinkingToggleOwnedParamKeys(schema)
  const choose = (key: string) => (value: unknown) => (typeof value === 'boolean' && toggleOwnedKeys.includes(key)
    ? applyThinkingToggle(schema, value, config)
    : applyThinkingParamChoice(schema, config, key, value))
  const parameters = getThinkingParamKeys(schema)
    .map((key) => buildParameter(schema, config, key, t, choose(key), true))
    .filter((parameter): parameter is ChatThinkingParameter => parameter !== null)
  if (!parameters.length) return { mode: 'hidden' }

  const primaryChecked = parameters[0]!.options.find((option) => option.checked)
  const summary = primaryChecked ? primaryChecked.label : t('chat.thinking.default')

  return { mode: 'parameters', parameters, summary, active: getThinkingControlState(schema, config).enabled }
}

export const buildChatThinkingMenu = (
  schema: UiModelConfigSchema | null,
  config: ThinkingConfig | null | undefined,
  t: Translate,
): ChatThinkingMenu => {
  if (!schema || !getThinkingParamKeys(schema).length) return { mode: 'hidden' }
  return hasThinkingSwitch(schema)
    ? buildMergedMenu(schema, config ?? null, t)
    : buildParametersMenu(schema, config ?? null, t)
}
