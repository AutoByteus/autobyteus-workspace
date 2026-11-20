<template>
  <div class="space-y-5" data-test="group-memory-page">
    <header>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="break-words text-xl font-semibold text-gray-900">{{ name }}</h1>
        <span v-if="imported" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
      </div>
      <p class="mt-1 text-sm text-gray-500">{{ kind === 'ORG' ? $t('memory.group.org') : $t('memory.group.team') }}</p>
      <p class="mt-0.5 break-all font-mono text-xs text-gray-400">{{ definitionId }}</p>
    </header>

    <div class="inline-flex max-w-full overflow-x-auto rounded-lg border border-gray-200 bg-white p-1" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="pane === tab.id"
        class="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="pane === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        :data-test="`group-memory-tab-${tab.id}`"
        @click="$emit('changePane', tab.id)"
      >
        {{ tab.label }}
        <span v-if="tab.count !== null" class="text-xs font-semibold" :class="pane === tab.id ? 'text-blue-100' : 'text-gray-400'">{{ tab.count }}</span>
      </button>
    </div>

    <template v-if="pane === 'members'">
      <div v-if="!membersShown || (members.loading && !members.entries.length)" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
      <div v-else-if="members.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ members.error }}
        <button class="ml-2 font-semibold underline" @click="explorer.fetchMembers(kind, definitionId)">{{ $t('memory.results.retry') }}</button>
      </div>
      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-test="group-members">
        <button v-for="member in members.entries" :key="`${member.kind}:${member.id}`" :class="cardClass" data-test="group-member" @click="$emit('selectMember', member)">
          <div class="flex min-w-0 items-center gap-2">
            <Icon :icon="member.kind === 'TEAM' ? 'heroicons:user-group' : 'heroicons:user'" class="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            <h2 class="min-w-0 break-words text-base font-semibold text-gray-900">{{ member.name }}</h2>
          </div>
          <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ member.id }}</p>
          <p v-if="member.kind === 'TEAM'" class="mt-3 text-xs text-gray-500">{{ $t('memory.group.team') }} · {{ $t('memory.group.member_count', { count: member.memberCount ?? 0 }) }}</p>
          <p v-else-if="member.shared" class="mt-3"><span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600" :title="$t('memory.browse.shared_help')">{{ $t('memory.group.shared_agent') }}</span></p>
        </button>
      </div>
    </template>

    <CollaborationMemoryDetail
      v-else
      embedded
      :title="name"
      :rows="rows"
      :loading="runs.loading"
      :error="runs.error"
      :page="runs.page"
      :total-pages="runs.totalPages"
      :search="runs.search"
      :read-only="imported"
      @search="searchRuns"
      @change-page="changeRunsPage"
      @retry="fetchRuns"
      @inspect-member="(runId, member) => $emit('inspectMember', runId, member)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import CollaborationMemoryDetail from './CollaborationMemoryDetail.vue';
import { useLocalization } from '~/composables/useLocalization';
import { groupMembersKey, useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import type { CollaborationMemberMemoryTargetSummary, CollaborationRunMemoryRow, MemoryGroupKind, MemoryGroupMember } from '~/types/memory';

/**
 * A team's or an org's memory (autobyteus-554, UXJ-004, UXJ-005): its members (each opens its agent or team page; a
 * shared agent opens the same page as from Agents) and its runs (the team's or org's run list, embedded).
 */
export type GroupPane = 'members' | 'runs';
const props = defineProps<{ kind: MemoryGroupKind; definitionId: string; name: string; pane: GroupPane; imported: boolean }>();
defineEmits<{
  changePane: [pane: GroupPane];
  selectMember: [member: MemoryGroupMember];
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary];
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
const tabs = computed(() => [
  { id: 'members' as const, label: t('memory.group.members'), count: membersShown.value && !explorer.members.loading ? explorer.members.entries.length : null },
  { id: 'runs' as const, label: t('memory.group.runs'), count: runCount.value },
]);

const fetchRuns = () => (props.kind === 'ORG' ? explorer.fetchOrgRuns(props.definitionId) : explorer.fetchTeamRuns(props.definitionId));
const searchRuns = (search: string) => (props.kind === 'ORG'
  ? explorer.setOrgRunsSearch(props.definitionId, search) : explorer.setTeamRunsSearch(props.definitionId, search));
const changeRunsPage = (page: number) => (props.kind === 'ORG'
  ? explorer.changeOrgRunsPage(props.definitionId, page) : explorer.changeTeamRunsPage(props.definitionId, page));

const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
</script>
