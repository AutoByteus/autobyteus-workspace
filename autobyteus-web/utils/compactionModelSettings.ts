export const COMPACTION_MODEL_SETTINGS_KEY = 'AUTOBYTEUS_COMPACTION_MODEL_SETTINGS'
export type CompactionModelSettings = { modelIdentifier: string | null; llmConfig: Record<string, unknown> | null }
export const parseCompactionModelSettings = (value: string | undefined): CompactionModelSettings | null => {
  if (value === undefined) return { modelIdentifier: null, llmConfig: null }
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      !(parsed.modelIdentifier === null || typeof parsed.modelIdentifier === 'string' && parsed.modelIdentifier.trim()) ||
      !(parsed.llmConfig === null || typeof parsed.llmConfig === 'object' && !Array.isArray(parsed.llmConfig))) return null
    return { modelIdentifier: parsed.modelIdentifier, llmConfig: parsed.llmConfig }
  } catch { return null }
}
