<template>
  <AgentWorkspaceSurface
    v-if="target"
    :target="target"
    :show-header-actions="true"
    @new-agent="createNewAgent"
    @edit-config="openSelectedRunConfig"
  />
  <div v-else class="p-4 text-center text-gray-500">
    {{ $t('workspace.components.workspace.agent.AgentWorkspaceView.select_an_agent_or_start_a') }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { buildEditableAgentRunSeed } from '~/composables/useDefinitionLaunchDefaults'

const active = useActiveContextStore()
const definitions = useAgentDefinitionStore()
const runConfig = useAgentRunConfigStore()
const teamRunConfig = useTeamRunConfigStore()
const selection = useAgentSelectionStore()
const center = useWorkspaceCenterViewStore()
const target = computed(() => active.activeWorkspaceTarget?.kind === 'standalone_agent'
  ? active.activeWorkspaceTarget
  : null)

const createNewAgent = () => {
  if (!target.value) return
  runConfig.setAgentConfig(buildEditableAgentRunSeed(target.value.context.config))
  teamRunConfig.clearConfig()
  selection.clearSelection()
}
const openSelectedRunConfig = () => { if (target.value) center.showConfig() }

onMounted(async () => {
  if (!definitions.agentDefinitions.length) await definitions.fetchAllAgentDefinitions().catch(() => undefined)
})
</script>
