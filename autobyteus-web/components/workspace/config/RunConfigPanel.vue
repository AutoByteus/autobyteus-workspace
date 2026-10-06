<template>
  <div class="flex h-full flex-col bg-white">
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
      <h3 class="truncate text-sm font-semibold text-gray-800">{{ configTitle }}</h3>
      <button
        type="button"
        data-test="run-config-back-to-events"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 transition-colors hover:bg-indigo-50"
        :title="$t('workspace.components.workspace.config.RunConfigPanel.return_to_event_view')"
        :aria-label="$t('workspace.components.workspace.config.RunConfigPanel.back_to_event_view')"
        @click="showConversationView"
      >
        <Icon icon="heroicons:arrow-long-left-20-solid" aria-hidden="true" class="h-4 w-5" />
      </button>
    </div>

    <ExistingRunConfigEditor :key="`existing:${selectionStore.selectedType}:${selectionStore.selectedRunId}`" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useExistingRunConfigStore } from '~/stores/existingRunConfigStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import ExistingRunConfigEditor from './ExistingRunConfigEditor.vue'

/**
 * The panel chrome around a selected saved run's settings (Edit Config). New runs start in New chat
 * and on the Org launch page, never here.
 */
const selectionStore = useAgentSelectionStore()
const existingRunConfigStore = useExistingRunConfigStore()
const workspaceCenterViewStore = useWorkspaceCenterViewStore()
const { t: $t } = useLocalization()

const configTitle = computed(() => {
  if (selectionStore.isAgentSelected) return $t('workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration')
  if (selectionStore.isTeamSelected) return $t('workspace.components.workspace.config.RunConfigPanel.title.teamConfiguration')
  return $t('workspace.components.workspace.config.RunConfigPanel.title.configuration')
})

const showConversationView = () => {
  existingRunConfigStore.clear()
  workspaceCenterViewStore.showChat()
}
</script>
