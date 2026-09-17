<template>
  <div
    class="flex h-full min-h-0 flex-col bg-white"
    data-test="agent-org-member-run-config"
    :data-org-run-id="target.root.orgRunId"
    :data-member-address="target.address"
    :data-agent-run-id="target.context.state.runId"
  >
    <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
      <h3 class="truncate text-sm font-semibold text-gray-800">
        {{ t('workspace.components.workspace.config.RunConfigPanel.title.agentConfiguration') }}
      </h3>
      <button
        type="button"
        data-test="agent-org-config-back-to-events"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        :title="t('workspace.components.workspace.config.RunConfigPanel.return_to_event_view')"
        :aria-label="t('workspace.components.workspace.config.RunConfigPanel.back_to_event_view')"
        @click="$emit('back')"
      >
        <svg
          aria-hidden="true"
          class="h-4 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <p v-if="editor.loading.value" role="status">{{ t('workspace.runModelConfig.loading') }}</p>
      <AgentRunConfigForm
        v-if="!editor.configured.value || editor.canonical.value"
        :key="formKey"
        :config="formConfig"
        :agent-definition="agentDefinition"
        :workspace-loading-state="workspaceLoadingState"
        :workspace-selection="workspaceSelection"
        :workspace-locked="true"
        :runtime-locked="true"
        :existing-run="true"
        :original-model-identifier="editor.canonical.value?.launchConfiguration.llmModelIdentifier || formConfig.llmModelIdentifier"
        :existing-model-config-editable="editor.editable.value"
        :existing-model-config-reason="editor.refreshRequired.value ? 'REFRESH_REQUIRED' : editor.canonical.value?.editability.reason"
        :saving="editor.saving.value || editor.loading.value"
        :model-options="editor.options.value"
        :model-config-field-errors="modelFieldErrors"
        @selection-change="selectionHandler"
        @schema-state="schemaHandler"
      />
      <p v-if="ownershipLocked" role="status" class="mt-3 text-sm text-amber-700">{{ t('workspace.runModelConfig.orgOwnershipUnavailable') }}</p>
      <ul v-if="editor.fieldErrors.value.length" role="alert" class="mt-3 text-sm text-red-700">
        <li v-for="error in editor.fieldErrors.value" :key="error.path">{{ error.path }}: {{ error.message }}</li>
      </ul>
    </div>
    <div v-if="editor.configured.value" class="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <p v-if="editor.feedback.value" role="status" aria-live="polite" class="mb-2 text-sm">{{ editor.feedback.value }}</p>
      <button v-if="editor.refreshRequired.value" type="button" data-test="refresh-org-model-config" class="mb-2 w-full rounded border px-4 py-2 text-indigo-700" :disabled="editor.loading.value || editor.saving.value" @click="editor.load">{{ t('workspace.runModelConfig.retry') }}</button>
      <button type="button" data-test="save-org-model-config" class="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="!editor.canSave.value" @click="editor.save">{{ t(editor.saving.value ? 'workspace.runModelConfig.saving' : 'workspace.runModelConfig.save') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useAgentOrgMemberModelConfig } from '~/composables/useAgentOrgMemberModelConfig'
import AgentRunConfigForm from '~/components/workspace/config/AgentRunConfigForm.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

type AgentOrgMemberTarget = Extract<ActiveAgentWorkspaceTarget,
  { kind: 'agent_org_direct_agent' | 'agent_org_team_member' | 'agent_org_task_agent' | 'agent_org_task_team_member' }>

const props = defineProps<{ target: AgentOrgMemberTarget }>()
defineEmits<{ (event: 'back'): void }>()

const { t } = useLocalization()
const editor = useAgentOrgMemberModelConfig(toRef(props, 'target'))
const ownershipLocked = computed(() => editor.canonical.value?.editability.reason === 'OWNERSHIP_UNAVAILABLE')
const formKey = computed(() => `${props.target.root.orgRunId}:${props.target.context.state.runId}:${editor.selection.value?.llmModelIdentifier || ''}:${editor.formGeneration.value}`)
// The form is keyed on selected identity/model; retired schema callbacks cannot unlock a new draft.
const selectionHandler = computed(() => {
  const key = formKey.value
  return (value: Parameters<typeof editor.updateSelection>[0]) => { if (formKey.value === key) editor.updateSelection(value) }
})
const schemaHandler = computed(() => {
  const key = formKey.value
  return (value: Parameters<typeof editor.setSchema>[0]) => { if (formKey.value === key) editor.setSchema(value) }
})
const modelFieldErrors = computed(() => Object.fromEntries(editor.fieldErrors.value.flatMap(error => {
  const match = /^llmConfig\.([^.[]+)/.exec(error.path)
  return match ? [[match[1]!, error.message]] : []
})))
const formConfig = computed<AgentRunConfig>(() => ({
  ...props.target.context.config,
  ...(editor.canonical.value ? { ...editor.canonical.value.launchConfiguration } : {}),
  ...(editor.selection.value || {}),
  isLocked: true,
}))
const agentDefinition = computed(() => ({
  name: props.target.context.config.agentDefinitionName
    || props.target.address.split('/').filter(Boolean).at(-1)
    || props.target.address,
}))
const workspaceSelection = computed<WorkspaceSelectionState>(() => ({
  mode: 'existing',
  existingWorkspaceId: props.target.context.config.workspaceId,
  newWorkspacePath: props.target.context.config.workspaceMetadata?.workspaceRootPath ?? '',
}))
const workspaceLoadingState = computed(() => ({
  isLoading: false,
  error: null,
  loadedPath: props.target.context.config.workspaceMetadata?.workspaceRootPath ?? null,
}))
</script>
