import { watch } from 'vue'
import { useChatModelCatalog } from '~/composables/chat/useChatModelCatalog'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { runtimeShortLabel } from '~/utils/chat/chatDefaults'

/** A model named with its runtime, as the model menu names it: "claude-sonnet-5-5" and "Claude SDK". */
export type ModelWithRuntime = Readonly<{ model: string; runtime: string }>

/**
 * The app's names on the Model Routing page (autobyteus-313 REQ-004): a runtime on its own by its full name
 * (`runtimeKindToLabel`, "Claude Agent SDK"), a model with its runtime as the model menu shows it (the catalog's model
 * label and `runtimeShortLabel`). The catalogs of the runtimes a view shows load on demand; until one has loaded its
 * models read as their IDs, as in the menu.
 */
export function useModelRoutingNames(runtimesShown: () => readonly string[]) {
  const catalog = useChatModelCatalog()
  const requested = new Set<string>()
  watch(runtimesShown, (runtimes) => {
    for (const runtime of runtimes) {
      if (!runtime || requested.has(runtime)) continue
      requested.add(runtime)
      catalog.ensureCatalog(runtime)
    }
  }, { immediate: true })

  const runtimeName = (runtimeKind: string): string => runtimeKindToLabel(runtimeKind)
  const modelLabel = (runtimeKind: string, llmModelIdentifier: string): string => catalog.modelLabel(runtimeKind, llmModelIdentifier)
  const modelWithRuntime = (runtimeKind: string, llmModelIdentifier: string): ModelWithRuntime =>
    ({ model: modelLabel(runtimeKind, llmModelIdentifier), runtime: runtimeShortLabel(runtimeKind) })
  const modelWithRuntimeText = (runtimeKind: string, llmModelIdentifier: string): string => {
    const named = modelWithRuntime(runtimeKind, llmModelIdentifier)
    return `${named.model} ${named.runtime}`
  }
  /** A model of the Runtimes tab's report: the catalog's label when the catalog has it, else the report's name. */
  const reportedModelName = (runtimeKind: string, model: Readonly<{ id: string; name: string }>): string =>
    catalog.findModel(runtimeKind, model.id)?.label ?? model.name

  return { runtimeName, modelLabel, modelWithRuntime, modelWithRuntimeText, reportedModelName }
}
