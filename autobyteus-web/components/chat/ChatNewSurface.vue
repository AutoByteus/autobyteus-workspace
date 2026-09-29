<template>
  <div class="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white" data-test="chat-new">
    <div class="flex flex-1 flex-col items-center justify-center px-4 pb-[14vh] pt-10 sm:px-6">
      <h1 class="text-center text-[1.75rem] font-semibold tracking-tight text-gray-900">{{ $t('chat.new.heading') }}</h1>
      <p v-if="team" class="mt-2 max-w-xl text-center text-sm text-gray-500" data-test="chat-new-subtitle">
        {{ $t('chat.new.subtitleTeam', { team: team.name }) }}
      </p>
      <p v-else-if="!isDefaultAgent" class="mt-2 max-w-xl text-center text-sm text-gray-500" data-test="chat-new-subtitle">
        {{ $t('chat.new.subtitleAgent', { agent: agentName }) }}
      </p>
      <p v-else class="mt-2 max-w-xl text-center text-sm text-gray-500" data-test="chat-new-subtitle">
        {{ $t('chat.new.subtitleDefaultBeforeSlash') }}
        <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-xs text-gray-600">/</kbd>
        {{ $t('chat.new.subtitleDefaultBetween') }}
        <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-xs text-gray-600">@</kbd>
        {{ $t('chat.new.subtitleDefaultAfterAt') }}
      </p>

      <div class="mt-8 w-full max-w-3xl">
        <ChatComposer
          v-if="draft && target"
          ref="composerRef"
          :target="target"
          :placeholder="placeholder"
          :skill-options="team ? null : options.skillOptions.value"
          :skills-all-installed="options.skillsAllInstalled.value"
          :target-options="options.targetOptions.value"
          :starting="draft.starting"
          :send-blocked-reason="sendBlockedReason"
          autofocus
          @select-target="chatDraftStore.setTarget"
        >
          <template v-if="team" #chips>
            <span class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 py-0.5 pl-1 pr-1 text-xs font-medium text-gray-700" data-test="chat-team-chip">
              <span class="inline-flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-[0.5rem] font-semibold text-slate-600" aria-hidden="true">{{ initialsFor(team.name) }}</span>
              {{ team.name }}
              <button
                type="button"
                class="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                :aria-label="$t('chat.new.useAssistantInsteadOf', { name: team.name })"
                :title="$t('chat.new.useAssistantInstead')"
                @click="resetTarget"
              >
                <Icon icon="heroicons:x-mark" class="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          </template>
          <template v-else-if="!isDefaultAgent" #chips>
            <span class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 py-0.5 pl-1 pr-1 text-xs font-medium text-gray-700" data-test="chat-agent-chip">
              <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[0.5rem] font-semibold text-slate-600" aria-hidden="true">{{ initialsFor(agentName) }}</span>
              {{ agentName }}
              <button
                type="button"
                class="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                :aria-label="$t('chat.new.useAssistantInsteadOf', { name: agentName })"
                :title="$t('chat.new.useAssistantInstead')"
                @click="resetTarget"
              >
                <Icon icon="heroicons:x-mark" class="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          </template>
          <template #footer-left>
            <ChatWorkspaceMenu :workspace="draft.workspace" @select="chatDraftStore.setWorkspace" />
            <ChatApprovalToggle :model-value="draft.autoExecuteTools" @update:model-value="chatDraftStore.setAutoExecuteTools" />
          </template>
          <template #footer-right>
            <ChatModelMenu
              :runtime-kind="controls.runtimeKind.value"
              :llm-model-identifier="controls.llmModelIdentifier.value"
              :model-label="controls.modelLabel.value"
              @select="controls.selectModel"
            />
            <ChatThinkingControl
              :schema="controls.thinkingSchema.value"
              :llm-config="controls.llmConfig.value"
              @update="controls.selectThinking"
            />
          </template>
        </ChatComposer>

        <p class="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400" data-test="chat-new-hint">
          <template v-if="draft?.starting">
            {{ $t('chat.new.starting', { name: team ? team.name : agentName, runtime: runtimeLabel }) }}
          </template>
          <template v-else-if="team">
            <span data-test="chat-team-note">
              {{ $t('chat.new.teamNote', { workspace: teamWorkspaceLabel }) }}
              <NuxtLink :to="{ path: '/agent-teams', query: { view: 'team-list' } }" class="font-medium text-blue-700 hover:underline">{{ $t('chat.new.agentTeamsLink') }}</NuxtLink>.
            </span>
          </template>
          <template v-else>
            <Icon icon="heroicons:folder" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span class="truncate">{{ workspaceHint }}</span>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import ChatWorkspaceMenu from '~/components/chat/ChatWorkspaceMenu.vue'
import ChatApprovalToggle from '~/components/chat/ChatApprovalToggle.vue'
import ChatModelMenu from '~/components/chat/ChatModelMenu.vue'
import ChatThinkingControl from '~/components/chat/ChatThinkingControl.vue'
import { useChatDraftModelControls } from '~/components/chat/chatDraftModelControls'
import { initialsFor } from '~/components/chat/chatComposerMenus'
import { createChatDraftComposerTarget } from '~/composables/chat/chatDraftComposerTarget'
import { useChatComposerOptions } from '~/composables/chat/useChatComposerOptions'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { resolveChatLaunchReadiness } from '~/services/chat/chatLaunchService'
import { hasSendableDraft } from '~/services/runSubmission/agentPrimaryAction'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'
import { useLocalization } from '~/composables/useLocalization'

const router = useRouter()
const { t } = useLocalization()
const chatDraftStore = useChatDraftStore()
const teamDefinitionStore = useAgentTeamDefinitionStore()
const workspaceStore = useWorkspaceStore()
const composerRef = ref<InstanceType<typeof ChatComposer> | null>(null)

const draft = computed(() => chatDraftStore.draft)
const draftContext = computed(() => draft.value?.context ?? null)
// One composer target per draft identity; a reset draft gets a fresh target.
const target = computed(() => (draft.value
  ? createChatDraftComposerTarget(draft.value, { navigate: (route) => router.push(route) })
  : null))

const agentDefinitionId = computed(() => (draft.value?.target.kind === 'agent' ? draft.value.target.agentDefinitionId : null))
const options = useChatComposerOptions(agentDefinitionId)
const controls = useChatDraftModelControls()

const team = computed(() => {
  const current = draft.value?.target
  if (current?.kind !== 'team') return null
  return teamDefinitionStore.agentTeamDefinitions.find((entry) => entry.id === current.teamDefinitionId) ?? null
})
const isDefaultAgent = computed(() => agentDefinitionId.value === DEFAULT_CHAT_AGENT_DEFINITION_ID)
const agentName = computed(() => options.agentDefinition.value?.name || draftContext.value?.config.agentDefinitionName || '')
const runtimeLabel = computed(() => runtimeKindToLabel(controls.runtimeKind.value))

const placeholder = computed(() => {
  if (team.value) return t('chat.new.placeholderTeam', { team: team.value.name })
  if (!isDefaultAgent.value) return t('chat.new.placeholderAgent', { agent: agentName.value })
  return t('chat.new.placeholderDefault')
})

const selectedWorkspace = computed(() => {
  const workspace = draft.value?.workspace
  if (!workspace) return null
  if (workspace.kind === 'folder') {
    const name = workspace.rootPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || workspace.rootPath
    return { isTemp: false, name, path: workspace.rootPath }
  }
  const info = workspaceStore.workspaces[workspace.workspaceId]
  const isTemp = !info || Boolean(info.isTemp) || info.workspaceId === workspaceStore.tempWorkspaceId
  return { isTemp, name: info?.name ?? '', path: info?.absolutePath ?? '' }
})
const workspaceHint = computed(() => {
  const workspace = selectedWorkspace.value
  if (!workspace) return ''
  return workspace.isTemp
    ? t('chat.new.hintTemp', { path: workspace.path })
    : t('chat.new.hintWorkspace', { workspace: workspace.name, path: workspace.path })
})
const teamWorkspaceLabel = computed(() => (selectedWorkspace.value?.isTemp
  ? t('chat.new.tempWorkspaceLower')
  : selectedWorkspace.value?.name ?? ''))

const sendBlockedReason = computed(() => {
  const current = draft.value
  if (!current || !hasSendableDraft(current.context, { attachmentsAreSendable: true })) return null
  const readiness = resolveChatLaunchReadiness(current)
  return readiness.ready ? null : readiness.reason
})

const resetTarget = () => {
  chatDraftStore.setTarget({ kind: 'agent', agentDefinitionId: DEFAULT_CHAT_AGENT_DEFINITION_ID })
  composerRef.value?.focus()
}

onMounted(() => {
  chatDraftStore.ensureDraft()
  if (!workspaceStore.workspacesFetched) void workspaceStore.fetchAllWorkspaces().catch(() => undefined)
})
</script>
