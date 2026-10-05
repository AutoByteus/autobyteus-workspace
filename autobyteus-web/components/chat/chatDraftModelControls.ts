import { computed } from 'vue'
import { useChatDraftStore, type ChatModelSelection } from '~/stores/chatDraftStore'
import { useChatModelCatalog } from '~/composables/chat/useChatModelCatalog'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

/**
 * Model, thinking and other-model-setting controls of the New chat footer. They edit the chat
 * draft; after the first message a chat's model settings change only in its run settings (⚙).
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
  /** Thinking and the other model settings share the model config; each edit keeps the other's keys. */
  const selectModelConfig = (nextConfig: Record<string, unknown> | null) => chatDraftStore.setModelConfig(nextConfig)

  return { runtimeKind, llmModelIdentifier, llmConfig, modelLabel, thinkingSchema, selectModel, selectModelConfig }
}
