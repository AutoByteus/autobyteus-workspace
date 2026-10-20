<template>
  <form class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" data-testid="remote-collaboration-publish-form" @submit.prevent="save">
    <label v-if="!agent" class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">{{ t('settings.components.settings.RemoteCollaboration.published.agentLabel') }}</span>
      <select
        :value="draft.agentDefinitionId"
        class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        data-testid="remote-collaboration-publish-agent"
        @change="selectAgent(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>{{ t('settings.components.settings.RemoteCollaboration.published.agentPlaceholder') }}</option>
        <option v-for="definition in publishableDefinitions" :key="definition.id" :value="definition.id">{{ definition.name }}</option>
      </select>
    </label>
    <p v-else class="text-sm font-medium text-slate-900">{{ agent.definitionName ?? agent.agentDefinitionId }}</p>

    <RuntimeModelConfigFields
      :runtime-kind="draft.runtimeKind"
      :llm-model-identifier="draft.llmModelIdentifier"
      :llm-config="draft.llmConfig"
      :runtime-label="t('settings.components.settings.RemoteCollaboration.published.runtimeLabel')"
      :model-label="t('settings.components.settings.RemoteCollaboration.published.modelLabel')"
      id-prefix="remote-collaboration-publish"
      @update:runtime-kind="draft.runtimeKind = $event"
      @update:llm-model-identifier="draft.llmModelIdentifier = $event"
      @update:llm-config="draft.llmConfig = $event"
    />

    <div>
      <span class="mb-1 block text-sm font-medium text-slate-700">{{ t('settings.components.settings.RemoteCollaboration.published.workspaceLabel') }}</span>
      <ApplicationWorkspaceRootSelector
        v-model="draft.workspaceRootPath"
        :custom-path-help="t('settings.components.settings.RemoteCollaboration.published.workspaceHelp')"
      />
    </div>

    <label class="flex items-start gap-2">
      <input v-model="draft.autoExecuteTools" type="checkbox" class="mt-1" data-testid="remote-collaboration-publish-auto-approve">
      <span>
        <span class="block text-sm font-medium text-slate-700">{{ t('settings.components.settings.RemoteCollaboration.published.autoApproveLabel') }}</span>
        <span class="block text-xs text-slate-500">{{ t('settings.components.settings.RemoteCollaboration.published.autoApproveHelp') }}</span>
      </span>
    </label>

    <div class="flex gap-2">
      <button
        type="submit"
        class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        :disabled="!canSave"
        data-testid="remote-collaboration-publish-save"
      >
        {{ agent ? t('settings.components.settings.RemoteCollaboration.save') : t('settings.components.settings.RemoteCollaboration.published.publishSubmit') }}
      </button>
      <button type="button" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="emit('close')">
        {{ t('settings.components.settings.RemoteCollaboration.cancel') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import ApplicationWorkspaceRootSelector from '~/components/applications/setup/ApplicationWorkspaceRootSelector.vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useRemoteCollaborationStore, type PublishedAgent } from '~/stores/remoteCollaborationStore'
import { normalizeDefinitionOwnershipScope } from '~/utils/definitionOwnership'

const props = defineProps<{
  /** The published Agent to update; `null` to publish a new one. */
  agent: PublishedAgent | null
  publishedIds: readonly string[]
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { t } = useLocalization()
const store = useRemoteCollaborationStore()
const definitionStore = useAgentDefinitionStore()

const draft = reactive({
  agentDefinitionId: props.agent?.agentDefinitionId ?? '',
  runtimeKind: props.agent?.runtimeKind ?? '',
  llmModelIdentifier: props.agent?.llmModelIdentifier ?? '',
  llmConfig: (props.agent?.llmConfig ?? null) as Record<string, unknown> | null,
  workspaceRootPath: props.agent?.workspaceRootPath ?? '',
  // Off unless the owner turns it on (DEC-102): tool approvals then wait in this node's run view.
  autoExecuteTools: props.agent?.autoExecuteTools ?? false,
})

/** Shared Agent definitions not published yet (the server refuses anything else). */
const publishableDefinitions = computed(() => definitionStore.agentDefinitions
  .filter((definition) => normalizeDefinitionOwnershipScope(definition) === 'SHARED' && !props.publishedIds.includes(definition.id)))

const canSave = computed(() => !store.saving && Boolean(draft.agentDefinitionId && draft.runtimeKind
  && draft.llmModelIdentifier.trim() && draft.workspaceRootPath.trim()))

/** A newly selected Agent starts from its definition's default runtime and model (REQ-103). */
const selectAgent = (agentDefinitionId: string): void => {
  draft.agentDefinitionId = agentDefinitionId
  const defaults = definitionStore.agentDefinitions.find((definition) => definition.id === agentDefinitionId)?.defaultLaunchConfig
  draft.runtimeKind = defaults?.runtimeKind ?? ''
  draft.llmModelIdentifier = defaults?.llmModelIdentifier ?? ''
  draft.llmConfig = defaults?.llmConfig ?? null
}

const save = async (): Promise<void> => {
  if (!canSave.value) return
  const input = {
    agentDefinitionId: draft.agentDefinitionId,
    runtimeKind: draft.runtimeKind,
    llmModelIdentifier: draft.llmModelIdentifier.trim(),
    llmConfig: draft.llmConfig,
    workspaceRootPath: draft.workspaceRootPath.trim(),
    autoExecuteTools: draft.autoExecuteTools,
  }
  const saved = props.agent ? await store.updatePublishedAgent(input) : await store.publishAgent(input)
  if (saved) emit('close')
}

onMounted(() => { void definitionStore.fetchAllAgentDefinitions().catch(() => undefined) })
</script>
