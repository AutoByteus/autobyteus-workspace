export const cloneExistingRunJsonValue = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(cloneExistingRunJsonValue) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, child]) => [key, cloneExistingRunJsonValue(child)]),
    ) as T
  }
  return value
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, canonicalize(child)]))
}

export const cloneExistingRunModelConfig = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => value ? cloneExistingRunJsonValue(value) : null

export const existingRunModelConfigsEqual = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
): boolean => JSON.stringify(canonicalize(left ?? null)) === JSON.stringify(canonicalize(right ?? null))
