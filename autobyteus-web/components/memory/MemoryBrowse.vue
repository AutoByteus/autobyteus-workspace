<template>
  <div class="flex min-h-0 flex-col space-y-4" data-test="memory-browse">
    <!-- A tab (Global, Agents, Agent Teams, Agent Orgs) with its cards; no filter box: a node holds few owners. The tabs
         share one row with Browse · Search · Index (the `sections` slot) (autobyteus-608 DC-001). -->
    <template v-if="!owner">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <slot name="sections" />
          <span class="hidden h-5 w-px bg-gray-200 sm:inline-block" aria-hidden="true" />
          <div class="flex flex-wrap items-center gap-1" role="tablist">
            <button
              v-for="tab in groupTabs"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="node.group === tab.key"
              class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="node.group === tab.key ? 'bg-gray-200/80 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
              :title="tab.key === 'global' ? $t('memory.global.subtitle') : undefined"
              :data-test="`memory-browse-tab-${tab.key}`"
              @click="$emit('selectNode', tab.key)"
            >{{ $t(tab.label) }}</button>
          </div>
        </div>
        <div v-if="explorer.sources.length > 1" class="flex items-center gap-2">
          <label class="sr-only" for="memory-source-select">{{ $t('memory.components.memory.MemoryHome.memorySource') }}</label>
          <select id="memory-source-select" :value="explorer.selectedSource.key" class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm" @change="$emit('changeSource', ($event.target as HTMLSelectElement).value)">
            <option v-for="source in explorer.sources" :key="source.key" :value="source.key">{{ source.label }}</option>
          </select>
          <span v-if="imported" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
        </div>
      </div>
      <p v-if="explorer.sourceError" class="text-xs text-red-600">{{ explorer.sourceError }}</p>

      <!-- Global: the node's global semantic memory folder, read only (REQ-012). No title row: the selected tab says where
           you are and its tooltip what Global memory is; the heading stays for screen readers (autobyteus-608 DC-003). -->
      <div v-if="node.group === 'global'" class="flex min-h-0 flex-1 flex-col" data-test="global-memory-page">
        <h1 class="sr-only">{{ $t('memory.global.title') }}</h1>
        <SemanticMemoryFolder class="min-h-0 flex-1" :agent-definition-id="null" :agent-name="$t('memory.global.title')" :imported="imported" />
      </div>
      <div v-else-if="explorer.ownersLoading && !cards.length" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
      <div v-else-if="explorer.ownersError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ explorer.ownersError }}
        <button class="ml-2 font-semibold underline" @click="explorer.fetchOwners()">{{ $t('memory.results.retry') }}</button>
      </div>
      <div v-else-if="!cards.length" class="py-16 text-center text-sm text-gray-500">{{ $t(emptyText[node.group] ?? emptyText.agents!) }}</div>
      <div v-else class="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3" :data-test="`memory-group-cards-${node.group}`">
        <!-- No ID line (autobyteus-608 DC-006): the name says whose memory it is; the ID is in its tooltip. -->
        <button v-for="card in cards" :key="card.key" :class="cardClass" data-test="memory-owner-card" @click="$emit('selectNode', card.key)">
          <div class="flex items-start justify-between gap-3">
            <h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900" :title="card.id">{{ card.name }}</h2>
            <span v-if="card.runCount !== null" :class="countClass">{{ card.runCount === 1 ? $t('memory.browse.one_run') : $t('memory.browse.run_count', { count: card.runCount }) }}</span>
          </div>
          <p v-if="card.memberCount !== null" class="mt-2.5 text-xs text-gray-500">{{ card.memberCount }} {{ $t('memory.components.memory.MemoryHome.members') }}<span v-if="card.latest"> · {{ formatTimestamp(card.latest) }}</span></p>
          <p v-else-if="card.latest" class="mt-2.5 text-xs text-gray-500">{{ formatTimestamp(card.latest) }}</p>
        </button>
      </div>
    </template>

    <!-- An owner's page is its own page (autobyteus-608 DC-001): no Browse · Search · Index. Its header's Back returns to
         the card it was opened from (its tab, or the team or org it was reached through) and shows where it goes. -->
    <template v-else>
      <template v-if="ownerName === null">
        <MemoryPageHeader :back-text="backText" :back-label="backLabel" @back="$emit('selectNode', parentKey)" />
        <div v-if="ownersPending" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
        <div v-else class="py-16 text-center text-sm text-gray-500" data-test="memory-owner-not-found">{{ $t('memory.browse.not_found') }}</div>
      </template>
      <AgentMemoryPage
        v-else-if="owner.kind === 'agent' || owner.kind === 'unattributed'"
        class="min-h-0 flex-1"
        :agent-definition-id="owner.kind === 'agent' ? owner.id : null"
        :name="ownerName"
        :pane="pane === 'semantic' && owner.kind === 'agent' ? 'semantic' : 'episodic'"
        :imported="imported"
        :back-text="backText"
        :back-label="backLabel"
        @back="$emit('selectNode', parentKey)"
        @change-pane="(next) => $emit('selectNode', node.key, next === 'semantic' ? 'semantic' : undefined)"
        @open-episode="(episode) => $emit('openEpisode', episode, ownerName!)"
      />
      <GroupMemoryPage
        v-else
        class="min-h-0 flex-1"
        :kind="owner.kind === 'org' ? 'ORG' : 'TEAM'"
        :definition-id="owner.id"
        :name="ownerName"
        :pane="pane === 'runs' ? 'runs' : 'members'"
        :imported="imported"
        :back-text="backText"
        :back-label="backLabel"
        @back="$emit('selectNode', parentKey)"
        @change-pane="(next) => $emit('selectNode', node.key, next === 'runs' ? 'runs' : undefined)"
        @select-member="(member) => $emit('selectNode', childNodeKey(node.key, { kind: member.kind === 'TEAM' ? 'team' : 'agent', id: member.id }))"
        @inspect-member="(runId, member, runLabel) => $emit('inspectMember', runId, member, ownerName!, runLabel)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AgentMemoryPage from './AgentMemoryPage.vue';
import GroupMemoryPage from './GroupMemoryPage.vue';
import MemoryPageHeader from './MemoryPageHeader.vue';
import SemanticMemoryFolder from './SemanticMemoryFolder.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import type { AgentEpisode, CollaborationMemberMemoryTargetSummary } from '~/types/memory';
import {
  childNodeKey,
  ownerOf,
  parentNodeKey,
  parseMemoryBrowseNode,
  type MemoryBrowseGroup,
  type MemoryOwnerRef,
} from '~/utils/memoryBrowseNode';

/**
 * Memory → Browse, organised by owner (autobyteus-554, UI/UX spec UXJ-001…UXJ-005): tabs Global · Agents · Agent Teams ·
 * Agent Orgs with their cards; an agent card opens the agent's page (Episodic and Semantic memory), a team or org card
 * its page (Members and Runs), whose members open their own pages. The page loads what each address shows.
 */
const props = defineProps<{ nodeKey: string; pane: string | null }>();
defineEmits<{
  changeSource: [sourceKey: string];
  selectNode: [nodeKey: string, pane?: string];
  /** `ownerName`: the agent's, for the inspector's Back. */
  openEpisode: [episode: AgentEpisode, ownerName: string];
  /** `ownerName`: the team's or org's, for the inspector's Back; `runLabel`: the run's summary, its title. */
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary, ownerName: string, runLabel: string | null];
}>();

const { t, resolvedLocale } = useLocalization();
const explorer = useMemoryExplorerStore();
const imported = computed(() => explorer.isImportedSource);
const node = computed(() => parseMemoryBrowseNode(props.nodeKey));
const owner = computed(() => ownerOf(node.value));
const parentKey = computed(() => parentNodeKey(node.value));

const groupTabs: Array<{ key: MemoryBrowseGroup; label: string }> = [
  { key: 'global', label: 'memory.global.tab' },
  { key: 'agents', label: 'memory.components.memory.MemoryHome.agents' },
  { key: 'teams', label: 'memory.components.memory.MemoryHome.agent_teams' },
  { key: 'orgs', label: 'memory.components.memory.MemoryHome.agent_orgs' },
];
const emptyText: Partial<Record<MemoryBrowseGroup, string>> = {
  agents: 'memory.components.memory.MemoryHome.no_agent_memories_yet',
  teams: 'memory.components.memory.MemoryHome.no_team_memories_yet',
  orgs: 'memory.components.memory.MemoryHome.no_org_memories_yet',
};
const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const countClass = 'flex-shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600';

interface OwnerCard { key: string; name: string; id: string; runCount: number | null; memberCount: number | null; latest: string | null }

/** The cards of the tab: agents (Unattributed runs last, as the node orders them; no run count), teams or orgs. */
const cards = computed((): OwnerCard[] => {
  const group = node.value.group;
  if (group === 'agents') {
    return explorer.agents.entries.map((agent) => ({
      key: childNodeKey('agents', agent.attribution === 'UNATTRIBUTED' ? { kind: 'unattributed', id: '' } : { kind: 'agent', id: agent.agentDefinitionId ?? '' }),
      name: agent.displayName, id: agent.stableId, runCount: null, memberCount: null, latest: agent.latestMemoryAt ?? null,
    }));
  }
  if (group === 'teams') {
    return explorer.teams.entries.map((team) => ({
      key: childNodeKey('teams', { kind: 'team', id: team.teamDefinitionId }), name: team.teamDefinitionName, id: team.teamDefinitionId,
      runCount: team.teamRunCount, memberCount: team.memberCount ?? 0, latest: team.latestMemoryAt ?? null,
    }));
  }
  if (group === 'orgs') {
    return explorer.orgs.entries.map((org) => ({
      key: childNodeKey('orgs', { kind: 'org', id: org.orgDefinitionId }), name: org.orgDefinitionName, id: org.orgDefinitionId,
      runCount: org.orgRunCount, memberCount: org.memberCount ?? 0, latest: org.latestMemoryAt ?? null,
    }));
  }
  return [];
});

const memberName = (kind: 'AGENT' | 'TEAM', id: string): string | null => {
  for (const members of Object.values(explorer.groupMembers)) {
    const found = members.find((member) => member.kind === kind && member.id === id);
    if (found) return found.name;
  }
  return explorer.members.entries.find((member) => member.kind === kind && member.id === id)?.name ?? null;
};

/** An owner's name from the cards or the members loaded; null when this memory does not know it. */
const nameOf = (ref: MemoryOwnerRef): string | null => {
  if (ref.kind === 'unattributed') return explorer.agents.entries.find((agent) => agent.attribution === 'UNATTRIBUTED')?.displayName ?? null;
  if (ref.kind === 'agent') return explorer.agents.entries.find((agent) => agent.agentDefinitionId === ref.id)?.displayName ?? memberName('AGENT', ref.id);
  if (ref.kind === 'team') return explorer.teams.entries.find((team) => team.teamDefinitionId === ref.id)?.teamDefinitionName ?? memberName('TEAM', ref.id);
  return explorer.orgs.entries.find((org) => org.orgDefinitionId === ref.id)?.orgDefinitionName ?? null;
};
const ownerName = computed(() => (owner.value ? nameOf(owner.value) : null));
/** The cards or the members that could name the owner are still on their way (or not asked yet for this source). */
const ownersPending = computed(() => explorer.ownersLoading || explorer.groupMembersLoading
  || explorer.ownersSourceKey !== explorer.selectedSource.key);

/** Where Back goes: "Memory" from a tab, else the team or org the owner was reached through. */
const parentName = computed((): string | null => {
  const parentOwner = ownerOf(parseMemoryBrowseNode(parentKey.value));
  return parentOwner ? nameOf(parentOwner) ?? parentOwner.id : null;
});
/** What Back shows (autobyteus-608 DC-002); its accessible name and tooltip is `backLabel`. */
const backText = computed(() => parentName.value ?? t('memory.page.title'));
const backLabel = computed(() => (parentName.value === null
  ? t('memory.components.memory.AgentMemoryDetail.back_to_memory')
  : t('memory.semantic.back_to', { name: parentName.value })));

const formatTimestamp = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resolvedLocale.value);
};
</script>
