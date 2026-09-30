<template>
  <div class="flex-1 overflow-y-auto px-4 py-4" data-test="draft-run-config-editor">
    <AgentRunConfigForm
      v-if="context"
      :key="context.state.runId"
      :config="context.config"
      :agent-definition="agentDefinition"
      :workspace-loading-state="workspaceLoadingState"
      :workspace-selection="workspaceSelection"
      workspace-locked
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AgentRunConfigForm from './AgentRunConfigForm.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'

/**
 * Run settings of a registered `temp-*` draft (a catalog "Run agent" draft, or a New chat whose
 * first send failed). The form edits `context.config` directly: runtime, model, thinking and
 * Auto approve tools. The workspace is shown and fixed. Nothing is saved to the server; the next
 * send uses the edited config (D-17, AR-011).
 */
const props = defineProps<{ context: AgentContext | null }>()

const definitionStore = useAgentDefinitionStore()
const workspaceStore = useWorkspaceStore()

const agentDefinition = computed(() => {
  const config = props.context?.config
  return (config && definitionStore.getAgentDefinitionById(config.agentDefinitionId))
    || { name: config?.agentDefinitionName ?? '' }
})

const workspacePath = computed(() => {
  const config = props.context?.config
  if (!config) return ''
  if (config.workspaceMetadata?.workspaceRootPath) return config.workspaceMetadata.workspaceRootPath
  const workspace = config.workspaceId ? workspaceStore.workspaces[config.workspaceId] : null
  return workspace?.absolutePath || workspace?.workspaceConfig?.root_path || workspace?.workspaceConfig?.rootPath || ''
})

const workspaceLoadingState = computed(() => ({ isLoading: false, error: null, loadedPath: workspacePath.value || null }))

// A known workspace is shown as the existing selection; otherwise its path is shown read-only.
const workspaceSelection = computed<WorkspaceSelectionState>(() => {
  const workspaceId = props.context?.config.workspaceId ?? null
  return workspaceId && workspaceStore.workspaces[workspaceId]
    ? { mode: 'existing', existingWorkspaceId: workspaceId, newWorkspacePath: workspacePath.value }
    : { mode: 'new', existingWorkspaceId: workspaceId, newWorkspacePath: workspacePath.value }
})
</script>
