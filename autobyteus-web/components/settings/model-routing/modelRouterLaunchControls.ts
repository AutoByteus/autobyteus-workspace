import { computed, watch, type Ref } from 'vue'
import { useChatModelCatalog } from '~/composables/chat/useChatModelCatalog'
import type { ChatModelSelection } from '~/stores/chatDraftStore'
import type { ModelRouterLaunch, ModelRoutingStatus } from '~/types/modelRouting'
import { explicitChatModelConfig } from '~/utils/runSettings/explicitModelConfig'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * The Model Router's launch on Configuration with the app's launch controls (autobyteus-313 REQ-001, REQ-002): the
 * same model menu, thinking control and model-option controls as the composer (`chatDraftModelControls.ts`), over the
 * node's stored router launch. A model choice saves its settings made explicit, as `chatDraftStore.setModel` does;
 * thinking and option changes save the launch with the new settings. The page keeps no launch logic of its own.
 */
export function useModelRouterLaunchControls(
  status: Ref<ModelRoutingStatus | null>,
  save: (launch: ModelRouterLaunch) => void,
) {
  const catalog = useChatModelCatalog()

  const launch = computed(() => status.value?.routerLaunch ?? null)
  const runtimeKind = computed(() => launch.value?.runtimeKind ?? '')
  const llmModelIdentifier = computed(() => launch.value?.llmModelIdentifier ?? '')
  const llmConfig = computed<Record<string, unknown> | null>(() => (launch.value?.llmConfig ? { ...launch.value.llmConfig } : null))
  // The saved model's label and settings come from its runtime's catalog.
  watch(runtimeKind, (kind) => { if (kind) catalog.ensureCatalog(kind) }, { immediate: true })
  const modelLabel = computed(() => (llmModelIdentifier.value ? catalog.modelLabel(runtimeKind.value, llmModelIdentifier.value) : ''))
  // No launch yet (the router is not set): no schema to read (the catalog needs a runtime).
  const thinkingSchema = computed<UiModelConfigSchema | null>(() => (runtimeKind.value && llmModelIdentifier.value
    ? catalog.schemaFor(runtimeKind.value, llmModelIdentifier.value) : null))

  const selectModel = (selection: ChatModelSelection): void => save({
    runtimeKind: selection.runtimeKind,
    llmModelIdentifier: selection.llmModelIdentifier,
    llmConfig: explicitChatModelConfig(catalog.schemaFor(selection.runtimeKind, selection.llmModelIdentifier), null),
  })
  /** Thinking and the other model settings share the model config; each edit keeps the other's keys. */
  const selectModelConfig = (nextConfig: Record<string, unknown> | null): void => {
    if (!launch.value) return
    save({ runtimeKind: launch.value.runtimeKind, llmModelIdentifier: launch.value.llmModelIdentifier, llmConfig: nextConfig })
  }

  return { runtimeKind, llmModelIdentifier, llmConfig, modelLabel, thinkingSchema, selectModel, selectModelConfig }
}
