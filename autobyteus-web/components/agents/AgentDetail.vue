<template>
  <div class="flex-1 overflow-auto p-8">
    <div class="max-w-6xl mx-auto">
      <button
        type="button"
        @click="goBackToList"
        class="mb-5 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg class="mr-2 h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 1 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z"
            clip-rule="evenodd"
          />
        </svg>
        Back to Agents
      </button>

      <div v-if="viewState === 'loading'" class="text-center py-20">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">{{ isDeleting ? 'Deleting Agent...' : 'Loading Agent Details...' }}</p>
      </div>

      <div v-else-if="viewState === 'not-found'" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        <h3 class="font-bold">Agent Not Found</h3>
        <p>The agent definition with the specified ID could not be found.</p>
        <button @click="goBackToList" class="text-indigo-600 hover:underline mt-2 inline-block">&larr; Back to all agents</button>
      </div>

      <div v-else class="bg-white p-8 rounded-xl shadow-md border border-gray-200">
        <div class="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-8">
          <aside class="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-5 space-y-5">
            <div class="mx-auto h-48 w-48 overflow-hidden rounded-3xl bg-slate-100 flex items-center justify-center shadow-sm">
              <img
                v-if="showAvatarImage"
                :src="avatarUrl"
                :alt="`${agentDef.name} avatar`"
                class="h-full w-full object-cover"
                @error="avatarLoadError = true"
              />
              <span v-else class="text-6xl font-semibold tracking-wide text-slate-600">{{ avatarInitials }}</span>
            </div>

            <div class="text-center">
              <h1 class="text-2xl font-bold text-gray-900">{{ agentDef.name }}</h1>
              <p class="text-sm text-indigo-700 font-medium mt-1">{{ agentDef.role }}</p>
            </div>

            <div class="grid grid-cols-2 gap-2 text-center">
              <div class="rounded-lg border border-indigo-100 bg-white px-3 py-2">
                <p class="text-xs uppercase tracking-wide text-gray-500">Tools</p>
                <p class="text-lg font-semibold text-gray-900">{{ agentDef.toolNames.length }}</p>
              </div>
              <div class="rounded-lg border border-indigo-100 bg-white px-3 py-2">
                <p class="text-xs uppercase tracking-wide text-gray-500">Skills</p>
                <p class="text-lg font-semibold text-gray-900">{{ agentDef.skillNames.length }}</p>
              </div>
            </div>

            <div class="space-y-2 pt-2">
              <button @click="selectAgentToRun(agentDef)" class="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center">
                <span class="block i-heroicons-play-20-solid w-5 h-5 mr-2"></span>
                Run Agent
              </button>
              <button @click="$emit('navigate', { view: 'edit', id: agentDef.id })" class="w-full px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center">
                <span class="block i-heroicons-pencil-square-20-solid w-5 h-5 mr-2"></span>
                Edit
              </button>
              <button @click="handleDelete(agentDef.id)" class="w-full px-4 py-2 bg-red-50 text-red-700 font-semibold rounded-md hover:bg-red-100 transition-colors flex items-center justify-center">
                <span class="block i-heroicons-trash-20-solid w-5 h-5 mr-2"></span>
                Delete
              </button>
            </div>
          </aside>

          <section class="space-y-6">
            <div class="rounded-xl border border-gray-200 bg-white p-5">
              <h2 class="text-lg font-semibold text-gray-800 mb-2">Description</h2>
              <p class="text-gray-600 whitespace-pre-wrap">{{ agentDef.description }}</p>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white p-5">
              <h2 class="text-lg font-semibold text-gray-800 mb-3">System Prompt</h2>
              <div v-if="agentDef.systemPromptCategory && agentDef.systemPromptName" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</h3>
                  <p class="text-sm text-gray-800 font-mono bg-gray-50 px-3 py-2 rounded-md mt-1 border border-gray-100">{{ agentDef.systemPromptCategory }}</p>
                </div>
                <div>
                  <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</h3>
                  <p class="text-sm text-gray-800 font-mono bg-gray-50 px-3 py-2 rounded-md mt-1 border border-gray-100">{{ agentDef.systemPromptName }}</p>
                </div>
              </div>
              <p v-else class="text-sm text-gray-500 italic">No system prompt configured.</p>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white p-5">
              <h2 class="text-lg font-semibold text-gray-800 mb-3">Skills</h2>
              <ul v-if="agentDef.skillNames && agentDef.skillNames.length" class="space-y-2">
                <li v-for="item in agentDef.skillNames" :key="item" class="text-sm font-mono bg-gray-50 text-gray-800 px-4 py-2 rounded-md border border-gray-200">
                  {{ item }}
                </li>
              </ul>
              <p v-else class="text-sm text-gray-500 italic">None configured.</p>
            </div>

            <div class="rounded-xl border border-gray-200 bg-white p-5">
              <h2 class="text-lg font-semibold text-gray-800 mb-3">Tools</h2>
              <ul v-if="agentDef.toolNames && agentDef.toolNames.length" class="space-y-2">
                <li v-for="item in agentDef.toolNames" :key="item" class="text-sm font-mono bg-gray-50 text-gray-800 px-4 py-2 rounded-md border border-gray-200">
                  {{ item }}
                </li>
              </ul>
              <p v-else class="text-sm text-gray-500 italic">None configured.</p>
            </div>

            <details v-if="optionalProcessorLists.length" class="rounded-xl border border-gray-200 bg-white p-5">
              <summary class="text-lg font-semibold text-gray-800 cursor-pointer">Optional Processors (Advanced)</summary>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div v-for="list in optionalProcessorLists" :key="list.title">
                  <h3 class="font-semibold text-gray-800 mb-3">{{ list.title }}</h3>
                  <ul class="space-y-2">
                    <li v-for="item in agentDef[list.key]" :key="item" class="text-sm font-mono bg-gray-50 text-gray-800 px-4 py-2 rounded-md border border-gray-200">
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>

    <AgentDeleteConfirmDialog
      :show="showDeleteConfirm"
      :item-name="agentDef ? agentDef.name : ''"
      item-type="Agent Definition"
      title="Delete Agent Definition"
      confirm-text="Delete Definition"
      @confirm="onDeleteConfirmed"
      @cancel="onDeleteCanceled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, toRefs, watch } from 'vue';
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore';
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

const props = defineProps<{ agentId: string }>();
const { agentId } = toRefs(props);

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const runConfigStore = useAgentRunConfigStore();
const selectionStore = useAgentSelectionStore();
const agentDef = computed(() => agentDefinitionStore.getAgentDefinitionById(agentId.value));
const loading = ref(false);
const avatarLoadError = ref(false);

const showDeleteConfirm = ref(false);
const agentIdToDelete = ref<string | null>(null);
const isDeleting = ref(false);
const viewState = computed(() => {
  if (loading.value || isDeleting.value) return 'loading';
  if (!agentDef.value) return 'not-found';
  return 'ready';
});

const componentLists = [
  { title: 'Tools', key: 'toolNames' },
  { title: 'Input Processors', key: 'inputProcessorNames' },
  { title: 'LLM Response Processors', key: 'llmResponseProcessorNames' },
  { title: 'System Prompt Processors', key: 'systemPromptProcessorNames' },
  { title: 'Tool Result Processors', key: 'toolExecutionResultProcessorNames' },
  { title: 'Tool Invocation Preprocessors', key: 'toolInvocationPreprocessorNames' },
  { title: 'Lifecycle Processors', key: 'lifecycleProcessorNames' },
];

const optionalProcessorLists = computed(() => {
  const def = agentDef.value;
  if (!def) return [];
  return componentLists
    .filter(list => list.key !== 'toolNames')
    .filter(list => Array.isArray(def[list.key]) && def[list.key].length > 0);
});

const avatarUrl = computed(() => agentDef.value?.avatarUrl || '');
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);
const avatarInitials = computed(() => {
  const raw = agentDef.value?.name?.trim() || '';
  if (!raw) {
    return 'AI';
  }
  const parts = raw.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map(part => part[0]?.toUpperCase() || '').join('');
  return initials || 'AI';
});

watch(avatarUrl, () => {
  avatarLoadError.value = false;
});

onMounted(async () => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    loading.value = true;
    await agentDefinitionStore.fetchAllAgentDefinitions();
    loading.value = false;
  }
});

const selectAgentToRun = (agentDef: AgentDefinition) => {
  runConfigStore.setTemplate(agentDef);
  selectionStore.clearSelection();
  navigateTo('/workspace');
};

const handleDelete = (id: string) => {
  agentIdToDelete.value = id;
  showDeleteConfirm.value = true;
};

const onDeleteConfirmed = async () => {
  const idToDelete = agentIdToDelete.value;
  if (!idToDelete) {
    return;
  }

  onDeleteCanceled();
  isDeleting.value = true;

  try {
    const result = await agentDefinitionStore.deleteAgentDefinition(idToDelete);
    if (result?.success) {
      emit('navigate', { view: 'list' });
      return;
    }
  } catch (error) {
    console.error('Failed to delete agent definition:', error);
  }

  isDeleting.value = false;
};

const onDeleteCanceled = () => {
  showDeleteConfirm.value = false;
  agentIdToDelete.value = null;
};

const goBackToList = () => {
  emit('navigate', { view: 'list' });
};
</script>
