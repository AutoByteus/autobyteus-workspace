<template>
  <div class="flex h-full flex-col bg-white" data-testid="agent-workspace-surface">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 sm:px-4">
      <div class="flex min-w-0 flex-1 items-center space-x-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          <img
            v-if="showAvatar"
            :src="avatarUrl"
            :alt="`${agentName} avatar`"
            class="h-full w-full object-cover"
            @error="avatarFailed = true"
          />
          <span v-else class="text-[0.625rem] font-semibold tracking-wide text-slate-600">{{ initials }}</span>
        </div>
        <CollaborationTaskHeading v-if="'task' in target" :name="agentName" :agent-run-id="target.context.state.runId" :task="target.task" :status="target.context.state.currentStatus" />
        <h4 v-else class="truncate text-base font-medium text-gray-800" :title="headerTitle">{{ headerTitle }}</h4>
        <AgentStatusDisplay v-if="!('task' in target)" :status="target.context.state.currentStatus" />
      </div>
      <WorkspaceHeaderActions
        v-if="showHeaderActions"
        @new-agent="$emit('new-agent')"
        @edit-config="$emit('edit-config')"
      />
    </div>
    <WorkspaceRecoveryNotice
      v-if="recoveryNotice"
      :message="recoveryNotice"
    />
    <div class="min-h-0 flex-1">
      <AgentEventMonitor
        :read-only="target.access === 'read_only' && !('root' in target && (target.context.submissionPending || target.kind === 'agent_org_direct_agent'))"
        :conversation="target.context.state.conversation"
        :run-id="target.context.state.runId"
        :agent-name="agentName"
        :agent-avatar-url="avatarUrl || null"
        :inter-agent-sender-name-by-id="senderNameByAgentRunId"
        :presentation-revision="target.context.state.eventMonitorPresentationRevision"
        :has-earlier-active-trace-events="target.context.state.hasEarlierActiveTraceEvents"
        :browse-subject="target.browse"
        class="h-full"
      >
        <template v-if="skillTarget" #composerContext>
          <SkillImprovementComposerCta :target="skillTarget" />
        </template>
      </AgentEventMonitor>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CollaborationTaskHeading from '~/components/workspace/collaboration/CollaborationTaskHeading.vue'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue'
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue'
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue'
import WorkspaceRecoveryNotice from '~/components/workspace/common/WorkspaceRecoveryNotice.vue'
import SkillImprovementComposerCta from '~/components/workspace/skill-improvement/SkillImprovementComposerCta.vue'
import type { SkillImprovementComposerCtaTarget } from '~/components/workspace/skill-improvement/skillImprovementComposerCtaTarget'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'

const props = withDefaults(defineProps<{
  target: ActiveAgentWorkspaceTarget
  showHeaderActions?: boolean
  recoveryNotice?: string | null
}>(), { showHeaderActions: false, recoveryNotice: null })
defineEmits<{ (event: 'new-agent'): void; (event: 'edit-config'): void }>()

const definitions = useAgentDefinitionStore()
const avatarFailed = ref(false)
const agentName = computed(() => props.target.context.config.agentDefinitionName || 'Agent')
const avatarUrl = computed(() => props.target.context.config.agentAvatarUrl?.trim()
  || definitions.getAgentDefinitionById(props.target.context.config.agentDefinitionId)?.avatarUrl?.trim()
  || '')
const showAvatar = computed(() => Boolean(avatarUrl.value) && !avatarFailed.value)
const initials = computed(() => agentName.value.split(/\s+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI')
const headerTitle = computed(() => {
  if (props.target.context.state.runId.startsWith('temp-')) return `New - ${agentName.value}`
  const suffix = props.target.context.state.runId.slice(-4).toUpperCase()
  return `${agentName.value} - ${suffix}`
})
const senderNameByAgentRunId = computed(() => 'collaborationMessages' in props.target
  ? Object.freeze(Object.fromEntries(Object.entries(
      props.target.collaborationMessages.memberIdentityByAgentRunId(),
    ).map(([agentRunId, identity]) => [agentRunId, identity.label])))
  : Object.freeze({}))
const skillTarget = computed<SkillImprovementComposerCtaTarget | null>(() =>
  props.target.kind === 'standalone_agent'
    ? {
        kind: 'agent',
        runId: props.target.context.state.runId,
        isHelperRun:
          props.target.context.config.agentDefinitionId === 'autobyteus-retrospective-skill-improver'
          || props.target.context.config.agentDefinitionName === 'Retrospective Skill Improver',
      }
    : null)

watch(avatarUrl, () => { avatarFailed.value = false })
</script>
