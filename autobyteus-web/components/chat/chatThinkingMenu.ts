import {
  applyThinkingParamChoice,
  applyThinkingToggle,
  getThinkingControlState,
  getThinkingDependentParamKeys,
  getThinkingParamKeys,
  getThinkingToggleOwnedParamKeys,
  hasThinkingSwitch,
} from '~/utils/llmThinkingConfigAdapter'
import { resolveEffectiveConfigValue, type UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Presentation model of the chat composer's thinking menu. It owns no thinking semantics: every
 * option carries the config it produces, computed through the thinking adapter.
 *
 * - `merged`: models with an on/off switch show one list, `Off` then each effort level (or `On`),
 *   with the other dependent settings (budget, display) below it.
 * - `parameters`: every other model shows one group per thinking parameter.
 */
type ThinkingConfig = Record<string, unknown>
type Translate = (key: string) => string

export type ChatThinkingOption = { id: string; label: string; checked: boolean; next: ThinkingConfig | null }
export type ChatThinkingParameter = {
  key: string
  label: string
  kind: 'choice' | 'number'
  options: ChatThinkingOption[]
  value: number | ''
  minimum: number | null
  maximum: number | null
  applyNumber: (value: number) => ThinkingConfig | null
}
export type ChatThinkingMenu =
  | { mode: 'hidden' }
  | { mode: 'merged'; title: string; primary: ChatThinkingOption[]; secondary: ChatThinkingParameter[]; summary: string; active: boolean }
  | { mode: 'parameters'; parameters: ChatThinkingParameter[]; summary: string; active: boolean }

const EFFORT_KEY = 'reasoning_effort'

export const humanizeThinkingValue = (value: string): string => {
  const text = value.replace(/[_-]+/g, ' ').trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text
}

const optionLabel = (value: unknown, t: Translate): string => {
  if (value === true) return t('chat.thinking.on')
  if (value === false) return t('chat.thinking.off')
  return humanizeThinkingValue(String(value))
}

/** One parameter group; `choose` produces the config for a picked value, `showSelection` hides checks. */
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
  const base = { key, label, value: '' as const, minimum: null, maximum: null, applyNumber: (entry: number) => choose(entry) }
  const choices = Array.isArray(param.enum) && param.enum.length
    ? param.enum
    : param.type === 'boolean' ? [true, false] : null
  if (choices) {
    const current = param.type === 'boolean' && !param.enum?.length ? value === true : value
    return {
      ...base,
      kind: 'choice',
      options: choices.map((entry) => ({
        id: String(entry),
        label: optionLabel(entry, t),
        checked: showSelection && Object.is(entry, current),
        next: choose(entry),
      })),
    }
  }
  if (param.type === 'integer' || param.type === 'number') {
    return {
      ...base,
      kind: 'number',
      options: [],
      value: showSelection && typeof value === 'number' ? value : '',
      minimum: param.minimum ?? null,
      maximum: param.maximum ?? null,
    }
  }
  return null
}

const buildMergedMenu = (
  schema: UiModelConfigSchema,
  config: ThinkingConfig | null,
  t: Translate,
): ChatThinkingMenu => {
  const state = getThinkingControlState(schema, config)
  const dependentKeys = getThinkingDependentParamKeys(schema)
  const effortParam = schema[EFFORT_KEY]
  const effortLevels = dependentKeys.includes(EFFORT_KEY) && Array.isArray(effortParam?.enum) && effortParam.enum.length
    ? effortParam.enum
    : null
  const effectiveEffort = effortLevels && effortParam ? resolveEffectiveConfigValue(effortParam, config?.[EFFORT_KEY]) : undefined

  const off: ChatThinkingOption = { id: 'off', label: t('chat.thinking.off'), checked: !state.enabled, next: applyThinkingToggle(schema, false, config) }
  const levels: ChatThinkingOption[] = effortLevels
    ? effortLevels.map((level) => ({
      id: String(level),
      label: optionLabel(level, t),
      checked: state.enabled && Object.is(effectiveEffort, level),
      next: applyThinkingParamChoice(schema, config, EFFORT_KEY, level),
    }))
    : [{ id: 'on', label: t('chat.thinking.on'), checked: state.enabled, next: applyThinkingToggle(schema, true, config) }]

  const secondary = dependentKeys
    .filter((key) => !(effortLevels && key === EFFORT_KEY))
    .map((key) => buildParameter(schema, config, key, t, (value) => applyThinkingParamChoice(schema, config, key, value), state.enabled))
    .filter((parameter): parameter is ChatThinkingParameter => parameter !== null)

  let summary = t('chat.thinking.on')
  if (!state.enabled) summary = t('chat.thinking.off')
  else if (effortLevels && effectiveEffort !== undefined) summary = optionLabel(effectiveEffort, t)

  return { mode: 'merged', title: t('chat.thinking.title'), primary: [off, ...levels], secondary, summary, active: state.enabled }
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

  const primary = parameters.find((parameter) => parameter.kind === 'choice')
  const primaryChecked = primary?.options.find((option) => option.checked)
  let summary = t('chat.thinking.title')
  if (primary) summary = primaryChecked ? primaryChecked.label : t('chat.thinking.default')

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
