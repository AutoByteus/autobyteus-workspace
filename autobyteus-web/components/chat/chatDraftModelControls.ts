import { computed } from 'vue'
import { useChatDraftStore, type ChatModelSelection } from '~/stores/chatDraftStore'
import { useChatModelCatalog } from '~/composables/chat/useChatModelCatalog'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Model and thinking controls of the New chat footer. They edit the chat draft; after the first
 * message a chat's model and thinking change only in its run settings (⚙), like any agent run.
 */
export function useChatDraftModelControls() {
  const chatDraftStore = useChatDraftStore()
  const catalog = useChatModelCatalog()

  const config = computed(() => chatDraftStore.draft?.context.config ?? null)
  const runtimeKind = computed(() => config.value?.runtimeKind ?? '')
  const llmModelIdentifier = computed(() => config.value?.llmModelIdentifier ?? '')
  const llmConfig = computed(() => config.value?.llmConfig ?? null)
  const modelLabel = computed(() => catalog.modelLabel(runtimeKind.value, llmModelIdentifier.value))
  const thinkingSchema = computed<UiModelConfigSchema | null>(() =>
    catalog.schemaFor(runtimeKind.value, llmModelIdentifier.value))

  const selectModel = (selection: ChatModelSelection) => chatDraftStore.setModel(selection)
  const selectThinking = (nextConfig: Record<string, unknown> | null) => chatDraftStore.setThinkingConfig(nextConfig)

  return { runtimeKind, llmModelIdentifier, llmConfig, modelLabel, thinkingSchema, selectModel, selectThinking }
}
