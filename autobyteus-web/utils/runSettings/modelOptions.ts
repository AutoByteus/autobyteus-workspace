import { getThinkingParamKeys, humanizeThinkingValue } from '~/utils/llmThinkingConfigAdapter'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * REQ-022: the selected model's **other model settings**, the config-schema parameters that are not
 * thinking settings (e.g. Codex Fast mode, `service_tier`). Each is its own small control next to
 * Thinking: a toggle when it is "Default or one value" (or a boolean), otherwise a menu. "Default"
 * leaves the parameter unset. Numeric parameters are not presented; a stored value is kept.
 */
type ModelConfig = Record<string, unknown>

export type ModelOptionLabels = Readonly<{ default: string; on: string; off: string }>

export type ModelOptionChoice = { id: string; label: string; value: unknown; checked: boolean }
export type ModelOption = {
  key: string
  /** From the schema title (e.g. "Fast mode"). */
  title: string
  kind: 'toggle' | 'choice'
  /** Toggle: the value set when on, and its label (e.g. "fast" → "Fast"). */
  onValue: unknown
  onLabel: string
  /** Whether a non-default value is set. */
  set: boolean
  /** The current value's label ("Default" when unset). */
  valueLabel: string
  choices: ModelOptionChoice[]
  icon: string
}

/** Known settings get a meaningful icon; the "on" state uses the `-solid` variant. */
const ICONS: Record<string, string> = { service_tier: 'heroicons:bolt' }
const DEFAULT_ICON = 'heroicons:adjustments-horizontal'

const labelOf = (value: unknown, labels: ModelOptionLabels): string => {
  if (value === true) return labels.on
  if (value === false) return labels.off
  return humanizeThinkingValue(String(value))
}

export const otherModelSettingKeys = (schema: UiModelConfigSchema | null | undefined): string[] => {
  if (!schema) return []
  const thinking = new Set(getThinkingParamKeys(schema))
  return Object.keys(schema).filter((key) => {
    if (thinking.has(key)) return false
    const param = schema[key]
    return Array.isArray(param?.enum) ? param.enum.length > 0 : param?.type === 'boolean'
  })
}

export const buildModelOptions = (
  schema: UiModelConfigSchema | null | undefined,
  config: ModelConfig | null | undefined,
  labels: ModelOptionLabels,
): ModelOption[] => otherModelSettingKeys(schema).map((key) => {
  const param = schema![key]!
  const values: unknown[] = Array.isArray(param.enum) && param.enum.length ? param.enum : [true]
  const current = config?.[key]
  const isSet = current !== undefined && current !== null && (param.type !== 'boolean' || current === true)
  const title = param.title?.trim() || humanizeThinkingValue(key)
  return {
    key,
    title,
    kind: values.length === 1 ? 'toggle' : 'choice',
    onValue: values[0],
    onLabel: param.type === 'boolean' ? title : labelOf(values[0], labels),
    set: isSet,
    valueLabel: isSet ? labelOf(current, labels) : labels.default,
    choices: [
      { id: 'default', label: labels.default, value: undefined, checked: !isSet },
      ...values.map((value) => ({ id: String(value), label: labelOf(value, labels), value, checked: isSet && Object.is(current, value) })),
    ],
    icon: ICONS[key] ?? DEFAULT_ICON,
  }
})

/** The config with one other setting set, or removed for "Default"/off. Thinking keys are kept. */
export const applyModelOption = (config: ModelConfig | null | undefined, key: string, value: unknown): ModelConfig | null => {
  const next: ModelConfig = { ...(config ?? {}) }
  if (value === undefined || value === null || value === false) delete next[key]
  else next[key] = value
  return Object.keys(next).length ? next : null
}

/** Labels of the other settings that are on, for one-line summaries (e.g. "Fast"). */
export const setModelOptionLabels = (options: readonly ModelOption[]): string[] =>
  options.filter((option) => option.set).map((option) => (option.kind === 'toggle' ? option.onLabel : `${option.title}: ${option.valueLabel}`))

/** The config without the other settings, to compare thinking alone. */
export const withoutModelOptions = (schema: UiModelConfigSchema | null | undefined, config: ModelConfig | null | undefined): ModelConfig | null => {
  if (!config) return null
  const next = { ...config }
  for (const key of otherModelSettingKeys(schema)) delete next[key]
  return Object.keys(next).length ? next : null
}

/** Only the other settings of a config, to compare them alone. */
export const onlyModelOptions = (schema: UiModelConfigSchema | null | undefined, config: ModelConfig | null | undefined): ModelConfig | null => {
  if (!config) return null
  const keys = new Set(otherModelSettingKeys(schema))
  const next = Object.fromEntries(Object.entries(config).filter(([key]) => keys.has(key)))
  return Object.keys(next).length ? next : null
}
