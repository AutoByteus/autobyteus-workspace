<template>
  <div class="mx-auto max-w-7xl space-y-5 p-8">
    <button class="text-sm font-medium text-blue-600 hover:underline" @click="$emit('back')">← {{ $t('memory.components.memory.CollaborationMemoryDetail.back_to_memory') }}</button>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold text-gray-900">{{ title }}</h1>
        <span v-if="readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
      </div>
      <div class="relative w-full sm:w-80">
        <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input v-model="searchInput" type="text" :placeholder="$t('memory.components.memory.CollaborationMemoryDetail.search_runs')" :aria-label="$t('memory.browse.filter_label')" class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" @keyup.enter="applySearch" />
      </div>
    </div>

    <div v-if="loading && rows.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.loading_runs') }}</div>
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
      <button class="ml-2 font-semibold underline" @click="$emit('retry')">Retry</button>
    </div>
    <div v-else-if="rows.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.no_runs_match_this_filter') }}</div>
    <div v-else class="space-y-4">
      <article v-for="row in rows" :key="row.runId" class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <h3 class="break-words font-semibold text-gray-900">{{ row.summary || row.runId }}</h3>
            <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ row.runId }}</p>
            <p v-if="row.workspaceRootPath" class="mt-1 break-all text-xs text-gray-500">{{ row.workspaceRootPath }}</p>
          </div>
          <span v-if="row.lastUpdatedAt" class="shrink-0 text-xs text-gray-500">{{ formatTimestamp(row.lastUpdatedAt) }}</span>
        </div>
        <MemoryBadges class="mt-3" :memory="row.memory" />
        <div class="mt-4">
          <div class="space-y-2">
            <div
              v-for="block in memberBlocks(row)"
              :key="`${row.runId}:${block.key}`"
              :class="block.depth > 0 ? ['border-l pl-3', block.group?.kind === 'TASK_TEAM' ? 'border-dashed border-indigo-300' : 'border-slate-300'] : []"
              :style="block.depth > 1 ? { marginLeft: `${(block.depth - 1) * 1}rem` } : undefined"
              :data-group-run-id="block.group?.teamRunId"
              :data-group-kind="block.group?.kind"
            >
              <div
                v-if="block.group"
                class="mb-2 flex min-w-0 items-center gap-1.5 text-xs"
                :class="block.group.kind === 'TASK_TEAM' ? 'text-indigo-700' : 'text-gray-700'"
                data-test="memory-member-group-header"
              >
                <span
                  v-if="block.group.kind === 'TASK_TEAM'"
                  class="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[0.2rem] border border-dashed border-indigo-400 bg-white text-indigo-600"
                  aria-hidden="true"
                ><Icon icon="heroicons:user-group-20-solid" class="h-3 w-3" /></span>
                <Icon v-else icon="heroicons:user-group-20-solid" class="h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
                <span class="break-all font-semibold">{{ block.group.displayName }}</span>
                <span v-if="block.group.kind === 'TASK_TEAM'" class="shrink-0 text-indigo-500">· {{ taskTeamLabel(block.group.startedAt) }}</span>
              </div>
              <div v-if="block.members.length" class="flex flex-wrap gap-2">
                <button
                  v-for="{ member, label } in block.members"
                  :key="`${row.runId}:${member.agentRunId}`"
                  class="max-w-full rounded-lg border px-3 py-2 text-left text-xs"
                  :class="isTaskMember(member) ? 'border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'"
                  :data-execution-kind="member.executionKind"
                  @click="$emit('inspectMember', row.runId, member)"
                >
                  <span class="block break-all font-semibold text-gray-800">{{ label }}</span>
                  <span v-if="member.executionKind === 'TASK_AGENT'" class="block text-indigo-600">{{ taskAgentLabel(member.startedAt) }}</span>
                  <span class="block break-all font-mono text-gray-500">{{ member.agentRunId }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 text-xs text-gray-500">
      <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="page <= 1" @click="$emit('changePage', page - 1)">Prev</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="page >= totalPages" @click="$emit('changePage', page + 1)">Next</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type { CollaborationMemberMemoryTargetSummary, CollaborationRunMemoryRow } from '~/types/memory';
import MemoryBadges from './MemoryBadges.vue';
import { buildCollaborationMemberBlocks, isTaskMember } from './collaborationMemberTree';

/** Presentational run list with members for one team or org definition; the page owns data and actions. */
const props = defineProps<{
  title: string;
  rows: CollaborationRunMemoryRow[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  search: string;
  readOnly: boolean;
}>();
const emit = defineEmits<{
  back: [];
  search: [query: string];
  changePage: [page: number];
  retry: [];
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary];
}>();

const { t } = useLocalization();
const searchInput = ref(props.search);

watch(() => props.search, (value) => { searchInput.value = value; });

const applySearch = () => emit('search', searchInput.value.trim());
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (value) => {
  if (value.trim() === props.search) return;
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(applySearch, 300);
});

/** Each run's members as blocks: its own agents, then configured and task teams (REQ-012). */
const memberBlocks = (row: CollaborationRunMemoryRow) => buildCollaborationMemberBlocks(row.memberTargets);

const taskAgentLabel = (startedAt?: string | null) => startedAt
  ? t('memory.components.memory.CollaborationMemoryDetail.task_started', { timestamp: formatTimestamp(startedAt) })
  : t('memory.components.memory.CollaborationMemoryDetail.task');

const taskTeamLabel = (startedAt?: string | null) => startedAt
  ? t('memory.components.memory.CollaborationMemoryDetail.task_team_started', { timestamp: formatTimestamp(startedAt) })
  : t('memory.components.memory.CollaborationMemoryDetail.task_team');

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
