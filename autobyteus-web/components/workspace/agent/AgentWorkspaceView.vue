<template>
  <AgentWorkspaceSurface
    v-if="target"
    :target="target"
    :show-header-actions="isHost"
    :skill-tagging="skillTagging"
    @new-agent="startNewChatForRun"
    @edit-config="openSelectedRunConfig"
  />
  <div v-else class="p-4 text-center text-gray-500">
    {{ $t('workspace.components.workspace.agent.AgentWorkspaceView.select_an_agent_or_start_a') }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useChatComposerOptions } from '~/composables/chat/useChatComposerOptions'
import { useAgentRunCollaborationSync } from '~/composables/agentCollaboration/useAgentRunCollaborationSync'
import type { SkillTaggingCapability } from '~/composables/agentInput/useSkillTagMenu'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'

/**
 * The standalone agent run view (the chat run view, D-17): the product run header with ⚙ and ＋,
 * the conversation, and the product box with `/` skill tags.
 */
const { t } = useLocalization()
const router = useRouter()
const active = useActiveContextStore()
const definitions = useAgentDefinitionStore()
const chatDraftStore = useChatDraftStore()
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

/** ＋ starts a New chat preset to this run's agent and workspace (UIS-013 R3). */
const startNewChatForRun = async () => {
  const config = target.value?.context.config
  if (!config) return
  chatDraftStore.startNewChat({
    agentDefinitionId: config.agentDefinitionId,
    workspaceRootPath: config.workspaceMetadata?.workspaceRootPath || undefined,
  })
  await router.push('/chat')
}
const openSelectedRunConfig = () => { if (target.value) center.showConfig() }

onMounted(async () => {
  if (!definitions.agentDefinitions.length) await definitions.fetchAllAgentDefinitions().catch(() => undefined)
})
</script>
