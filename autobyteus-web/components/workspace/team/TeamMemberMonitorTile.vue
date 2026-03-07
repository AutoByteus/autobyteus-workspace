<template>
  <button
    type="button"
    class="flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition-all duration-150"
    :class="[
      isFocused
        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      variant === 'primary' ? 'min-h-0 h-full' : 'h-full min-h-[420px]',
    ]"
    @click="$emit('select', memberName)"
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
              :status="memberContext.state.currentStatus"
              variant="compact"
            />
          </div>
        </div>
      </div>
      <span
        v-if="isFocused"
        class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700"
      >
        Focused
      </span>
    </div>

    <div class="flex-1 min-h-0 overflow-hidden px-4 py-3">
      <AgentConversationFeed
        v-if="hasPreviewMessages"
        class="h-full"
        :conversation="memberContext.state.conversation"
        :agent-name="displayName"
        :agent-avatar-url="avatarUrl || null"
        :inter-agent-sender-name-by-id="interAgentSenderNameById"
        :show-token-costs="false"
        :show-total-usage="false"
      />
      <div
        v-else
        class="flex h-full min-h-[92px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 text-center text-sm text-gray-400"
      >
        No activity yet.
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

const props = withDefaults(defineProps<{
  memberName: string;
  memberContext: AgentContext;
  isFocused?: boolean;
  variant?: 'compact' | 'primary';
  teamContext?: AgentTeamContext;
}>(), {
  isFocused: false,
  variant: 'compact',
});

defineEmits<{
  (e: 'select', memberName: string): void;
}>();

const avatarLoadError = ref(false);
const { getMemberAvatarUrl, getMemberDisplayName, getMemberInitials, getInterAgentSenderNameById } = useTeamMemberPresentation();

const displayName = computed(() => getMemberDisplayName(props.memberName, props.memberContext));
const avatarUrl = computed(() => getMemberAvatarUrl(props.memberName, props.memberContext));
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);
const initials = computed(() => getMemberInitials(displayName.value));
const hasPreviewMessages = computed(() => props.memberContext.state.conversation.messages.length > 0);
const interAgentSenderNameById = computed(() => {
  return props.teamContext ? getInterAgentSenderNameById(props.teamContext) : undefined;
});

watch(avatarUrl, () => {
  avatarLoadError.value = false;
});
</script>
