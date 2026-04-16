export interface DefaultLaunchConfig {
  llmModelIdentifier?: string | null
  runtimeKind?: string | null
  llmConfig?: Record<string, unknown> | null
}

export interface EditableDefaultLaunchConfig {
  llmModelIdentifier: string
  runtimeKind: string
  llmConfig: Record<string, unknown> | null
}

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const normalizeModelConfigRecord = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  )
}

export const normalizeDefaultLaunchConfig = (
  value: DefaultLaunchConfig | EditableDefaultLaunchConfig | null | undefined,
): DefaultLaunchConfig | null => {
  if (!value) {
    return null
  }

  const llmModelIdentifier = normalizeOptionalString(value.llmModelIdentifier)
  const runtimeKind = normalizeOptionalString(value.runtimeKind)
  const llmConfig = normalizeModelConfigRecord(value.llmConfig)

  if (!llmModelIdentifier && !runtimeKind && !llmConfig) {
    return null
  }

  return {
    llmModelIdentifier,
    runtimeKind,
    llmConfig,
  }
}

export const hasMeaningfulDefaultLaunchConfig = (
  value: DefaultLaunchConfig | EditableDefaultLaunchConfig | null | undefined,
): boolean => normalizeDefaultLaunchConfig(value) !== null

export const toEditableDefaultLaunchConfig = (
  value: DefaultLaunchConfig | null | undefined,
): EditableDefaultLaunchConfig => ({
  llmModelIdentifier: normalizeOptionalString(value?.llmModelIdentifier) ?? '',
  runtimeKind: normalizeOptionalString(value?.runtimeKind) ?? '',
  llmConfig: normalizeModelConfigRecord(value?.llmConfig),
})

export const cloneEditableDefaultLaunchConfig = (
  value: EditableDefaultLaunchConfig,
): EditableDefaultLaunchConfig => ({
  llmModelIdentifier: value.llmModelIdentifier,
  runtimeKind: value.runtimeKind,
  llmConfig: normalizeModelConfigRecord(value.llmConfig),
})
