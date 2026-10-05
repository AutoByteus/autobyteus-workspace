/**
 * REQ-021: the model a start surface opens with. Candidates are tried in order (a definition's
 * default launch config, then the last model used in chat, …); the first whose runtime is enabled
 * and whose model is in that runtime's catalog wins. Otherwise the default runtime's first model.
 * Pure: availability and catalogs are supplied by the caller.
 */
export type StartModelChoice = Readonly<{
  runtimeKind: string
  llmModelIdentifier: string
  /** The candidate's own model config (a definition default keeps its values); null otherwise. */
  llmConfig: Record<string, unknown> | null
}>

export type StartModelCandidate = Readonly<{
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
  llmConfig?: Record<string, unknown> | null
}>

export interface StartModelCatalog {
  ensureAvailability(): Promise<void>
  isRuntimeEnabled(runtimeKind: string): boolean
  ensureCatalog(runtimeKind: string): Promise<void>
  models(runtimeKind: string): readonly string[]
}

const usable = (candidate: StartModelCandidate | null | undefined): candidate is StartModelCandidate & {
  runtimeKind: string
  llmModelIdentifier: string
} => Boolean(candidate?.runtimeKind?.trim() && candidate.llmModelIdentifier?.trim())

export const resolveStartModel = async (
  candidates: readonly (StartModelCandidate | null | undefined)[],
  catalog: StartModelCatalog,
  defaultRuntimeKind: string,
): Promise<StartModelChoice | null> => {
  await catalog.ensureAvailability()
  for (const candidate of candidates) {
    if (!usable(candidate) || !catalog.isRuntimeEnabled(candidate.runtimeKind)) continue
    await catalog.ensureCatalog(candidate.runtimeKind)
    if (catalog.models(candidate.runtimeKind).includes(candidate.llmModelIdentifier)) {
      return {
        runtimeKind: candidate.runtimeKind,
        llmModelIdentifier: candidate.llmModelIdentifier,
        llmConfig: candidate.llmConfig ?? null,
      }
    }
  }
  await catalog.ensureCatalog(defaultRuntimeKind)
  const first = catalog.models(defaultRuntimeKind)[0]
  return first ? { runtimeKind: defaultRuntimeKind, llmModelIdentifier: first, llmConfig: null } : null
}
