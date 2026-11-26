<template>
  <div class="flex min-h-0 flex-col space-y-4" data-test="group-memory-page">
    <!-- One header row (autobyteus-608 DC-002): Back and the name (no "Agent Team" / "Agent Org" label: it is in the
         name's tooltip, with the ID); the Runs filter (Runs) and the Members / Runs switch at the right (DC-012). -->
    <MemoryPageHeader :back-text="backText" :back-label="backLabel" @back="$emit('back')">
      <h1 class="min-w-0 truncate text-lg font-semibold tracking-tight text-gray-900" :title="`${kind === 'ORG' ? $t('memory.group.org') : $t('memory.group.team')} · ${definitionId}`">{{ name }}</h1>
      <span v-if="imported" class="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
      <template #actions>
        <div v-if="pane === 'runs'" class="relative w-full sm:w-60">
          <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input v-model="runFilter" type="text" :placeholder="$t('memory.components.memory.CollaborationMemoryDetail.search_runs')" :aria-label="$t('memory.browse.filter_label')" class="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" data-test="group-runs-filter" @keyup.enter="applyRunFilter" />
        </div>
        <MemoryPaneSwitch :tabs="tabs" :selected="pane" test-id-prefix="group-memory-tab-" @select="(next) => $emit('changePane', next)" />
      </template>
    </MemoryPageHeader>

    <template v-if="pane === 'members'">
      <div v-if="!membersShown || (members.loading && !members.entries.length)" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
      <div v-else-if="members.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ members.error }}
        <button class="ml-2 font-semibold underline" @click="explorer.fetchMembers(kind, definitionId)">{{ $t('memory.results.retry') }}</button>
      </div>
      <!-- Member cards without IDs (DC-006): the ID is in the name's tooltip. -->
      <div v-else class="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3" data-test="group-members">
        <button v-for="member in members.entries" :key="`${member.kind}:${member.id}`" :class="cardClass" data-test="group-member" @click="$emit('selectMember', member)">
          <div class="flex min-w-0 items-center gap-2">
            <Icon :icon="member.kind === 'TEAM' ? 'heroicons:user-group' : 'heroicons:user'" class="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
            <h2 class="min-w-0 truncate text-sm font-semibold text-gray-900" :title="member.id">{{ member.name }}</h2>
          </div>
          <p v-if="member.kind === 'TEAM'" class="mt-2.5 text-xs text-gray-500">{{ $t('memory.group.team') }} · {{ $t('memory.group.member_count', { count: member.memberCount ?? 0 }) }}</p>
          <p v-else-if="member.shared" class="mt-2.5"><span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600" :title="$t('memory.browse.shared_help')">{{ $t('memory.group.shared_agent') }}</span></p>
        </button>
      </div>
    </template>

    <CollaborationMemoryDetail
      v-else
      :rows="rows"
      :loading="runs.loading"
      :error="runs.error"
      :page="runs.page"
      :total-pages="runs.totalPages"
      @change-page="changeRunsPage"
      @retry="fetchRuns"
      @inspect-member="(runId, member, runLabel) => $emit('inspectMember', runId, member, runLabel)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import CollaborationMemoryDetail from './CollaborationMemoryDetail.vue';
import MemoryPageHeader from './MemoryPageHeader.vue';
import MemoryPaneSwitch, { type MemoryPaneTab } from './MemoryPaneSwitch.vue';
import { useLocalization } from '~/composables/useLocalization';
import { groupMembersKey, useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import type { CollaborationMemberMemoryTargetSummary, CollaborationRunMemoryRow, MemoryGroupKind, MemoryGroupMember } from '~/types/memory';

/**
 * A team's or an org's memory (autobyteus-554, UXJ-004, UXJ-005): its members (each opens its agent or team page; a
 * shared agent opens the same page as from Agents) and its runs (the team's or org's run list, filtered from the page's
 * header). `backText`: where Back goes, shown; `backLabel`: its accessible name ("Back to …").
 */
export type GroupPane = 'members' | 'runs';
const props = defineProps<{ kind: MemoryGroupKind; definitionId: string; name: string; pane: GroupPane; imported: boolean; backText: string; backLabel: string }>();
defineEmits<{
  back: [];
  changePane: [pane: GroupPane];
  selectMember: [member: MemoryGroupMember];
  /** `runLabel`: the run's summary, the member run page's title (autobyteus-608 DEC-002). */
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary, runLabel: string | null];
}>();

const { t } = useLocalization();
const explorer = useMemoryExplorerStore();
const members = computed(() => explorer.members);
const membersShown = computed(() => explorer.members.key === groupMembersKey(props.kind, props.definitionId));
const runs = computed(() => (props.kind === 'ORG' ? explorer.orgRuns : explorer.teamRuns));
const rows = computed((): CollaborationRunMemoryRow[] => (props.kind === 'ORG'
  ? explorer.orgRuns.entries.map((run) => ({ ...run, runId: run.orgRunId }))
  : explorer.teamRuns.entries.map((run) => ({ ...run, runId: run.teamRunId }))));

/** The Runs count comes from the card (the node's count of this team's or org's runs). */
const runCount = computed((): number | null => {
  if (props.kind === 'ORG') return explorer.orgs.entries.find((org) => org.orgDefinitionId === props.definitionId)?.orgRunCount ?? null;
  return explorer.teams.entries.find((team) => team.teamDefinitionId === props.definitionId)?.teamRunCount ?? null;
});
const tabs = computed((): Array<MemoryPaneTab<GroupPane>> => [
  { id: 'members', label: t('memory.group.members'), count: membersShown.value && !explorer.members.loading ? explorer.members.entries.length : null },
  { id: 'runs', label: t('memory.group.runs'), count: runCount.value },
]);

const fetchRuns = () => (props.kind === 'ORG' ? explorer.fetchOrgRuns(props.definitionId) : explorer.fetchTeamRuns(props.definitionId));
const searchRuns = (search: string) => (props.kind === 'ORG'
  ? explorer.setOrgRunsSearch(props.definitionId, search) : explorer.setTeamRunsSearch(props.definitionId, search));
const changeRunsPage = (page: number) => (props.kind === 'ORG'
  ? explorer.changeOrgRunsPage(props.definitionId, page) : explorer.changeTeamRunsPage(props.definitionId, page));

/** The Runs filter asks the node 300 ms after typing, or at once on Enter (TR-003), as the run list's own filter did. */
const runFilter = ref(runs.value.search);
watch(() => runs.value.search, (value) => { if (value !== runFilter.value.trim()) runFilter.value = value; });
let filterTimer: ReturnType<typeof setTimeout> | null = null;
const applyRunFilter = () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = null;
  if (runFilter.value.trim() !== runs.value.search) void searchRuns(runFilter.value.trim());
};
watch(runFilter, (value) => {
  if (value.trim() === runs.value.search) return;
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(applyRunFilter, 300);
});

const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
</script>
