<template>
  <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" data-testid="mobile-activity-digest">
    <div class="grid grid-cols-4 gap-2" data-testid="mobile-activity-filters">
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
    <div class="flex justify-end">
      <button
        type="button"
        class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
        data-testid="mobile-activity-more-filters"
        @click="showAdvancedFilters = !showAdvancedFilters"
      >
        {{ showAdvancedFilters ? 'Hide issue filters' : 'Issue filters' }}
      </button>
    </div>
    <div v-if="showAdvancedFilters" class="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3" data-testid="mobile-activity-advanced-filters">
      <button
        v-for="filter in advancedFilters"
        :key="filter.id"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-bold"
        :class="activeFilter === filter.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'"
        :data-testid="`mobile-activity-filter-${filter.id}`"
        @click="activeFilter = filter.id"
      >
        {{ filter.label }} · {{ filter.count }}
      </button>
    </div>

    <article v-if="showTasks" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="mobile-activity-task-plan">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold text-slate-950">Task plan</h3>
          <p class="mt-1 text-sm text-slate-500">{{ taskPlanSummary }}</p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{{ taskCards.length }}</span>
      </div>
      <div v-if="taskCards.length" class="mt-3 space-y-2">
        <div v-for="task in taskCards.slice(0, 6)" :key="task.id" class="rounded-2xl bg-slate-50 p-3" data-testid="mobile-task-plan-row">
          <div class="flex items-start justify-between gap-3">
            <p class="min-w-0 line-clamp-1 font-semibold text-slate-900">{{ task.name }}</p>
            <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{{ task.status }}</span>
          </div>
        </div>
      </div>
    </article>

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

    <article v-if="showTools" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="mobile-activity-tool-history">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-bold text-slate-950">Run and tool history</h3>
          <p class="mt-1 text-sm text-slate-500">{{ toolSummary }}</p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{{ visibleToolCount }}</span>
      </div>
      <MobileToolActivityList :context="context" :filter="toolFilter" class="mt-3" />
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
import { computed, ref } from 'vue';
import MobileTeamMessages from '~/components/mobile/MobileTeamMessages.vue';
import MobileToolActivityList from '~/components/mobile/MobileToolActivityList.vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

defineEmits<{
  chooseWork: [];
}>();

type ActivityFilter = 'all' | 'tasks' | 'messages' | 'tools' | 'errors' | 'approvals';
type MobileToolActivityFilter = 'all' | 'errors' | 'approvals';

const activeContextStore = useActiveContextStore();
const activityStore = useAgentActivityStore();
const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();
const teamCommunicationStore = useTeamCommunicationStore();
const activeFilter = ref<ActivityFilter>('all');
const showTeamMessages = ref(false);
const showAdvancedFilters = ref(false);

const activeTeamContext = computed(() => {
  if (props.context?.kind !== 'team-run') return null;
  if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return null;
  return teamContextsStore.getTeamContextById(props.context.teamRunId) ?? null;
});
const hasTeamContext = computed(() => Boolean(activeTeamContext.value || props.context?.kind === 'team-run'));
const taskCards = computed(() => {
  const tasks = activeTeamContext.value?.taskPlan ?? [];
  const statuses = activeTeamContext.value?.taskStatuses ?? {};
  return tasks.map((task) => ({
    id: task.taskId,
    name: task.taskName,
    status: statuses[task.taskId] || 'not_started',
  }));
});
const teamMessages = computed(() => {
  const team = activeTeamContext.value;
  if (!team) return [];
  return teamCommunicationStore.getPerspectiveForMember(team.teamRunId, {
    memberRunId: teamContextsStore.focusedMemberContext?.state.runId || teamContextsStore.focusedMemberNode?.memberRunId || null,
    memberRouteKey: teamContextsStore.focusedMemberNode?.memberRouteKey || null,
    memberPath: teamContextsStore.focusedMemberNode?.memberPath || null,
    memberKind: teamContextsStore.focusedMemberNode?.memberKind || null,
  }).messages;
});
const runId = computed(() => {
  if (props.context?.kind === 'agent-run') {
    if (selectionStore.selectedType !== 'agent' || selectionStore.selectedRunId !== props.context.runId) return '';
    return activeContextStore.activeAgentContext?.state.runId === props.context.runId ? props.context.runId : '';
  }
  if (props.context?.kind === 'team-run') {
    if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return '';
    const team = teamContextsStore.getTeamContextById(props.context.teamRunId);
    if (!team || team.focusedMemberRouteKey !== props.context.focusedMemberRouteKey) return '';
    return activeContextStore.activeAgentContext?.state.runId || '';
  }
  return '';
});
const toolActivities = computed(() => runId.value ? activityStore.getActivities(runId.value) : []);
const errorActivities = computed(() => toolActivities.value.filter((activity) => activity.status === 'error' || activity.status === 'denied'));
const approvalActivities = computed(() => toolActivities.value.filter((activity) => activity.status === 'awaiting-approval'));
const filters = computed(() => [
  { id: 'all' as const, label: 'All', count: taskCards.value.length + teamMessages.value.length + toolActivities.value.length },
  { id: 'tasks' as const, label: 'Tasks', count: taskCards.value.length },
  { id: 'messages' as const, label: 'Messages', count: teamMessages.value.length },
  { id: 'tools' as const, label: 'Tools', count: toolActivities.value.length },
  { id: 'errors' as const, label: 'Errors', count: errorActivities.value.length },
  { id: 'approvals' as const, label: 'Approvals', count: approvalActivities.value.length },
]);
const primaryFilters = computed(() => filters.value.filter((filter) => ['all', 'tasks', 'messages', 'tools'].includes(filter.id)));
const advancedFilters = computed(() => filters.value.filter((filter) => filter.id === 'errors' || filter.id === 'approvals'));
const showTasks = computed(() => activeFilter.value === 'all' || activeFilter.value === 'tasks');
const showMessages = computed(() => activeFilter.value === 'all' || activeFilter.value === 'messages');
const showTools = computed(() => ['all', 'tools', 'errors', 'approvals'].includes(activeFilter.value));
const toolFilter = computed<MobileToolActivityFilter>(() => activeFilter.value === 'errors' || activeFilter.value === 'approvals' ? activeFilter.value : 'all');
const visibleToolCount = computed(() => {
  if (toolFilter.value === 'errors') return errorActivities.value.length;
  if (toolFilter.value === 'approvals') return approvalActivities.value.length;
  return toolActivities.value.length;
});
const taskPlanSummary = computed(() => {
  if (!hasTeamContext.value) return 'Select a team run to see task activity.';
  if (!taskCards.value.length) return 'No task plan updates yet.';
  return `${taskCards.value.length} task update${taskCards.value.length === 1 ? '' : 's'}.`;
});
const messageSummary = computed(() => {
  if (!hasTeamContext.value) return 'Select a team run to see team messages.';
  if (!teamMessages.value.length) return 'No team messages yet for the focused member.';
  return `${teamMessages.value.length} message${teamMessages.value.length === 1 ? '' : 's'}; open details for full text.`;
});
const toolSummary = computed(() => {
  if (!runId.value) return 'Select a run to see run and tool history.';
  if (!toolActivities.value.length) return 'No tool activity has been recorded for this run yet.';
  if (toolFilter.value === 'errors') return `${errorActivities.value.length} error/denied item${errorActivities.value.length === 1 ? '' : 's'}.`;
  if (toolFilter.value === 'approvals') return `${approvalActivities.value.length} approval item${approvalActivities.value.length === 1 ? '' : 's'}.`;
  return `${toolActivities.value.length} activity item${toolActivities.value.length === 1 ? '' : 's'}; rows are compact by default.`;
});
</script>
