import { computed, watch, type Ref } from 'vue'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useChatDraftStore, type ChatModelSelection } from '~/stores/chatDraftStore'
import { useToasts } from '~/composables/useToasts'
import { useChatModelCatalog, type ChatModelGroup } from '~/composables/chat/useChatModelCatalog'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { normalizeModelConfigSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { isTemporaryRunId } from '~/utils/chat/chatDefaults'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'

const t = (key: string): string => localizationRuntime.translate(key)

/**
 * - `draft`: a `temp-*` context (the New chat draft or a registered pre-first-send draft).
 *   The footer edits `context.config` directly and the runtime can be chosen.
 * - `persisted`: any permanent run id. Edits go through `existingRunConfigStore`; locked while
 *   the run is live, and limited to the run's runtime when Offline.
 */
export type ChatFooterModelMode = 'draft' | 'persisted'

/** Models of the run's own runtime, for the runtime-fixed menu of a persisted run. */
export interface ChatFixedModelList {
  status: 'loading' | 'ready' | 'unavailable'
  groups: ChatModelGroup[]
}

const LIVE_STATUSES = new Set<string>([AgentStatus.Running, AgentStatus.Idle, AgentStatus.Initializing])

/**
 * Footer model and thinking controls for a chat context (D-08). The mode is chosen by the
 * run id, never by `config.isLocked`: Offline runs reopened from history have
 * `isLocked === false`, so the lock flag cannot tell a draft from a persisted run.
 */
export function useChatRunModelControls(context: Ref<AgentContext | null>) {
  const existingRunConfigStore = useExistingRunConfigStore()
  const chatDraftStore = useChatDraftStore()
  const catalog = useChatModelCatalog()

  const runId = computed(() => context.value?.state.runId ?? null)
  const mode = computed<ChatFooterModelMode>(() => (isTemporaryRunId(runId.value) ? 'draft' : 'persisted'))
  const runtimeKind = computed(() => context.value?.config.runtimeKind ?? '')
  const llmModelIdentifier = computed(() => context.value?.config.llmModelIdentifier ?? '')
  const llmConfig = computed(() => context.value?.config.llmConfig ?? null)

  const isLive = computed(() => LIVE_STATUSES.has(String(context.value?.state.currentStatus ?? '')))
  const persistedDraft = computed(() => {
    const draft = existingRunConfigStore.draft
    return draft?.kind === 'agent' && draft.runId === runId.value ? draft : null
  })

  const lockedReason = computed<string | null>(() => {
    if (mode.value === 'draft') return null
    if (isLive.value) return t('chat.footer.lockedWhileLive')
    const draft = persistedDraft.value
    if (!draft) return existingRunConfigStore.loadingCanonical ? t('chat.footer.loadingRunSettings') : null
    if (draft.isActive) return t('chat.footer.lockedWhileLive')
    if (!draft.editability.editable) return draft.editability.reason || t('chat.footer.notEditable')
    return null
  })

  // Load the canonical run config whenever a persisted run is (or becomes) Offline and the
  // shared store does not already hold this run (another surface may have loaded its own).
  // A failed load is not retried automatically; a successful load or a live phase re-arms it.
  let attemptedRunId: string | null = null
  watch(
    () => (mode.value === 'persisted' && !isLive.value && !persistedDraft.value
      && !existingRunConfigStore.loadingCanonical ? runId.value : null),
    (offlineRunId) => {
      if (!offlineRunId || offlineRunId === attemptedRunId) return
      attemptedRunId = offlineRunId
      void existingRunConfigStore.loadAgentCanonical(offlineRunId)
    },
    { immediate: true },
  )
  watch([persistedDraft, isLive], ([draft, live]) => {
    if (draft || live) attemptedRunId = null
  })

  // The thinking schema of a persisted run falls back to its runtime catalog (always for a live
  // run, whose canonical config is not loaded). Load that catalog when nothing has requested it
  // yet, so a live run opened fresh still shows its locked thinking control (CR-002). Only an
  // `idle` catalog is requested: a failed load is not retried here.
  watch(
    () => (mode.value === 'persisted' ? runtimeKind.value : ''),
    (kind) => {
      if (kind && catalog.catalogState(kind) === 'idle') catalog.ensureCatalog(kind)
    },
    { immediate: true },
  )

  const fixedModels = computed<ChatFixedModelList>(() => {
    const state = existingRunConfigStore.modelOptionsByAddress['/']
    if (!persistedDraft.value || !state || state.status === 'loading') return { status: 'loading', groups: [] }
    if (state.status !== 'ready' || !state.options) return { status: 'unavailable', groups: [] }
    const choices = [
      ...(state.options.currentModel ? [state.options.currentModel] : []),
      ...state.options.replacements,
    ]
    const groups = new Map<string, ChatModelGroup>()
    for (const choice of choices) {
      const group = groups.get(choice.providerName) ?? { providerName: choice.providerName, models: [] }
      if (!group.models.some((model) => model.llmModelIdentifier === choice.llmModelIdentifier)) {
        group.models.push({
          runtimeKind: runtimeKind.value,
          llmModelIdentifier: choice.llmModelIdentifier,
          name: choice.llmModelIdentifier,
          title: choice.displayName && choice.displayName !== choice.llmModelIdentifier ? choice.displayName : null,
          providerName: choice.providerName,
          description: choice.description,
        })
      }
      groups.set(choice.providerName, group)
    }
    return { status: 'ready', groups: [...groups.values()] }
  })

  const modelLabel = computed(() => {
    if (mode.value === 'persisted') {
      const match = fixedModels.value.groups.flatMap((group) => group.models)
        .find((model) => model.llmModelIdentifier === llmModelIdentifier.value)
      if (match) return match.name
    }
    return catalog.modelLabel(runtimeKind.value, llmModelIdentifier.value)
  })

  const thinkingSchema = computed<UiModelConfigSchema | null>(() => {
    if (mode.value === 'persisted') {
      const state = existingRunConfigStore.modelOptionsByAddress['/']
      const choices = state?.options ? [state.options.currentModel, ...state.options.replacements] : []
      const choice = choices.find((entry) => entry?.llmModelIdentifier === llmModelIdentifier.value)
      if (choice?.configSchema) return normalizeModelConfigSchema(choice.configSchema)
    }
    return catalog.schemaFor(runtimeKind.value, llmModelIdentifier.value)
  })

  const savePersisted = async (selection: { llmModelIdentifier: string; llmConfig: Record<string, unknown> | null }) => {
    const id = runId.value
    if (!id || lockedReason.value) return
    existingRunConfigStore.updateAgentModelConfig(selection)
    existingRunConfigStore.setSchemaState('/', { status: 'ready', message: null })
    const saved = await existingRunConfigStore.save()
    if (!saved && existingRunConfigStore.feedback?.kind === 'error') {
      useToasts().addToast(existingRunConfigStore.feedback.message, 'error')
    }
  }

  const selectModel = async (selection: ChatModelSelection) => {
    const current = context.value
    if (!current || lockedReason.value) return
    if (mode.value === 'draft') {
      if (chatDraftStore.draft?.context === current) {
        chatDraftStore.setModel(selection)
        return
      }
      current.config.runtimeKind = selection.runtimeKind
      current.config.llmModelIdentifier = selection.llmModelIdentifier
      // Choosing a model applies that model's default thinking.
      current.config.llmConfig = null
      return
    }
    // The runtime of a persisted run never changes.
    await savePersisted({ llmModelIdentifier: selection.llmModelIdentifier, llmConfig: null })
  }

  const selectThinking = async (nextConfig: Record<string, unknown> | null) => {
    const current = context.value
    if (!current || lockedReason.value) return
    if (mode.value === 'draft') {
      if (chatDraftStore.draft?.context === current) {
        chatDraftStore.setThinkingConfig(nextConfig)
        return
      }
      current.config.llmConfig = nextConfig
      return
    }
    await savePersisted({ llmModelIdentifier: current.config.llmModelIdentifier, llmConfig: nextConfig })
  }

  return {
    mode,
    runtimeKind,
    llmModelIdentifier,
    llmConfig,
    lockedReason,
    fixedModels,
    modelLabel,
    thinkingSchema,
    selectModel,
    selectThinking,
  }
}
