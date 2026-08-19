<template>
  <div class="mx-auto max-w-5xl p-6">
    <button class="mb-4 text-sm font-semibold text-blue-600 hover:underline" @click="$emit('back')">← {{ $t('memory.components.memory.AgentTeamMemoryDetail.back_to_memory') }}</button>

    <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
        <h1 class="font-semibold text-gray-900">{{ teamName }}</h1>
        <span v-if="store.selectedSource.readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
        <div class="flex gap-2">
          <input v-model="searchInput" type="text" :placeholder="$t('memory.components.memory.AgentTeamMemoryDetail.search_runs')" class="min-w-[260px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="applySearch" />
          <button class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800" @click="applySearch">Search</button>
        </div>
      </div>

      <div class="p-4">
        <div v-if="store.teamRuns.loading && store.teamRuns.entries.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentTeamMemoryDetail.loading_runs') }}</div>
        <div v-else-if="store.teamRuns.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ store.teamRuns.error }}
          <button class="ml-2 font-semibold underline" @click="retry">Retry</button>
        </div>
        <div v-else-if="store.teamRuns.entries.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentTeamMemoryDetail.no_runs_match_this_filter') }}</div>
        <div v-else class="space-y-3">
          <article v-for="run in store.teamRuns.entries" :key="run.teamRunId" class="rounded-xl border border-gray-200 p-4">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">{{ run.summary || run.teamRunId }}</h3>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ run.teamRunId }}</p>
                <p v-if="run.workspaceRootPath" class="mt-1 text-xs text-gray-500">{{ run.workspaceRootPath }}</p>
              </div>
              <span v-if="run.lastUpdatedAt" class="text-xs text-gray-500">{{ formatTimestamp(run.lastUpdatedAt) }}</span>
            </div>
            <MemoryBadges class="mt-3" :memory="run.memory" />
            <div class="mt-4 border-t border-gray-100 pt-3">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ $t('memory.components.memory.AgentTeamMemoryDetail.members') }}</h4>
              <div class="flex flex-wrap gap-2">
                <button v-for="member in run.memberTargets" :key="`${run.teamRunId}:${member.agentRunId}`" class="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs hover:border-blue-300 hover:bg-blue-50" @click="$emit('inspectMember', run, member)">
                  <span class="block font-semibold text-gray-800">{{ member.memberName }}</span>
                  <span class="block font-mono text-gray-500">{{ member.agentRunId }}</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <footer class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="store.teamRuns.page <= 1" @click="changePage(store.teamRuns.page - 1)">Prev</button>
        <span>Page {{ store.teamRuns.page }} / {{ store.teamRuns.totalPages }}</span>
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="store.teamRuns.page >= store.teamRuns.totalPages" @click="changePage(store.teamRuns.page + 1)">Next</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import type { AgentTeamRunMemorySummary, TeamMemberMemoryTargetSummary } from '~/types/memory';
import MemoryBadges from './MemoryBadges.vue';

const props = defineProps<{ teamDefinitionId: string }>();
defineEmits<{
  back: [];
  inspectMember: [run: AgentTeamRunMemorySummary, member: TeamMemberMemoryTargetSummary];
}>();

const store = useMemoryExplorerStore();
const searchInput = ref(store.teamRuns.search);
const teamName = computed(() => store.selectedTeam?.teamDefinitionName || props.teamDefinitionId);

watch(() => store.teamRuns.search, (value) => { searchInput.value = value; });

const applySearch = async () => store.setTeamRunsSearch(props.teamDefinitionId, searchInput.value.trim());
const retry = async () => store.fetchTeamRuns(props.teamDefinitionId);
const changePage = async (page: number) => store.changeTeamRunsPage(props.teamDefinitionId, page);

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
