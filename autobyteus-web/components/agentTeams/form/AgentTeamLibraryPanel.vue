<template>
  <aside class="rounded-lg border border-slate-200 bg-white p-3">
    <h3 class="text-sm font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.agent_and_team_library') }}</h3>
    <div class="relative mt-2">
      <input
        :value="search"
        type="text"
        class="block w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        :placeholder="$t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.search_agents_and_teams')"
        @input="handleSearchInput"
      />
      <svg class="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 3a6 6 0 104.472 10.001l2.763 2.764a1 1 0 001.414-1.414l-2.764-2.763A6 6 0 009 3zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" clip-rule="evenodd" />
      </svg>
    </div>

    <div class="mt-3 max-h-[26rem] space-y-4 overflow-y-auto pr-1">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.my_agents') }}</p>
        <div class="mt-2 space-y-2">
          <div
            v-for="item in agentItems"
            :key="`AGENT-${item.id}`"
            draggable="true"
            class="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"
            @dragstart="emitDragStart($event, item)"
          >
            <button
              type="button"
              class="flex min-w-0 items-center gap-2 text-left"
              @click="$emit('add', item)"
            >
              <span class="text-slate-400">⋮⋮</span>
              <span class="truncate font-medium">{{ item.name }}</span>
            </button>
            <span class="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">AGENT</span>
          </div>
          <p v-if="agentItems.length === 0" class="text-xs text-slate-400">{{ $t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.no_agents_found') }}</p>
        </div>
      </div>

      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.my_teams') }}</p>
        <div class="mt-2 space-y-2">
          <div
            v-for="item in teamItems"
            :key="`TEAM-${item.id}`"
            draggable="true"
            class="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"
            @dragstart="emitDragStart($event, item)"
          >
            <button
              type="button"
              class="flex min-w-0 items-center gap-2 text-left"
              @click="$emit('add', item)"
            >
              <span class="text-slate-400">⋮⋮</span>
              <span class="truncate font-medium">{{ item.name }}</span>
            </button>
            <span class="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">TEAM</span>
          </div>
          <p v-if="teamItems.length === 0" class="text-xs text-slate-400">{{ $t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.no_teams_found') }}</p>
        </div>
      </div>
    </div>

    <p class="mt-3 text-xs text-slate-500">{{ $t('agentTeams.components.agentTeams.form.AgentTeamLibraryPanel.drag_items_from_this_library_into') }}</p>
  </aside>
</template>

<script setup lang="ts">
import type { LibraryItem } from './useAgentTeamDefinitionFormState';

defineProps<{
  search: string;
  agentItems: LibraryItem[];
  teamItems: LibraryItem[];
}>();

const emit = defineEmits<{
  add: [item: LibraryItem];
  'dragstart-item': [payload: { event: DragEvent; item: LibraryItem }];
  'update:search': [value: string];
}>();

const handleSearchInput = (event: Event) => {
  emit('update:search', (event.target as HTMLInputElement).value);
};

const emitDragStart = (event: DragEvent, item: LibraryItem) => {
  emit('dragstart-item', { event, item });
};
</script>
