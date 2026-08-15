<template>
  <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" data-testid="mobile-activity-digest">
    <div class="grid grid-cols-2 gap-2" data-testid="mobile-activity-filters">
      <button
        v-for="filter in primaryFilters"
        :key="filter.id"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-bold"
        :class="activeFilter === filter.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
        :data-testid="`mobile-activity-filter-${filter.id}`"
        @click="activeFilter = filter.id"
      >
        {{ filter.label }} · {{ filter.count }}
      </button>
    </div>

    <article v-if="showMessages" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="mobile-activity-team-messages">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold text-slate-950">Team messages</h3>
          <p class="mt-1 text-sm text-slate-500">{{ messageSummary }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!hasTeamContext"
          data-testid="mobile-open-team-messages"
          @click="showTeamMessages = !showTeamMessages"
        >
          {{ hasTeamContext ? (showTeamMessages ? 'Hide' : 'Details') : 'Select team' }}
        </button>
      </div>
      <MobileTeamMessages v-if="showTeamMessages" :context="context" class="mt-3" />
    </article>

    <article v-if="showActivity" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="mobile-activity-run-history">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold text-slate-950">Run activity history</h3>
          <p class="mt-1 text-sm text-slate-500">{{ activitySummary }}</p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{{ visibleActivityCount }}</span>
      </div>
      <MobileRunActivityList :context="context" class="mt-3" />
    </article>

    <article v-if="!context" class="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
      <p class="font-semibold text-slate-900">No work context selected</p>
      <p class="mt-2 text-sm text-slate-500">Choose work to see relevant activity.</p>
      <button type="button" class="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white" @click="$emit('chooseWork')">
        Choose work
      </button>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import MobileTeamMessages from '~/components/mobile/MobileTeamMessages.vue';
import MobileRunActivityList from '~/components/mobile/MobileRunActivityList.vue';
import { useMobileFocusedRunIdentity } from '~/composables/mobile/useMobileFocusedRunIdentity';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import { projectTeamCommunicationPerspective } from '~/utils/teamCommunication/teamCommunicationPerspective';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();

type ActivityFilter = 'messages' | 'activity';

const activityStore = useAgentActivityStore();
const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();
const activeFilter = ref<ActivityFilter>('messages');
const showTeamMessages = ref(false);

const { focusedRunId } = useMobileFocusedRunIdentity(toRef(props, 'context'));

const activeTeamContext = computed(() => {
  if (props.context?.kind !== 'team-run') return null;
  if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return null;
  return teamContextsStore.getTeamContextById(props.context.teamRunId) ?? null;
});
const hasTeamContext = computed(() => Boolean(activeTeamContext.value || props.context?.kind === 'team-run'));
const teamMessages = computed(() => {
  const team = activeTeamContext.value;
  if (!team) return [];
  return projectTeamCommunicationPerspective({
    view: team.view,
    messages: team.view.listCommunicationMessages(),
    focusedAgentRunId: team.view.getFocusedAgentRunId(),
  }).messages;
});
const runActivities = computed(() => focusedRunId.value ? activityStore.getActivities(focusedRunId.value) : []);
const filters = computed(() => [
  { id: 'messages' as const, label: 'Messages', count: teamMessages.value.length },
  { id: 'activity' as const, label: 'Activity', count: runActivities.value.length },
]);
const primaryFilters = computed(() => filters.value);
const showMessages = computed(() => activeFilter.value === 'messages');
const showActivity = computed(() => activeFilter.value === 'activity');
const visibleActivityCount = computed(() => runActivities.value.length);
const messageSummary = computed(() => {
  if (!hasTeamContext.value) return 'Select a team run to see team messages.';
  if (!teamMessages.value.length) return 'No team messages yet for the focused member.';
  return `${teamMessages.value.length} message${teamMessages.value.length === 1 ? '' : 's'}; open details for full text.`;
});
const activitySummary = computed(() => {
  if (!focusedRunId.value) return 'Select a run to see run activity history.';
  if (!runActivities.value.length) return 'No run activity has been recorded for this run yet.';
  return `${runActivities.value.length} activity item${runActivities.value.length === 1 ? '' : 's'}; rows are compact by default.`;
});
</script>
