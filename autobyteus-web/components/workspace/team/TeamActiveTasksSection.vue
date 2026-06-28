<template>
  <section data-test="team-active-tasks-section" class="flex max-h-[45%] min-h-[8rem] flex-shrink-0 flex-col border-t border-gray-200 bg-white">
    <button type="button" data-test="team-active-tasks-header" class="flex flex-shrink-0 items-center justify-between px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="sectionExpanded = !sectionExpanded">
      <span class="text-xs font-bold leading-none tracking-wider text-gray-900">
        {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.active_tasks') }}
      </span>
      <span class="flex items-center gap-2 text-xs font-medium text-gray-600">
        <span>{{ activeTaskEntries.length }} {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.active_count') }}</span>
        <span aria-hidden="true">{{ sectionExpanded ? '▾' : '▸' }}</span>
      </span>
    </button>

    <div v-show="sectionExpanded" class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <p v-if="activeTaskEntries.length === 0" data-test="team-active-tasks-empty" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
        {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.empty') }}
      </p>
      <div v-else class="space-y-2">
        <TeamActiveTaskRow
          v-for="entry in activeTaskEntries"
          :key="entry.node.memberRouteKey"
          :entry="entry"
          :expanded="isExpanded(entry.node.memberRouteKey)"
          :focused-member-route-key="teamContext.focusedMemberRouteKey"
          @toggle="toggleExpanded(entry.node.memberRouteKey)"
          @select-member="selectMember"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { deriveActiveTaskEntries, type ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import TeamActiveTaskRow from '~/components/workspace/team/TeamActiveTaskRow.vue';

const props = defineProps<{
  teamContext: AgentTeamContext;
}>();

const emit = defineEmits<{
  (e: 'select-member', memberRouteKey: string): void;
}>();

const sectionExpanded = ref(true);
const expandedTaskRouteKeys = ref<Set<string>>(new Set());
const activeTaskEntries = computed<ActiveTaskEntry[]>(() => deriveActiveTaskEntries(props.teamContext));

watch(() => activeTaskEntries.value.length, (count) => {
  if (count > 0) sectionExpanded.value = true;
});

const isExpanded = (memberRouteKey: string): boolean => expandedTaskRouteKeys.value.has(memberRouteKey);

const toggleExpanded = (memberRouteKey: string): void => {
  const next = new Set(expandedTaskRouteKeys.value);
  if (next.has(memberRouteKey)) next.delete(memberRouteKey);
  else next.add(memberRouteKey);
  expandedTaskRouteKeys.value = next;
};

const selectMember = (memberRouteKey: string): void => emit('select-member', memberRouteKey);
</script>
