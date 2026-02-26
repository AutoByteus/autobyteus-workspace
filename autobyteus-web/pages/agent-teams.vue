<template>
  <div class="h-full overflow-auto bg-gray-50">
    <AgentTeamList v-if="currentView === 'team-list'" @navigate="handleNavigation" />
    <AgentTeamCreate v-else-if="currentView === 'team-create'" @navigate="handleNavigation" />
    <AgentTeamDetail
      v-else-if="currentView === 'team-detail' && currentId"
      :team-id="currentId"
      @navigate="handleNavigation"
    />
    <AgentTeamEdit
      v-else-if="currentView === 'team-edit' && currentId"
      :team-id="currentId"
      @navigate="handleNavigation"
    />

    <div v-else class="mx-auto mt-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
      <h2 class="text-xl font-bold text-gray-900">Invalid View</h2>
      <p class="mt-2 text-gray-600">The requested team view is not available.</p>
      <button
        type="button"
        class="mt-4 text-indigo-600 hover:underline"
        @click="handleNavigation({ view: 'team-list' })"
      >
        Go to Agent Teams
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import AgentTeamList from '~/components/agentTeams/AgentTeamList.vue';
import AgentTeamDetail from '~/components/agentTeams/AgentTeamDetail.vue';
import AgentTeamCreate from '~/components/agentTeams/AgentTeamCreate.vue';
import AgentTeamEdit from '~/components/agentTeams/AgentTeamEdit.vue';

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const agentDefStore = useAgentDefinitionStore();
const agentTeamDefStore = useAgentTeamDefinitionStore();

onMounted(async () => {
  try {
    await Promise.all([
      workspaceStore.fetchAllWorkspaces(),
      agentDefStore.fetchAllAgentDefinitions(),
      agentTeamDefStore.fetchAllAgentTeamDefinitions(),
    ]);
  } catch (error) {
    console.error('Failed to fetch initial data for agent teams page:', error);
  }
});

type View = 'team-list' | 'team-detail' | 'team-create' | 'team-edit';

const currentView = computed((): View => {
  const view = route.query.view as View;
  const validViews: View[] = ['team-list', 'team-detail', 'team-create', 'team-edit'];
  if (view && validViews.includes(view)) {
    return view;
  }
  return 'team-list';
});

const currentId = computed(() => route.query.id as string | undefined);

const handleNavigation = (payload: { view: View; id?: string }) => {
  const { view, id } = payload;
  const query: Record<string, string> = { view };
  if (id) {
    query.id = id;
  }
  router.push({ path: '/agent-teams', query });
};
</script>
