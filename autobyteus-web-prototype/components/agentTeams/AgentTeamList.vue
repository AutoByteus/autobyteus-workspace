<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="relative flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M9 3a6 6 0 104.472 10.001l2.763 2.764a1 1 0 001.414-1.414l-2.764-2.763A6 6 0 009 3zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            id="team-search"
            v-model="searchQuery"
            type="text"
            class="block w-full rounded-lg border-transparent bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            :placeholder="$t('agentTeams.components.agentTeams.AgentTeamList.search_teams_by_name')"
          />
        </div>

        <div class="flex items-center justify-end gap-2">
          <button
            @click="handleReload"
            :disabled="reloading"
            class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="[
              reloading
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" :class="{ 'animate-spin': reloading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ reloading ? $t('agentTeams.components.agentTeams.AgentTeamList.reloading') : $t('agentTeams.components.agentTeams.AgentTeamList.reload') }}
          </button>
          <button
            @click="$emit('navigate', { view: 'team-create' })"
            class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >{{ $t('agentTeams.components.agentTeams.AgentTeamList.create_team') }}</button>
        </div>
      </div>


      <div v-if="loading && !reloading" class="rounded-lg border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">{{ $t('agentTeams.components.agentTeams.AgentTeamList.loading_agent_team_definitions') }}</p>
      </div>
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-bold">{{ $t('agentTeams.components.agentTeams.AgentTeamList.error_loading_agent_team_definitions') }}</p>
        <p>{{ errorMessage }}</p>
      </div>
      <div v-else-if="isSearchActive && filteredTeamDefinitions.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AgentTeamCard
          v-for="teamDef in filteredTeamDefinitions"
          :key="teamDef.id"
          :team-def="teamDef"
          @view-details="viewDetails"
          @run-team="handleRunTeam"
        />
      </div>
      <div v-else-if="featuredTeamDefinitions.length > 0" class="space-y-8">
        <section>
          <div class="mb-3">
            <h2 class="text-xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamList.featuredTeams') }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ $t('agentTeams.components.agentTeams.AgentTeamList.featuredTeamsDescription') }}</p>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AgentTeamCard
              v-for="teamDef in featuredTeamDefinitions"
              :key="teamDef.id"
              :team-def="teamDef"
              @view-details="viewDetails"
              @run-team="handleRunTeam"
            />
          </div>
        </section>

        <section v-if="regularTeamDefinitions.length > 0">
          <div class="mb-3">
            <h2 class="text-xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamList.allTeams') }}</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AgentTeamCard
              v-for="teamDef in regularTeamDefinitions"
              :key="teamDef.id"
              :team-def="teamDef"
              @view-details="viewDetails"
              @run-team="handleRunTeam"
            />
          </div>
        </section>
      </div>
      <div v-else-if="regularTeamDefinitions.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AgentTeamCard
          v-for="teamDef in regularTeamDefinitions"
          :key="teamDef.id"
          :team-def="teamDef"
          @view-details="viewDetails"
          @run-team="handleRunTeam"
        />
      </div>
      <div v-else class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <div class="text-slate-500">
          <svg class="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm4 3h10M7 14h6" />
          </svg>
          <p class="mb-2 text-lg font-medium">{{ $t('agentTeams.components.agentTeams.AgentTeamList.no_teams_found') }}</p>
          <p class="text-slate-400">
            {{ searchQuery.trim() ? $t('agentTeams.components.agentTeams.AgentTeamList.emptyFiltered', { query: searchQuery.trim() }) : $t('agentTeams.components.agentTeams.AgentTeamList.emptyDefault') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import AgentTeamCard from '~/components/agentTeams/AgentTeamCard.vue';
import { useRunActions } from '~/composables/useRunActions';
import { useServerSettingsStore } from '~/stores/serverSettings';
import {
  FEATURED_CATALOG_ITEMS_SETTING_KEY,
  parseFeaturedCatalogItemsSetting,
  splitFeaturedCatalogDefinitions,
} from '~/utils/catalog/featuredCatalogItems';

const emit = defineEmits(['navigate']);

const store = useAgentTeamDefinitionStore();
const { prepareTeamRun } = useRunActions();
const router = useRouter();
const serverSettingsStore = useServerSettingsStore();

const teamDefinitions = computed(() => store.rootAgentTeamDefinitions);
const loading = computed(() => store.loading);
const error = computed<Error | null>(() => store.error instanceof Error ? store.error : store.error ? new Error(String(store.error)) : null);
const errorMessage = computed(() => error.value?.message || '');

const searchQuery = ref('');
const reloading = ref(false);

const isSearchActive = computed(() => searchQuery.value.trim().length > 0);

const filteredTeamDefinitions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return teamDefinitions.value;
  }
  return teamDefinitions.value.filter((teamDef) => (
    teamDef.name.toLowerCase().includes(query)
    || (teamDef.description || '').toLowerCase().includes(query)
    || (teamDef.ownerApplicationName || '').toLowerCase().includes(query)
    || (teamDef.ownerPackageId || '').toLowerCase().includes(query)
  ));
});

const featuredSetting = computed(() => parseFeaturedCatalogItemsSetting(
  serverSettingsStore.getSettingByKey(FEATURED_CATALOG_ITEMS_SETTING_KEY)?.value ?? null,
).setting);

const splitTeamDefinitions = computed(() => splitFeaturedCatalogDefinitions(
  featuredSetting.value.items,
  'AGENT_TEAM',
  teamDefinitions.value,
));

const featuredTeamDefinitions = computed(() => (
  isSearchActive.value ? [] : splitTeamDefinitions.value.featuredDefinitions
));

const regularTeamDefinitions = computed(() => (
  isSearchActive.value ? filteredTeamDefinitions.value : splitTeamDefinitions.value.regularDefinitions
));

onMounted(() => {
  if (teamDefinitions.value.length === 0) {
    store.fetchAllAgentTeamDefinitions();
  }
  serverSettingsStore.fetchServerSettings().catch((error) => {
    console.warn('Failed to load featured catalog settings:', error);
  });
});

const handleReload = async () => {
  reloading.value = true;
  try {
    await Promise.all([
      store.refreshAndReloadAllAgentTeamDefinitions(),
      serverSettingsStore.reloadServerSettings(),
    ]);
  } catch (e) {
    console.error('Failed to reload agent teams:', e);
  } finally {
    reloading.value = false;
  }
};

const viewDetails = (teamDefinitionId: string) => {
  emit('navigate', { view: 'team-detail', id: teamDefinitionId });
};

const handleRunTeam = (teamDef: AgentTeamDefinition) => {
  prepareTeamRun(teamDef);
  router.push('/workspace');
};

</script>
