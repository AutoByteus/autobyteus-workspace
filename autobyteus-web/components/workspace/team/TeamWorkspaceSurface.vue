<template>
  <div class="flex h-full flex-col bg-white" data-testid="team-workspace-surface">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 sm:px-4" :class="remote ? 'min-h-14' : ''">
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
        <h4 class="truncate text-base font-medium text-gray-800" :title="memberName">{{ memberName }}</h4>
        <!-- autobyteus-278: the node that runs this member's Team, next to its name. -->
        <RemoteNodeChip v-if="remote" :node-name="remote.nodeName" size="header" />
        <AgentStatusDisplay :status="target.context.state.currentStatus" />
      </div>
      <WorkspaceHeaderActions
        v-if="showHeaderActions && remoteView.headerActionsAllowed.value"
        @new-agent="$emit('new-team')"
        @edit-config="$emit('edit-config')"
      />
    </div>
    <RemoteRunNotice v-if="remote && remoteView.unreachable.value" :node-name="remote.nodeName" @retry="remoteView.retry()" />
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
        :composer-placeholder="remoteView.composerPlaceholder(null)"
        class="h-full"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue'
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue'
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue'
import WorkspaceRecoveryNotice from '~/components/workspace/common/WorkspaceRecoveryNotice.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import RemoteNodeChip from '~/components/workspace/remote/RemoteNodeChip.vue'
import RemoteRunNotice from '~/components/workspace/remote/RemoteRunNotice.vue'
import { useRemoteRunView } from '~/composables/remoteRuns/useRemoteRunView'

type TeamTarget = Extract<ActiveAgentWorkspaceTarget,
  { kind: 'standalone_team_member' | 'agent_org_team_member' | 'agent_org_task_team_member' }>
const props = withDefaults(defineProps<{
  target: TeamTarget
  showHeaderActions?: boolean
  recoveryNotice?: string | null
}>(), { showHeaderActions: false, recoveryNotice: null })
defineEmits<{ (event: 'new-team'): void; (event: 'edit-config'): void }>()

const definitions = useAgentDefinitionStore()
const avatarFailed = ref(false)
const memberName = computed(() => props.target.context.config.agentDefinitionName
  || props.target.team.focusedMemberAddress.split('/').at(-1)?.replace(/[_-]+/g, ' ')
  || props.target.team.teamDefinitionName)
// autobyteus-278: a member of a Team another node runs shows its node, has no ⚙ or ＋, a notice and a box naming the node.
const remoteView = useRemoteRunView({ agentRunId: () => props.target.context.state.runId, agentName: memberName })
const remote = remoteView.remote
const initials = computed(() => memberName.value.split(/\s+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI')
const avatarUrl = computed(() => props.target.context.config.agentAvatarUrl?.trim()
  || definitions.getAgentDefinitionById(props.target.context.config.agentDefinitionId)?.avatarUrl?.trim()
  || '')
const showAvatar = computed(() => Boolean(avatarUrl.value) && !avatarFailed.value)
const senderNameByAgentRunId = computed(() => Object.freeze(Object.fromEntries(Object.entries(
  props.target.collaborationMessages.memberIdentityByAgentRunId(),
).map(([agentRunId, identity]) => [agentRunId, identity.label]))))
watch(avatarUrl, () => { avatarFailed.value = false })
</script>
