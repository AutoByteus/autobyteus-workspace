<template>
  <div
    class="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white"
    :class="[membersLayout.open ? 'lg:pr-[var(--members-panel-width)]' : '', membersLayout.resizing ? '' : 'transition-[padding] duration-200 ease-out motion-reduce:transition-none']"
    :style="{ '--members-panel-width': `${membersLayout.width}px` }"
    data-test="chat-new"
  >
    <div class="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-[14vh] sm:px-6">
      <!-- The heading is who you talk to, and where you choose what to run (REQ-008/019). -->
      <div class="relative -top-6 flex max-w-full items-center justify-center sm:-top-10" data-test="chat-new-target">
        <RunTargetSwitcher
          :name="identity.name"
          :avatar-url="identity.avatarUrl"
          :current-key="currentTargetKey"
          :disabled="Boolean(draft?.starting)"
          @choose="chooseTarget"
        />
      </div>
      <!-- Daily Assistant keeps its skill and @ hint; other targets show no subtitle. -->
      <p v-if="isDefaultAgent" class="mt-2 max-w-xl text-center text-sm text-gray-500" data-test="chat-new-subtitle">
        {{ $t('chat.new.subtitleDefaultBeforeSlash') }}
        <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-xs text-gray-600">/</kbd>
        {{ $t('chat.new.subtitleDefaultBetween') }}
        <kbd class="rounded border border-gray-200 bg-gray-50 px-1 font-sans text-xs text-gray-600">@</kbd>
        {{ $t('chat.new.subtitleDefaultAfterAt') }}
      </p>

      <div class="mt-8 w-full max-w-3xl">
        <ChatComposer
          v-if="draft && target"
          :key="draft.id"
          ref="composerRef"
          :target="target"
          :placeholder="placeholder"
          :skill-options="team ? null : options.skillOptions.value"
          :skills-all-installed="options.skillsAllInstalled.value"
          :mention-source="mentionSource"
          :starting="draft.starting"
          :send-blocked-reason="sendBlockedReason"
          autofocus
        >
          <template #footer-left>
            <ChatWorkspaceMenu :workspace="draft.workspace" @select="chatDraftStore.setWorkspace" />
            <ChatApprovalToggle
              :model-value="effectiveAutoExecuteTools(controls.runtimeKind.value, draft.autoExecuteTools)"
              :locked="isAutoApproveLockedForRuntime(controls.runtimeKind.value)"
              @update:model-value="chatDraftStore.setAutoExecuteTools"
            />
          </template>
          <template #footer-right>
            <ChatModelMenu
              :runtime-kind="controls.runtimeKind.value"
              :llm-model-identifier="controls.llmModelIdentifier.value"
              :model-label="controls.modelLabel.value"
              @select="controls.selectModel"
            />
            <!-- CR-005: Thinking and the other-setting chips keep their size; only the model name truncates. -->
            <ChatThinkingControl
              class="flex-shrink-0"
              :schema="controls.thinkingSchema.value"
              :llm-config="controls.llmConfig.value"
              @update="controls.selectModelConfig"
            />
            <!-- REQ-022: the model's other settings (e.g. Codex Fast mode), one chip each. -->
            <ChatModelOptionControl
              v-for="option in modelOptions"
              :key="option.key"
              class="flex-shrink-0"
              :option="option"
              compact-on-phone
              @update="controls.selectModelConfig(applyModelOption(controls.llmConfig.value, option.key, $event))"
            />
          </template>
        </ChatComposer>

        <!-- No "Files are saved in …" line: the workspace control names the workspace (path on hover). -->
        <p v-if="draft?.starting" class="mt-2.5 text-center text-xs text-gray-400" data-test="chat-new-hint">
          {{ $t('chat.new.starting', { name: identity.name, runtime: runtimeLabel }) }}
        </p>
        <!-- Team: members follow the composer unless customized here (REQ-002). -->
        <RunMembersLine
          v-else-if="team && draft"
          :key="`${draft.context.state.runId}:${team.id}`"
          class="mt-2.5"
          subject-kind="team"
          :subject-name="team.name"
          :nodes="teamMembers"
          @change="(address, change) => change.field !== 'workspace' && chatDraftStore.changeTeamMember(address, change)"
          @reset="chatDraftStore.resetTeamMember"
          @reset-all="chatDraftStore.resetTeamMembers"
          @layout="membersLayout = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import ChatWorkspaceMenu from '~/components/chat/ChatWorkspaceMenu.vue'
import ChatApprovalToggle from '~/components/chat/ChatApprovalToggle.vue'
import ChatModelMenu from '~/components/chat/ChatModelMenu.vue'
import ChatThinkingControl from '~/components/chat/ChatThinkingControl.vue'
import ChatModelOptionControl from '~/components/chat/ChatModelOptionControl.vue'
import RunTargetSwitcher, { type RunTargetChoice } from '~/components/run-settings/RunTargetSwitcher.vue'
import RunMembersLine from '~/components/run-settings/RunMembersLine.vue'
import { applyModelOption, buildModelOptions } from '~/utils/runSettings/modelOptions'
import { useChatDraftModelControls } from '~/components/chat/chatDraftModelControls'
import { createChatDraftComposerTarget } from '~/composables/chat/chatDraftComposerTarget'
import { useChatComposerOptions } from '~/composables/chat/useChatComposerOptions'
import { useRunStart } from '~/composables/runSettings/useRunStart'
import type { MentionCandidateSource } from '~/composables/runSettings/useMentionCandidates'
import { useChatDraftStore } from '~/stores/chatDraftStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useWorkspaceStore } from '~/stores/workspace'
import { resolveChatLaunchReadiness } from '~/services/chat/chatLaunchService'
import { sameRunWorkspaceChoice } from '~/services/workspace/runWorkspaceChoice'
import { hasSendableDraft } from '~/services/runSubmission/agentPrimaryAction'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'
import { effectiveAutoExecuteTools, isAutoApproveLockedForRuntime } from '~/utils/agentRunRuntimeDraftPolicy'
import { buildTeamMemberTree } from '~/utils/runSettings/runMemberTree'
import { useLocalization } from '~/composables/useLocalization'

const router = useRouter()
const { t } = useLocalization()
const chatDraftStore = useChatDraftStore()
const teamDefinitionStore = useAgentTeamDefinitionStore()
const catalogs = useLLMProviderConfigStore()
const workspaceStore = useWorkspaceStore()
const runStart = useRunStart()
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
const modelOptions = computed(() => buildModelOptions(controls.thinkingSchema.value, controls.llmConfig.value, {
  default: t('chat.modelOption.default'),
  on: t('chat.modelOption.on'),
  off: t('chat.modelOption.off'),
}))

const team = computed(() => {
  const current = draft.value?.target
  if (current?.kind !== 'team') return null
  return teamDefinitionStore.agentTeamDefinitions.find((entry) => entry.id === current.teamDefinitionId) ?? null
})
const isDefaultAgent = computed(() => agentDefinitionId.value === DEFAULT_CHAT_AGENT_DEFINITION_ID)
const agentName = computed(() => options.agentDefinition.value?.name || draftContext.value?.config.agentDefinitionName || '')
const identity = computed(() => (team.value
  ? { name: team.value.name, avatarUrl: team.value.avatarUrl ?? null }
  : { name: agentName.value, avatarUrl: options.agentDefinition.value?.avatarUrl || draftContext.value?.config.agentAvatarUrl || null }))
const currentTargetKey = computed(() => {
  const current = draft.value?.target
  if (!current) return ''
  return current.kind === 'team' ? `team:${current.teamDefinitionId}` : `agent:${current.agentDefinitionId}`
})
const runtimeLabel = computed(() => runtimeKindToLabel(controls.runtimeKind.value))

const placeholder = computed(() => {
  if (team.value) return t('chat.new.placeholderTeam', { team: team.value.name })
  if (!isDefaultAgent.value) return t('chat.new.placeholderAgent', { agent: agentName.value })
  return t('chat.new.placeholderDefault')
})

/** `@` brings a collaborator in; the agent (or the team's coordinator) receives the message. */
const mentionSource = computed<MentionCandidateSource | null>(() => {
  const current = draft.value
  if (!current) return null
  return {
    kind: 'draft',
    target: current.target,
    focusedName: team.value ? (team.value.coordinatorMemberName || team.value.name) : agentName.value,
  }
})

const teamMembers = computed(() => {
  const current = draft.value
  if (!current || !team.value) return []
  return buildTeamMemberTree({
    team: team.value,
    root: {
      workspace: current.workspace,
      runtimeKind: current.context.config.runtimeKind,
      llmModelIdentifier: current.context.config.llmModelIdentifier,
      llmConfig: current.context.config.llmConfig ?? null,
      autoExecuteTools: current.autoExecuteTools,
    },
    agentOverrides: current.teamAgentOverrides,
  }, {
    schemaFor: (runtimeKind, llmModelIdentifier) => catalogs.modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier),
    sameWorkspace: sameRunWorkspaceChoice,
  })
})
// The member settings drawer docks on the right; on wide screens the page makes room for it.
const membersLayout = ref({ open: false, width: 0, resizing: false })

const sendBlockedReason = computed(() => {
  const current = draft.value
  if (!current || !hasSendableDraft(current.context)) return null
  const readiness = resolveChatLaunchReadiness(current)
  return readiness.ready ? null : readiness.reason
})

const chooseTarget = async (choice: RunTargetChoice) => {
  await runStart.switchTarget(choice, 'chat')
  if (choice.kind !== 'org') void nextTick(() => composerRef.value?.focus())
}

onMounted(() => {
  chatDraftStore.ensureDraft()
  if (!workspaceStore.workspacesFetched) void workspaceStore.fetchAllWorkspaces().catch(() => undefined)
})
</script>
