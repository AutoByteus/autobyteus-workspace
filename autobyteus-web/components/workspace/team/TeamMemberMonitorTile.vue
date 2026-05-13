<template>
  <div
    role="button"
    tabindex="0"
    class="flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition-all duration-150"
    :class="[
      isFocused
        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      variant === 'primary' ? 'min-h-0 h-full' : 'h-full min-h-[420px]',
    ]"
    @click="$emit('select', memberRouteKey)"
    @keydown.enter.prevent="$emit('select', memberRouteKey)"
    @keydown.space.prevent="$emit('select', memberRouteKey)"
  >
    <div data-test="team-member-header" class="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          <img
            v-if="showAvatarImage"
            :src="avatarUrl"
            :alt="`${displayName} avatar`"
            class="h-full w-full object-cover"
            @error="avatarLoadError = true"
          />
          <span v-else class="text-xs font-semibold tracking-wide text-slate-600">
            {{ initials }}
          </span>
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p class="truncate text-sm font-semibold text-gray-900" :title="displayName">{{ displayName }}</p>
            <AgentStatusDisplay
              data-test="team-member-status"
              :status="displayStatus"
              variant="compact"
            />
            <span
              v-if="memberNode?.memberKind === 'agent_team'"
              class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500"
            >
              Team
            </span>
          </div>
        </div>
      </div>
      <span
        v-if="isFocused"
        class="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-700"
      >
        Focused
      </span>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden px-4 py-3">
      <AgentConversationFeed
        v-if="hasPreviewMessages && memberContext"
        class="h-full"
        :conversation="memberContext.state.conversation"
        :agent-name="displayName"
        :agent-avatar-url="avatarUrl || null"
        :inter-agent-sender-name-by-id="interAgentSenderNameById"
        :show-token-costs="false"
        :show-total-usage="false"
      />
      <div
        v-else-if="memberNode?.memberKind === 'agent_team'"
        class="h-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-3"
      >
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ $t('workspace.components.workspace.team.TeamMemberMonitorTile.subteam_members') }}
        </p>
        <div class="space-y-2">
          <button
            v-for="child in subteamChildRows"
            :key="child.node.memberRouteKey"
            type="button"
            class="w-full rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            :class="child.node.memberRouteKey === teamContext?.focusedMemberRouteKey ? 'border-indigo-200 bg-indigo-50' : ''"
            :style="{ marginLeft: `${child.depth * 0.75}rem` }"
            @click.stop="$emit('select', child.node.memberRouteKey)"
          >
            <div class="flex items-center gap-2">
              <p class="min-w-0 flex-1 truncate text-sm font-medium text-slate-800" :title="child.node.memberRouteKey">
                {{ child.node.displayName || child.node.memberName }}
              </p>
              <span
                v-if="child.node.memberKind === 'agent_team'"
                class="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500"
              >
                Team
              </span>
            </div>
            <p class="mt-0.5 truncate text-xs text-slate-500">{{ child.node.memberRouteKey }}</p>
          </button>
        </div>
      </div>
      <div
        v-else
        class="flex h-full min-h-[92px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 text-center text-sm text-gray-400"
      >{{ $t('workspace.components.workspace.team.TeamMemberMonitorTile.no_activity_yet') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { flattenTeamMemberNodesForDisplay } from '~/utils/teamDefinitionMembers';

const props = withDefaults(defineProps<{
  memberName?: string;
  memberNode?: TeamMemberNode;
  memberContext?: AgentContext | null;
  isFocused?: boolean;
  variant?: 'compact' | 'primary';
  teamContext?: AgentTeamContext;
}>(), {
  isFocused: false,
  variant: 'compact',
});

defineEmits<{
  (e: 'select', memberRouteKey: string): void;
}>();

const avatarLoadError = ref(false);
const { getMemberAvatarUrl, getMemberDisplayName, getMemberInitials, getInterAgentSenderNameById } = useTeamMemberPresentation();

const memberRouteKey = computed(() => props.memberNode?.memberRouteKey || props.memberName || '');
const displayName = computed(() => (
  props.memberNode?.displayName
  || getMemberDisplayName(memberRouteKey.value, props.memberContext)
));
const avatarUrl = computed(() => (
  props.memberNode?.memberKind === 'agent_team'
    ? ''
    : getMemberAvatarUrl(memberRouteKey.value, props.memberContext)
));
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);
const initials = computed(() => getMemberInitials(displayName.value));
const displayStatus = computed(() => props.memberContext?.state.currentStatus ?? AgentStatus.Uninitialized);
const hasPreviewMessages = computed(() => (props.memberContext?.state.conversation.messages.length ?? 0) > 0);
const subteamChildRows = computed(() => (
  props.memberNode?.memberKind === 'agent_team'
    ? flattenTeamMemberNodesForDisplay(props.memberNode.children)
    : []
));
const interAgentSenderNameById = computed(() => {
  return props.teamContext ? getInterAgentSenderNameById(props.teamContext) : undefined;
});

watch(avatarUrl, () => {
  avatarLoadError.value = false;
});
</script>
