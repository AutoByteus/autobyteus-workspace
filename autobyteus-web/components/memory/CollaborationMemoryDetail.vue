<template>
  <div class="mx-auto max-w-5xl p-6">
    <button class="mb-4 text-sm font-semibold text-blue-600 hover:underline" @click="$emit('back')">← {{ $t('memory.components.memory.CollaborationMemoryDetail.back_to_memory') }}</button>

    <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
        <h1 class="font-semibold text-gray-900">{{ title }}</h1>
        <span v-if="readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
        <div class="flex gap-2">
          <input v-model="searchInput" type="text" :placeholder="$t('memory.components.memory.CollaborationMemoryDetail.search_runs')" class="min-w-[260px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="applySearch" />
          <button class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800" @click="applySearch">Search</button>
        </div>
      </div>

      <div class="p-4">
        <div v-if="loading && rows.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.loading_runs') }}</div>
        <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ error }}
          <button class="ml-2 font-semibold underline" @click="$emit('retry')">Retry</button>
        </div>
        <div v-else-if="rows.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.no_runs_match_this_filter') }}</div>
        <div v-else class="space-y-3">
          <article v-for="row in rows" :key="row.runId" class="rounded-xl border border-gray-200 p-4">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <h3 class="break-words font-semibold text-gray-900">{{ row.summary || row.runId }}</h3>
                <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ row.runId }}</p>
                <p v-if="row.workspaceRootPath" class="mt-1 break-all text-xs text-gray-500">{{ row.workspaceRootPath }}</p>
              </div>
              <span v-if="row.lastUpdatedAt" class="shrink-0 text-xs text-gray-500">{{ formatTimestamp(row.lastUpdatedAt) }}</span>
            </div>
            <MemoryBadges class="mt-3" :memory="row.memory" />
            <div class="mt-4 border-t border-gray-100 pt-3">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ $t('memory.components.memory.CollaborationMemoryDetail.members') }}</h4>
              <div class="flex flex-wrap gap-2">
                <button v-for="member in row.memberTargets" :key="`${row.runId}:${member.agentRunId}`" class="max-w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-xs hover:border-blue-300 hover:bg-blue-50" @click="$emit('inspectMember', row.runId, member)">
                  <span class="block break-all font-semibold text-gray-800">{{ member.displayName }}</span>
                  <span class="block break-all font-mono text-gray-500">{{ member.agentRunId }}</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <footer class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="page <= 1" @click="$emit('changePage', page - 1)">Prev</button>
        <span>Page {{ page }} / {{ totalPages }}</span>
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="page >= totalPages" @click="$emit('changePage', page + 1)">Next</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CollaborationMemberMemoryTargetSummary, CollaborationRunMemoryRow } from '~/types/memory';
import MemoryBadges from './MemoryBadges.vue';

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

const searchInput = ref(props.search);

watch(() => props.search, (value) => { searchInput.value = value; });

const applySearch = () => emit('search', searchInput.value.trim());

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
