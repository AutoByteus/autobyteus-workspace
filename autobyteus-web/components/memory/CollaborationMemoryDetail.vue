<template>
  <!-- A team's or org's runs, its page's Runs tab (autobyteus-554); the page's header holds the filter (autobyteus-608). -->
  <div class="space-y-3" data-test="collaboration-runs">
    <div v-if="loading && rows.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.loading_runs') }}</div>
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
      <button class="ml-2 font-semibold underline" @click="$emit('retry')">{{ $t('memory.results.retry') }}</button>
    </div>
    <div v-else-if="rows.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.no_runs_match_this_filter') }}</div>
    <div v-else class="space-y-4">
      <!-- No run ID line (DC-006): it is in the title's tooltip (the filter still matches it); the time beside the title;
           member chips show the member, its run ID in the chip's tooltip. -->
      <article v-for="row in rows" :key="row.runId" class="rounded-lg border border-gray-200 bg-white p-4" data-test="collaboration-run">
        <div class="flex min-w-0 items-baseline justify-between gap-3">
          <h3 class="min-w-0 break-words text-sm font-semibold text-gray-900" :title="row.runId">{{ row.summary || row.runId }}</h3>
          <span v-if="row.lastUpdatedAt" class="shrink-0 text-xs text-gray-400">{{ formatTimestamp(row.lastUpdatedAt) }}</span>
        </div>
        <p v-if="row.workspaceRootPath" class="mt-0.5 truncate text-xs text-gray-500" :title="row.workspaceRootPath">{{ row.workspaceRootPath }}</p>
        <MemoryBadges class="mt-2" :memory="row.memory" />
        <div class="mt-3">
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
                  class="max-w-full rounded-md border border-gray-200 px-2.5 py-1 text-left text-xs hover:border-blue-300 hover:bg-blue-50"
                  :data-execution-kind="member.executionKind"
                  :title="member.agentRunId"
                  data-test="collaboration-member"
                  @click="$emit('inspectMember', row.runId, member, row.summary || null)"
                >
                  <span class="block break-all font-medium text-gray-800">{{ label }}</span>
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
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type { CollaborationMemberMemoryTargetSummary, CollaborationRunMemoryRow } from '~/types/memory';
import MemoryBadges from './MemoryBadges.vue';
import { buildCollaborationMemberBlocks } from './collaborationMemberTree';

/** A team's or org's runs with their members, presentational: the page owns the data, the filter and the actions. */
defineProps<{
  rows: CollaborationRunMemoryRow[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
}>();
defineEmits<{
  changePage: [page: number];
  retry: [];
  /** `runLabel`: the run's summary, the member run page's title (autobyteus-608 DEC-002). */
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary, runLabel: string | null];
}>();

const { t, resolvedLocale } = useLocalization();

/** Each run's members as blocks: its own agents, then configured and task teams (REQ-012). */
const memberBlocks = (row: CollaborationRunMemoryRow) => buildCollaborationMemberBlocks(row.memberTargets);

const taskTeamLabel = (startedAt?: string | null) => startedAt
  ? t('memory.components.memory.CollaborationMemoryDetail.task_team_started', { timestamp: formatTimestamp(startedAt) })
  : t('memory.components.memory.CollaborationMemoryDetail.task_team');

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resolvedLocale.value);
};
</script>
