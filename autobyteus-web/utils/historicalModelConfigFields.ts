import {
  isModelConfigValueRepresentable,
  type UiModelConfigParameterSchema,
  type UiModelConfigSchema,
} from './llmConfigSchema'

export type HistoricalModelConfigControlField = Readonly<{
  kind: 'current_control'
  key: string
  schema: UiModelConfigParameterSchema
  hasExplicitStoredValue: boolean
  storedValue?: unknown
}>

export type HistoricalModelConfigResidualField = Readonly<{
  kind: 'historical_residual'
  key: string
  exactStoredValue: unknown
  reason: 'removed_key' | 'value_not_representable'
}>

export type HistoricalModelConfigField =
  | HistoricalModelConfigControlField
  | HistoricalModelConfigResidualField

const hasOwn = (value: Readonly<Record<string, unknown>>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const canCurrentControlRepresent = (
  value: unknown,
  schema: UiModelConfigParameterSchema,
): boolean => {
  const representationSchema = { ...schema, minimum: null, maximum: null, pattern: null }
  if (!isModelConfigValueRepresentable(value, representationSchema)) return false
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return true
  if (['boolean', 'string', 'integer', 'number'].includes(schema.type ?? '')) return true
  return typeof value === 'string'
}

export const projectHistoricalModelConfigFields = (
  storedConfig: Readonly<Record<string, unknown>> | null | undefined,
  currentSchema: UiModelConfigSchema | null | undefined,
): readonly HistoricalModelConfigField[] => {
  const config = storedConfig ?? {}
  const schema = currentSchema ?? {}
  const fields: HistoricalModelConfigField[] = []

  for (const [key, parameterSchema] of Object.entries(schema)) {
    if (!hasOwn(config, key)) {
      fields.push(Object.freeze({
        kind: 'current_control' as const,
        key,
        schema: parameterSchema,
        hasExplicitStoredValue: false,
      }))
      continue
    }

    const storedValue = config[key]
    if (canCurrentControlRepresent(storedValue, parameterSchema)) {
      fields.push(Object.freeze({
        kind: 'current_control' as const,
        key,
        schema: parameterSchema,
        hasExplicitStoredValue: true,
        storedValue,
      }))
      continue
    }

    fields.push(Object.freeze({
      kind: 'historical_residual' as const,
      key,
      exactStoredValue: storedValue,
      reason: 'value_not_representable' as const,
    }))
  }

  for (const key of Object.keys(config).filter((key) => !hasOwn(schema, key)).sort()) {
    fields.push(Object.freeze({
      kind: 'historical_residual' as const,
      key,
      exactStoredValue: config[key],
      reason: 'removed_key' as const,
    }))
  }

  return Object.freeze(fields)
}
