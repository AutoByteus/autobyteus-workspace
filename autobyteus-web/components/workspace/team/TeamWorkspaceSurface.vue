<template>
  <div class="flex h-full flex-col bg-white" data-testid="team-workspace-surface">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 sm:px-4">
      <div class="flex min-w-0 flex-1 items-center space-x-3">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-[0.625rem] font-semibold tracking-wide text-slate-600">
          <img
            v-if="showAvatar"
            :src="avatarUrl"
            :alt="`${memberName} avatar`"
            class="h-full w-full object-cover"
            @error="avatarFailed = true"
          />
          <span v-else>{{ initials }}</span>
        </div>
        <CollaborationTaskHeading v-if="focusedTask" :name="memberName" :agent-run-id="target.context.state.runId" :task="focusedTask" :status="target.context.state.currentStatus" />
        <template v-else>
          <h4 class="truncate text-base font-medium text-gray-800" :title="memberName">{{ memberName }}</h4>
          <AgentStatusDisplay :status="target.context.state.currentStatus" />
        </template>
      </div>
      <WorkspaceHeaderActions
        v-if="showHeaderActions"
        @new-agent="$emit('new-team')"
        @edit-config="$emit('edit-config')"
      />
    </div>
    <WorkspaceRecoveryNotice
      v-if="recoveryNotice"
      :message="recoveryNotice"
    />
    <div class="relative min-h-0 flex-1">
      <AgentEventMonitor
        :read-only="target.access === 'read_only' && !('root' in target && (target.context.submissionPending || target.kind === 'agent_org_team_member'))"
        :conversation="target.context.state.conversation"
        :run-id="target.context.state.runId"
        :agent-name="memberName"
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
      <div
        v-if="showAuthoritativeTaskEmpty"
        class="pointer-events-none absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-dashed border-slate-300 bg-white/95 px-4 py-5 text-center text-sm text-slate-600 shadow-sm"
        role="status"
        data-test="team-task-authoritative-empty"
      >{{ t('workspace.task_monitor.empty') }}</div>
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
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useLocalization } from '~/composables/useLocalization'

type TeamTarget = Extract<ActiveAgentWorkspaceTarget,
  { kind: 'standalone_team_member' | 'agent_org_team_member' | 'agent_org_task_team_member' }>
const props = withDefaults(defineProps<{
  target: TeamTarget
  showHeaderActions?: boolean
  recoveryNotice?: string | null
}>(), { showHeaderActions: false, recoveryNotice: null })
defineEmits<{ (event: 'new-team'): void; (event: 'edit-config'): void }>()

const definitions = useAgentDefinitionStore()
const activityStore = useAgentActivityStore()
const { t } = useLocalization()
const avatarFailed = ref(false)
const memberName = computed(() => props.target.context.config.agentDefinitionName
  || props.target.team.focusedMemberAddress.split('/').at(-1)?.replace(/[_-]+/g, ' ')
  || props.target.team.teamDefinitionName)
const initials = computed(() => memberName.value.split(/\s+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI')
const avatarUrl = computed(() => props.target.context.config.agentAvatarUrl?.trim()
  || definitions.getAgentDefinitionById(props.target.context.config.agentDefinitionId)?.avatarUrl?.trim()
  || '')
const showAvatar = computed(() => Boolean(avatarUrl.value) && !avatarFailed.value)
const focusedTask = computed(() => props.target.team.focusedTaskPresentation())
const showAuthoritativeTaskEmpty = computed(() => Boolean(
  focusedTask.value
  && props.target.team.isFocusedProjectionAuthoritative()
  && props.target.context.state.conversation.messages.length === 0
  && props.target.context.state.hasEarlierActiveTraceEvents !== true
  && activityStore.getActivities(props.target.context.state.runId).length === 0,
))
const senderNameByAgentRunId = computed(() => Object.freeze(Object.fromEntries(Object.entries(
  props.target.collaborationMessages.memberIdentityByAgentRunId(),
).map(([agentRunId, identity]) => [agentRunId, identity.label]))))
const skillTarget = computed<SkillImprovementComposerCtaTarget | null>(() =>
  props.target.kind === 'standalone_team_member'
    ? {
        kind: 'team-member',
        teamRunId: props.target.team.rootRunId,
        agentRunId: props.target.context.state.runId,
        isHelperRun:
          props.target.context.config.agentDefinitionId === 'autobyteus-retrospective-skill-improver'
          || props.target.context.config.agentDefinitionName === 'Retrospective Skill Improver',
      }
    : null)
watch(avatarUrl, () => { avatarFailed.value = false })
</script>
