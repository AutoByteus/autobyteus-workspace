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

/**
 * REQ-021 for Run, and for "+"/switcher starts without a usable copied model (New chat and the Org
 * launch page): the definition's default launch config (with its own model config), then the last
 * model used in chat.
 */
export const definitionStartOrder = (input: Readonly<{
  definitionDefaults: StartModelCandidate | null
  lastChatModel: StartModelCandidate | null
}>): readonly (StartModelCandidate | null)[] => [input.definitionDefaults, input.lastChatModel]

/**
 * The Chat nav's plain New chat: the last model used in chat (its model config is not kept), then
 * the default chat agent's default launch config.
 */
export const chatNavStartOrder = (input: Readonly<{
  lastChatModel: StartModelCandidate | null
  assistantDefaults: StartModelCandidate | null
}>): readonly (StartModelCandidate | null)[] => [
  input.lastChatModel ? { ...input.lastChatModel, llmConfig: null } : null,
  input.assistantDefaults,
]

/** Why a start candidate cannot be used: it names no runtime or model, its runtime is off, or its model is not offered. */
export type StartCandidateUnusableReason = 'incomplete' | 'runtime_unavailable' | 'model_unavailable'

export type StartCandidateVerdict =
  | Readonly<{ usable: true; choice: StartModelChoice }>
  | Readonly<{ usable: false; reason: StartCandidateUnusableReason }>

/**
 * The start-default usability rule (REQ-021): a candidate names both a runtime and a model, its
 * runtime is enabled and the model is in that runtime's catalog. Loads only that runtime's catalog.
 * The caller has awaited `catalog.ensureAvailability()`.
 */
export const usableStartCandidate = async (
  candidate: StartModelCandidate,
  catalog: StartModelCatalog,
): Promise<StartCandidateVerdict> => {
  const runtimeKind = candidate.runtimeKind ?? ''
  const llmModelIdentifier = candidate.llmModelIdentifier ?? ''
  if (!runtimeKind.trim() || !llmModelIdentifier.trim()) return { usable: false, reason: 'incomplete' }
  if (!catalog.isRuntimeEnabled(runtimeKind)) return { usable: false, reason: 'runtime_unavailable' }
  await catalog.ensureCatalog(runtimeKind)
  if (!catalog.models(runtimeKind).includes(llmModelIdentifier)) return { usable: false, reason: 'model_unavailable' }
  return { usable: true, choice: { runtimeKind, llmModelIdentifier, llmConfig: candidate.llmConfig ?? null } }
}

export const resolveStartModel = async (
  candidates: readonly (StartModelCandidate | null | undefined)[],
  catalog: StartModelCatalog,
  defaultRuntimeKind: string,
): Promise<StartModelChoice | null> => {
  await catalog.ensureAvailability()
  for (const candidate of candidates) {
    if (!candidate) continue
    const verdict = await usableStartCandidate(candidate, catalog)
    if (verdict.usable) return verdict.choice
  }
  await catalog.ensureCatalog(defaultRuntimeKind)
  const first = catalog.models(defaultRuntimeKind)[0]
  return first ? { runtimeKind: defaultRuntimeKind, llmModelIdentifier: first, llmConfig: null } : null
}

/**
 * A copied ("+") or carried (switcher) start keeps its settings as they are (REQ-013); it only loads
 * what they need to be shown and checked (CR-004): runtime availability, then the model catalog of
 * every enabled runtime the start uses (the root and each member's or team's own runtime). A
 * disabled runtime's catalog is not fetched; the shared readiness rule reports it.
 */
export const loadStartRuntimes = async (
  runtimeKinds: readonly (string | null | undefined)[],
  catalog: StartModelCatalog,
): Promise<void> => {
  await catalog.ensureAvailability()
  const used = [...new Set(runtimeKinds.map((runtimeKind) => runtimeKind?.trim() ?? '').filter(Boolean))]
  await Promise.all(used.filter((runtimeKind) => catalog.isRuntimeEnabled(runtimeKind))
    .map((runtimeKind) => catalog.ensureCatalog(runtimeKind)))
}
