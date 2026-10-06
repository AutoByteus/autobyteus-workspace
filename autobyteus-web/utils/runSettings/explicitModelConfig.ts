import { applyModelConfigSchemaDefaults, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { getDefaultThinkingConfig, getThinkingParamKeys } from '~/utils/llmThinkingConfigAdapter'

/**
 * The model config a start surface records for a model (D-18, IC-3): the non-thinking schema
 * defaults plus the model's default thinking parameters, written explicitly, over any preset config
 * (a definition's default launch config keeps its own values). A model without a config schema
 * records the preset. Used by both draft owners (New chat and the Org launch page).
 */
export const explicitChatModelConfig = (
  schema: UiModelConfigSchema | null,
  preset: Record<string, unknown> | null = null,
): Record<string, unknown> | null => {
  if (!schema || Object.keys(schema).length === 0) return preset
  const next: Record<string, unknown> = { ...(applyModelConfigSchemaDefaults(schema, preset) ?? {}) }
  // A preset that already chose thinking keeps its choice; otherwise record the default thinking.
  if (!getThinkingParamKeys(schema).some((key) => next[key] !== undefined)) {
    Object.assign(next, getDefaultThinkingConfig(schema))
  }
  return Object.keys(next).length > 0 ? next : preset
}
