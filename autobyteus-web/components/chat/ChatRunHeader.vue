<template>
  <header class="flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4" data-test="chat-run-header">
    <span class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-[0.625rem] font-semibold text-slate-600">
      <img v-if="showAvatar" :src="avatarUrl" :alt="$t('chat.header.avatarAlt', { name: agentName })" class="h-full w-full object-cover" @error="avatarFailed = true">
      <span v-else aria-hidden="true">{{ initials }}</span>
    </span>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <h1 class="truncate text-[0.9375rem] font-semibold text-gray-900" data-test="chat-title" :title="fullTitle">{{ title }}</h1>
        <AgentStatusDisplay :status="context.state.currentStatus" variant="compact" data-test="chat-run-status" />
      </div>
      <p class="flex items-center gap-1.5 truncate text-xs text-gray-500">
        <span class="truncate">{{ agentName }}</span>
        <span class="text-gray-300" aria-hidden="true">·</span>
        <Icon icon="heroicons:folder" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span class="truncate" :title="workspacePath">{{ workspaceName }}</span>
        <span class="text-gray-300" aria-hidden="true">·</span>
        <span
          class="inline-flex flex-shrink-0 items-center gap-1"
          :class="context.config.autoExecuteTools ? '' : 'text-amber-700'"
          data-test="chat-header-approval"
          :title="context.config.autoExecuteTools ? $t('chat.header.autoApproveTooltip') : $t('chat.header.askFirstTooltip')"
        >
          <Icon :icon="context.config.autoExecuteTools ? 'heroicons:shield-check' : 'heroicons:shield-exclamation'" class="h-3.5 w-3.5" aria-hidden="true" />
          {{ context.config.autoExecuteTools ? $t('chat.approval.autoApprove') : $t('chat.approval.askFirst') }}
        </span>
      </p>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue'
import { initialsFor } from '~/components/chat/chatComposerMenus'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useWorkspaceStore } from '~/stores/workspace'
import type { AgentContext } from '~/types/agent/AgentContext'
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary'
import { truncateChatTitle } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'

/** Fixed facts of a chat: title, status, and agent · workspace · approval. */
const props = defineProps<{ context: AgentContext }>()

const { t } = useLocalization()
const definitions = useAgentDefinitionStore()
const runHistoryStore = useRunHistoryStore()
const workspaceStore = useWorkspaceStore()
const avatarFailed = ref(false)

const agentName = computed(() => props.context.config.agentDefinitionName
  || definitions.getAgentDefinitionById(props.context.config.agentDefinitionId)?.name
  || '')
const avatarUrl = computed(() => props.context.config.agentAvatarUrl?.trim()
  || definitions.getAgentDefinitionById(props.context.config.agentDefinitionId)?.avatarUrl?.trim()
  || '')
const showAvatar = computed(() => Boolean(avatarUrl.value) && !avatarFailed.value)
const initials = computed(() => initialsFor(agentName.value))
watch(avatarUrl, () => { avatarFailed.value = false })

const historySummary = computed(() => {
  const runId = props.context.state.runId
  for (const workspace of runHistoryStore.workspaceGroups) {
    for (const agent of workspace.agentDefinitions) {
      const run = agent.runs.find((entry) => entry.runId === runId)
      if (run?.summary?.trim()) return run.summary.trim()
    }
  }
  return null
})
const fullTitle = computed(() => resolveFirstUserMessageSummary(props.context.state.conversation)
  || historySummary.value
  || t('chat.header.untitled'))
const title = computed(() => truncateChatTitle(fullTitle.value))

const workspaceInfo = computed(() => {
  const workspaceId = props.context.config.workspaceId
  return workspaceId ? workspaceStore.workspaces[workspaceId] ?? null : null
})
const normalizeRoot = (rootPath: string | null | undefined) => (rootPath ?? '').replace(/[/\\]+$/, '')
// A reopened run resolves its workspace by root path, so compare roots as well as ids.
const isTempWorkspace = computed(() => {
  const config = props.context.config
  if (config.workspaceMetadata?.kind === 'temp' || workspaceInfo.value?.isTemp) return true
  if (config.workspaceId && config.workspaceId === workspaceStore.tempWorkspaceId) return true
  const tempRoot = normalizeRoot(workspaceStore.tempWorkspace?.absolutePath)
  return Boolean(tempRoot) && normalizeRoot(config.workspaceMetadata?.workspaceRootPath) === tempRoot
})
const workspaceName = computed(() => (isTempWorkspace.value
  ? t('chat.workspace.temp')
  : props.context.config.workspaceMetadata?.displayName || workspaceInfo.value?.name || ''))
const workspacePath = computed(() => props.context.config.workspaceMetadata?.workspaceRootPath
  || workspaceInfo.value?.absolutePath
  || '')
</script>
