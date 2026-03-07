<template>
  <div class="flex flex-col h-full bg-white">
    <div class="h-16 flex items-center px-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <div>
        <h1 class="text-lg font-bold text-gray-800">Memory</h1>
        <p class="text-xs text-gray-500">Stored run memories</p>
      </div>
    </div>

    <div class="p-4 border-b border-gray-100 space-y-3">
      <div>
        <label class="block text-xs font-semibold text-gray-600 mb-1">Scope</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md border"
            :class="isAgentScope ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
            @click="changeScope('agent')"
          >
            Agent Runs
          </button>
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md border"
            :class="!isAgentScope ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
            @click="changeScope('team')"
          >
            Team Runs
          </button>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-600 mb-1">Search</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="searchInput"
            type="text"
            :placeholder="isAgentScope ? 'Run id...' : 'Team or member...'"
            class="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="applySearch"
          />
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 w-full"
            @click="applySearch"
          >
            Search
          </button>
        </div>
      </div>

      <div v-if="isAgentScope">
        <label class="block text-xs font-semibold text-gray-600 mb-1">Manual Run Id</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="manualRunId"
            type="text"
            placeholder="run-123"
            class="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="submitManualRunId"
          />
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 w-full"
            @click="submitManualRunId"
          >
            Load
          </button>
        </div>
      </div>
    </div>

    <div class="px-4 pt-3" v-if="showManualSelection">
      <div class="flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
        <div class="text-xs text-blue-900">
          Manual selection:
          <span class="font-mono">{{ agentViewStore.selectedRunId }}</span>
        </div>
        <button
          class="text-xs font-semibold text-blue-700 hover:text-blue-900"
          @click="clearSelection"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-3">
      <div v-if="activeLoading && activeEntries.length === 0" class="py-8 text-center text-sm text-gray-500">
        {{ isAgentScope ? 'Loading memory index...' : 'Loading team memory index...' }}
      </div>

      <div v-else-if="activeError" class="py-4">
        <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ activeError }}
        </div>
        <button
          class="mt-3 w-full px-3 py-2 text-sm font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200"
          @click="retry"
        >
          Retry
        </button>
      </div>

      <div v-else-if="activeEntries.length === 0" class="py-8 text-center text-sm text-gray-500">
        {{ isAgentScope ? 'No memories found.' : 'No team memories found.' }}
      </div>

      <ul v-else-if="isAgentScope" class="space-y-2">
        <li v-for="entry in agentIndexStore.entries" :key="entry.runId">
          <button
            class="w-full text-left rounded-md border px-3 py-2 transition-colors"
            :class="entry.runId === agentViewStore.selectedRunId ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
            @click="selectAgentRun(entry.runId)"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs text-gray-800">{{ entry.runId }}</span>
              <span class="text-[10px] text-gray-400">
                {{ formatTimestamp(entry.lastUpdatedAt ?? null) }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
              <span v-if="entry.hasWorkingContext">Working</span>
              <span v-if="entry.hasEpisodic">Episodic</span>
              <span v-if="entry.hasSemantic">Semantic</span>
              <span v-if="entry.hasRawTraces">Traces</span>
              <span v-if="!entry.hasWorkingContext && !entry.hasEpisodic && !entry.hasSemantic && !entry.hasRawTraces">
                Empty
              </span>
            </div>
          </button>
        </li>
      </ul>

      <ul v-else class="space-y-2">
        <li v-for="team in teamIndexStore.entries" :key="team.teamRunId" class="rounded-md border border-gray-200">
          <button
            class="w-full text-left px-3 py-2 transition-colors hover:bg-gray-50"
            @click="toggleTeam(team.teamRunId)"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-semibold text-gray-800">{{ team.teamDefinitionName }}</div>
                <div class="font-mono text-[10px] text-gray-500">{{ team.teamRunId }}</div>
              </div>
              <div class="text-[10px] text-gray-400">
                {{ formatTimestamp(team.lastUpdatedAt ?? null) }}
              </div>
            </div>
          </button>

          <div v-if="teamIndexStore.isTeamExpanded(team.teamRunId)" class="border-t border-gray-100 px-2 py-2 space-y-1">
            <div v-if="team.members.length === 0" class="px-2 py-1 text-xs text-gray-400">
              No members.
            </div>
            <button
              v-for="member in team.members"
              :key="`${team.teamRunId}:${member.memberRouteKey}:${member.memberRunId}`"
              class="w-full text-left rounded-md border px-2 py-2 transition-colors"
              :class="isSelectedTeamMember(team.teamRunId, member.memberRunId) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
              @click="selectTeamMember(team.teamRunId, team.teamDefinitionName, member.memberRouteKey, member.memberName, member.memberRunId)"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-gray-800">{{ member.memberName }}</span>
                <span class="text-[10px] text-gray-400">{{ formatTimestamp(member.lastUpdatedAt ?? null) }}</span>
              </div>
              <div class="font-mono text-[10px] text-gray-500 mt-1">{{ member.memberRunId }}</div>
              <div class="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                <span v-if="member.hasWorkingContext">Working</span>
                <span v-if="member.hasEpisodic">Episodic</span>
                <span v-if="member.hasSemantic">Semantic</span>
                <span v-if="member.hasRawTraces">Traces</span>
                <span v-if="!member.hasWorkingContext && !member.hasEpisodic && !member.hasSemantic && !member.hasRawTraces">Empty</span>
              </div>
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
      <button
        class="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        :disabled="activePage <= 1"
        @click="previousPage"
      >
        Prev
      </button>
      <div>
        Page {{ activePage }} / {{ activeTotalPages }}
      </div>
      <button
        class="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        :disabled="activePage >= activeTotalPages"
        @click="nextPage"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAgentMemoryIndexStore } from '~/stores/agentMemoryIndexStore';
import { useAgentMemoryViewStore } from '~/stores/agentMemoryViewStore';
import { useMemoryScopeStore, type MemoryScope } from '~/stores/memoryScopeStore';
import { useTeamMemoryIndexStore } from '~/stores/teamMemoryIndexStore';
import { useTeamMemoryViewStore } from '~/stores/teamMemoryViewStore';

const scopeStore = useMemoryScopeStore();
const agentIndexStore = useAgentMemoryIndexStore();
const agentViewStore = useAgentMemoryViewStore();
const teamIndexStore = useTeamMemoryIndexStore();
const teamViewStore = useTeamMemoryViewStore();

const searchInput = ref(scopeStore.scope === 'agent' ? agentIndexStore.search : teamIndexStore.search);
const manualRunId = ref('');

const isAgentScope = computed(() => scopeStore.scope === 'agent');

watch(
  () => [scopeStore.scope, agentIndexStore.search, teamIndexStore.search],
  () => {
    const expected = scopeStore.scope === 'agent' ? agentIndexStore.search : teamIndexStore.search;
    if (searchInput.value !== expected) {
      searchInput.value = expected;
    }
  },
);

const activeEntries = computed(() => (isAgentScope.value ? agentIndexStore.entries : teamIndexStore.entries));
const activeLoading = computed(() => (isAgentScope.value ? agentIndexStore.loading : teamIndexStore.loading));
const activeError = computed(() => (isAgentScope.value ? agentIndexStore.error : teamIndexStore.error));
const activePage = computed(() => (isAgentScope.value ? agentIndexStore.page : teamIndexStore.page));
const activeTotalPages = computed(() => (isAgentScope.value ? agentIndexStore.totalPages : teamIndexStore.totalPages));

const showManualSelection = computed(() => {
  if (!isAgentScope.value) return false;
  const selected = agentViewStore.selectedRunId;
  if (!selected) return false;
  return !agentIndexStore.entries.some((entry) => entry.runId === selected);
});

const changeScope = async (scope: MemoryScope) => {
  if (scopeStore.scope === scope) {
    return;
  }

  scopeStore.setScope(scope);
  if (scope === 'agent') {
    teamViewStore.clearSelection();
    if (agentIndexStore.entries.length === 0) {
      await agentIndexStore.fetchIndex();
    }
    return;
  }

  agentViewStore.clearSelection();
  if (teamIndexStore.entries.length === 0) {
    await teamIndexStore.fetchIndex();
  }
};

const applySearch = async () => {
  const query = searchInput.value.trim();
  if (isAgentScope.value) {
    await agentIndexStore.setSearch(query);
    return;
  }
  await teamIndexStore.setSearch(query);
};

const submitManualRunId = async () => {
  if (!isAgentScope.value) {
    return;
  }
  const value = manualRunId.value.trim();
  if (!value) return;
  await agentViewStore.setSelectedRunId(value);
};

const selectAgentRun = async (runId: string) => {
  await agentViewStore.setSelectedRunId(runId);
};

const toggleTeam = (teamRunId: string) => {
  teamIndexStore.toggleExpandedTeam(teamRunId);
};

const selectTeamMember = async (
  teamRunId: string,
  teamDefinitionName: string,
  memberRouteKey: string,
  memberName: string,
  memberRunId: string,
) => {
  teamIndexStore.expandTeam(teamRunId);
  await teamViewStore.setSelectedMember({
    teamRunId,
    teamDefinitionName,
    memberRouteKey,
    memberName,
    memberRunId,
  });
};

const isSelectedTeamMember = (teamRunId: string, memberRunId: string): boolean => {
  return teamViewStore.selectedTeamRunId === teamRunId && teamViewStore.selectedMemberRunId === memberRunId;
};

const clearSelection = () => {
  if (isAgentScope.value) {
    agentViewStore.clearSelection();
    return;
  }
  teamViewStore.clearSelection();
};

const retry = async () => {
  if (isAgentScope.value) {
    await agentIndexStore.fetchIndex();
    return;
  }
  await teamIndexStore.fetchIndex();
};

const previousPage = async () => {
  if (isAgentScope.value) {
    await agentIndexStore.previousPage();
    return;
  }
  await teamIndexStore.previousPage();
};

const nextPage = async () => {
  if (isAgentScope.value) {
    await agentIndexStore.nextPage();
    return;
  }
  await teamIndexStore.nextPage();
};

const formatTimestamp = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};
</script>
