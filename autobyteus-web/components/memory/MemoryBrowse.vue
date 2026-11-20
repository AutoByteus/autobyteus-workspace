<template>
  <div class="space-y-5" data-test="memory-browse">
    <!-- A tab (Global, Agents, Agent Teams, Agent Orgs) with its cards; no filter box: a node holds few owners. -->
    <template v-if="!owner">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1" role="tablist">
          <button
            v-for="tab in groupTabs"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="node.group === tab.key"
            class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition"
            :class="node.group === tab.key ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
            :data-test="`memory-browse-tab-${tab.key}`"
            @click="$emit('selectNode', tab.key)"
          >{{ $t(tab.label) }}</button>
        </div>
        <div v-if="explorer.sources.length > 1" class="flex items-center gap-2">
          <label class="sr-only" for="memory-source-select">{{ $t('memory.components.memory.MemoryHome.memorySource') }}</label>
          <select id="memory-source-select" :value="explorer.selectedSource.key" class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" @change="$emit('changeSource', ($event.target as HTMLSelectElement).value)">
            <option v-for="source in explorer.sources" :key="source.key" :value="source.key">{{ source.label }}</option>
          </select>
          <span v-if="imported" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
        </div>
      </div>
      <p v-if="explorer.sourceError" class="text-xs text-red-600">{{ explorer.sourceError }}</p>

      <!-- Global: the node's global semantic memory folder, read only (REQ-012). -->
      <div v-if="node.group === 'global'" class="space-y-5" data-test="global-memory-page">
        <header>
          <h1 class="text-xl font-semibold text-gray-900">{{ $t('memory.global.title') }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ $t('memory.global.subtitle') }}</p>
        </header>
        <SemanticMemoryFolder :agent-definition-id="null" :agent-name="$t('memory.global.title')" :imported="imported" />
      </div>
      <div v-else-if="explorer.ownersLoading && !cards.length" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
      <div v-else-if="explorer.ownersError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ explorer.ownersError }}
        <button class="ml-2 font-semibold underline" @click="explorer.fetchOwners()">{{ $t('memory.results.retry') }}</button>
      </div>
      <div v-else-if="!cards.length" class="py-16 text-center text-sm text-gray-500">{{ $t(emptyText[node.group] ?? emptyText.agents!) }}</div>
      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" :data-test="`memory-group-cards-${node.group}`">
        <button v-for="card in cards" :key="card.key" :class="cardClass" data-test="memory-owner-card" @click="$emit('selectNode', card.key)">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="break-words text-base font-semibold text-gray-900">{{ card.name }}</h2>
              <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ card.id }}</p>
            </div>
            <span v-if="card.runCount !== null" :class="countClass">{{ card.runCount }} runs</span>
          </div>
          <p v-if="card.memberCount !== null" class="mt-3 text-xs text-gray-500">{{ card.memberCount }} {{ $t('memory.components.memory.MemoryHome.members') }}<span v-if="card.latest"> · {{ formatTimestamp(card.latest) }}</span></p>
          <p v-else-if="card.latest" class="mt-3 text-xs text-gray-500">{{ formatTimestamp(card.latest) }}</p>
        </button>
      </div>
    </template>

    <!-- An owner's page: Back returns to the card it was opened from (its tab, or the team or org it was reached through). -->
    <template v-else>
      <button class="text-sm font-medium text-blue-600 hover:underline" data-test="memory-owner-back" @click="$emit('selectNode', parentKey)">← {{ backLabel }}</button>
      <div v-if="ownerName === null && explorer.ownersLoading" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
      <div v-else-if="ownerName === null" class="py-16 text-center text-sm text-gray-500" data-test="memory-owner-not-found">{{ $t('memory.browse.not_found') }}</div>
      <AgentMemoryPage
        v-else-if="owner.kind === 'agent' || owner.kind === 'unattributed'"
        :agent-definition-id="owner.kind === 'agent' ? owner.id : null"
        :name="ownerName"
        :pane="pane === 'semantic' && owner.kind === 'agent' ? 'semantic' : 'episodic'"
        :imported="imported"
        @change-pane="(next) => $emit('selectNode', node.key, next === 'semantic' ? 'semantic' : undefined)"
        @open-episode="(episode) => $emit('openEpisode', episode, ownerName!)"
      />
      <GroupMemoryPage
        v-else
        :kind="owner.kind === 'org' ? 'ORG' : 'TEAM'"
        :definition-id="owner.id"
        :name="ownerName"
        :pane="pane === 'runs' ? 'runs' : 'members'"
        :imported="imported"
        @change-pane="(next) => $emit('selectNode', node.key, next === 'runs' ? 'runs' : undefined)"
        @select-member="(member) => $emit('selectNode', childNodeKey(node.key, { kind: member.kind === 'TEAM' ? 'team' : 'agent', id: member.id }))"
        @inspect-member="(runId, member) => $emit('inspectMember', runId, member, ownerName!)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AgentMemoryPage from './AgentMemoryPage.vue';
import GroupMemoryPage from './GroupMemoryPage.vue';
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
  /** `ownerName`: the team's or org's, for the inspector's Back. */
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary, ownerName: string];
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
const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const countClass = 'flex-shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600';

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

const backLabel = computed(() => {
  const parent = parseMemoryBrowseNode(parentKey.value);
  const parentOwner = ownerOf(parent);
  if (!parentOwner) return t('memory.components.memory.AgentMemoryDetail.back_to_memory');
  return t('memory.semantic.back_to', { name: nameOf(parentOwner) ?? parentOwner.id });
});

const formatTimestamp = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resolvedLocale.value);
};
</script>
