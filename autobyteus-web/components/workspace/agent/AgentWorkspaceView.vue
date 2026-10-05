<template>
  <AgentWorkspaceSurface
    v-if="target"
    :target="target"
    :show-header-actions="true"
    :show-edit-config="!isTemporaryRunId(target.context.state.runId)"
    :skill-tagging="skillTagging"
    :composer-placeholder="childPlaceholder"
    @new-agent="startNewChatForRun"
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
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useChatComposerOptions } from '~/composables/chat/useChatComposerOptions'
import { useAgentRunCollaborationSync } from '~/composables/agentCollaboration/useAgentRunCollaborationSync'
import type { SkillTaggingCapability } from '~/composables/agentInput/useSkillTagMenu'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID, isTemporaryRunId } from '~/utils/chat/chatDefaults'
import { useRunStart } from '~/composables/runSettings/useRunStart'
import { useLocalization } from '~/composables/useLocalization'

/**
 * The standalone agent run view (the chat run view, D-17): the product run header with ⚙ and ＋,
 * the conversation, and the product box with `/` skill tags. A collaborator of the run (F-04)
 * has the same header controls and a box that names it.
 */
const { t } = useLocalization()
const active = useActiveContextStore()
const definitions = useAgentDefinitionStore()
const runStart = useRunStart()
const center = useWorkspaceCenterViewStore()
// The run's own agent, or a task child brought into the run with `@`.
const target = computed(() => {
  const current = active.activeWorkspaceTarget
  return current && (current.kind === 'standalone_agent' || current.kind === 'agent_run_task_agent'
    || current.kind === 'agent_run_task_team_member') ? current : null
})
const isHost = computed(() => target.value?.kind === 'standalone_agent')
useAgentRunCollaborationSync()

const composerOptions = useChatComposerOptions(computed(() => target.value?.context.config.agentDefinitionId ?? null))
const skillTagging = computed<SkillTaggingCapability | null>(() => {
  const config = target.value?.context.config
  if (!config || !isHost.value) return null
  return {
    skills: composerOptions.skillOptions.value,
    allInstalled: composerOptions.skillsAllInstalled.value,
    placeholder: config.agentDefinitionId === DEFAULT_CHAT_AGENT_DEFINITION_ID
      ? t('chat.run.placeholderDefault')
      : t('chat.run.placeholderAgent', { agent: config.agentDefinitionName || '' }),
  }
})

/** F-04: a collaborator view names its agent in the box, like the Org's delegated-Agent view. */
const childPlaceholder = computed(() => {
  const config = target.value?.context.config
  return config && !isHost.value ? t('chat.run.placeholderAgent', { agent: config.agentDefinitionName || '' }) : null
})

/** ＋ opens New chat for this run's agent with its workspace, approval and model config (REQ-013). */
const startNewChatForRun = async () => {
  const runId = target.value?.context.state.runId
  if (runId) await runStart.copyAgentRun(runId)
}
// A failed first send lands on the `temp-*` context; it has no saved settings (⚙ is hidden there).
const openSelectedRunConfig = () => { if (target.value && !isTemporaryRunId(target.value.context.state.runId)) center.showConfig() }

onMounted(async () => {
  if (!definitions.agentDefinitions.length) await definitions.fetchAllAgentDefinitions().catch(() => undefined)
})
</script>
