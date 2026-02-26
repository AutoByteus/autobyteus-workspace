<template>
  <div class="h-full overflow-auto bg-gray-50">
    <div v-if="loading" class="flex min-h-[280px] items-center justify-center p-10">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-lg text-gray-600">Preparing Agent Manager...</p>
      </div>
    </div>

    <AgentList v-else-if="currentView === 'list'" @navigate="handleNavigation" />
    <AgentCreate v-else-if="currentView === 'create'" @navigate="handleNavigation" />
    <AgentDetail v-else-if="currentView === 'detail' && currentId" :agent-id="currentId" @navigate="handleNavigation" />
    <AgentEdit v-else-if="currentView === 'edit' && currentId" :agent-id="currentId" @navigate="handleNavigation" />

    <div v-else class="mx-auto mt-6 max-w-3xl rounded-xl border border-gray-200 bg-white p-8">
      <h2 class="text-xl font-bold text-gray-900">Invalid View</h2>
      <p class="mt-2 text-gray-600">The requested view is not available.</p>
      <button
        type="button"
        class="mt-4 text-indigo-600 hover:underline"
        @click="handleNavigation({ view: 'list' })"
      >
        Go to Agents
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import AgentList from '~/components/agents/AgentList.vue';
import AgentDetail from '~/components/agents/AgentDetail.vue';
import AgentCreate from '~/components/agents/AgentCreate.vue';
import AgentEdit from '~/components/agents/AgentEdit.vue';

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const agentDefStore = useAgentDefinitionStore();

const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([workspaceStore.fetchAllWorkspaces(), agentDefStore.fetchAllAgentDefinitions()]);
  } catch (error) {
    console.error('Failed to fetch initial data for agents page:', error);
  } finally {
    loading.value = false;
  }
});

type View = 'list' | 'detail' | 'create' | 'edit';

const currentView = computed((): View => {
  const view = route.query.view as View;
  const validViews: View[] = ['list', 'detail', 'create', 'edit'];
  if (view && validViews.includes(view)) {
    return view;
  }
  return 'list';
});

const currentId = computed(() => route.query.id as string | undefined);

const handleNavigation = (payload: { view: View; id?: string }) => {
  const { view, id } = payload;
  const query: Record<string, string> = { view };
  if (id) {
    query.id = id;
  }
  router.push({ path: '/agents', query });
};
</script>
