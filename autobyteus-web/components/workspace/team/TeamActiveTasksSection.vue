<template>
  <section data-test="team-active-tasks-section" class="flex min-h-0 flex-col overflow-hidden bg-white">
    <button
      type="button"
      data-test="team-active-tasks-header"
      class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
    >
      <div class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transform text-gray-500 transition-transform duration-300"
          :class="collapsed ? '-rotate-90' : ''"
          data-test="team-active-tasks-disclosure"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span class="text-xs font-bold leading-none tracking-wider text-gray-900">
          {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.active_tasks') }}
        </span>
      </div>
      <span class="text-xs font-medium text-gray-600">
        {{ activeTaskEntries.length }} {{ activeTaskEntries.length === 1 ? $t('workspace.components.workspace.team.TeamActiveTasksSection.task_count_singular') : $t('workspace.components.workspace.team.TeamActiveTasksSection.task_count_plural') }}
      </span>
    </button>

    <div v-show="!collapsed" data-test="team-active-tasks-body" class="min-h-0 flex-1 overflow-hidden">
      <div v-if="activeTaskEntries.length === 0" class="flex h-full items-center justify-center p-6">
        <p data-test="team-active-tasks-empty" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.empty') }}
        </p>
      </div>

      <TeamActiveTaskDetailPane
        v-else
        :team-context="teamContext"
        class="h-full"
        @select-member="$emit('select-member', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { deriveActiveTaskEntries, type ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import TeamActiveTaskDetailPane from '~/components/workspace/team/TeamActiveTaskDetailPane.vue';

const props = withDefaults(defineProps<{
  teamContext: AgentTeamContext;
  collapsed?: boolean;
}>(), {
  collapsed: false,
});

defineEmits<{
  (e: 'toggle'): void;
  (e: 'select-member', memberRouteKey: string): void;
}>();

const activeTaskEntries = computed<ActiveTaskEntry[]>(() => deriveActiveTaskEntries(props.teamContext));
</script>
