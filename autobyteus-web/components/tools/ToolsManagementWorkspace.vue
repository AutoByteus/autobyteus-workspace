<template>
  <div class="flex h-full flex-col bg-gray-100">
    <header v-if="showHeader" class="border-b border-gray-200 bg-white px-8 py-6">
      <div class="flex flex-col gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tools</h1>
          <p class="text-sm text-gray-600">Browse local tools and manage MCP servers.</p>
        </div>
        <nav
          v-if="showRootSwitcher"
          class="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
          aria-label="Tools sections"
        >
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            :class="activeRootSection === 'local-tools' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="switchRootSection('local-tools')"
          >
            Local Tools
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            :class="activeRootSection === 'mcp-servers' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'"
            @click="switchRootSection('mcp-servers')"
          >
            MCP Servers
          </button>
        </nav>
      </div>
    </header>

    <main :class="contentContainerClass">
      <div v-if="activeView === 'local-tools'" class="flex h-full flex-col">
        <ToolsFilter
          v-model:searchQuery="searchQuery"
          v-model:selectedCategory="selectedCategory"
          :categories="localToolCategories"
          :show-category-filter="true"
        />
        <div v-if="store.getLoading && store.getLocalToolsByCategory.length === 0" class="py-20 text-center">
          <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500"></div>
          <p>Loading tools...</p>
        </div>
        <div
          v-else-if="filteredLocalToolsByCategory.length === 0"
          class="flex flex-1 flex-col items-center justify-center rounded-lg border bg-white py-16 text-center"
        >
          <p class="text-lg font-medium text-gray-700">No tools found</p>
          <p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
        </div>
        <div v-else class="space-y-8">
          <ToolList
            v-for="group in filteredLocalToolsByCategory"
            :key="group.categoryName"
            :title="group.categoryName"
            :tools="group.tools"
            :loading="false"
            source="Local"
            @details="showToolDetails"
          />
        </div>
      </div>

      <div v-else-if="activeView === 'mcp-servers'" class="flex h-full flex-col">
        <ToolsFilter v-model:searchQuery="searchQuery" :show-category-filter="false" />
        <McpServerList
          class="flex-1"
          :servers="filteredMcpServers"
          :loading="store.getLoading && activeView.startsWith('mcp-')"
          @add="showAddServerForm"
          @edit="showEditServerForm"
          @delete="requestDeleteServer"
          @bulk-import="showBulkImportView"
          @discover-tools="discoverTools"
          @view-tools="viewToolsForServer"
        />
      </div>

      <div v-else-if="activeView === 'mcp-form'">
        <McpServerFormModal
          :server="selectedServer"
          @cancel="handleNavigation('mcp-servers')"
          @save-complete="handleServerSave"
          @show-toast="handleShowToast"
        />
      </div>

      <div v-else-if="activeView === 'mcp-bulk-import'">
        <McpBulkImportView
          @cancel="handleNavigation('mcp-servers')"
          @save-complete="handleNavigation('mcp-servers')"
          @show-toast="handleShowToast"
        />
      </div>

      <div v-else-if="activeView.startsWith('mcp-tools-')" class="flex h-full flex-col">
        <ToolList
          class="flex-1"
          :title="`Tools for ${currentServerId}`"
          :tools="store.getToolsForServer(currentServerId!)"
          :loading="store.getLoading && activeView === `mcp-tools-${currentServerId}`"
          :source="currentServerId!"
          show-back-button
          empty-icon="i-heroicons-puzzle-piece-20-solid"
          empty-message="No tools registered for this server. Try syncing tools."
          @back="handleNavigation('mcp-servers')"
          @details="showToolDetails"
        />
      </div>
    </main>

    <ToastContainer />

    <ToolDetailsModal :show="isToolDetailVisible" :tool="selectedTool" @close="isToolDetailVisible = false" />

    <ToolsConfirmationModal
      :show="isDeleteConfirmVisible"
      title="Delete MCP Server"
      :message="`Are you sure you want to delete the server '<strong>${serverToDeleteId}</strong>'?<br>This action cannot be undone.`"
      confirm-button-text="Delete"
      variant="danger"
      @confirm="executeDeleteServer"
      @cancel="cancelDeleteServer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import type { McpServer, Tool, ToolCategoryGroup } from '~/stores/toolManagementStore';
import { useToasts, type ToastType } from '~/composables/useToasts';
import ToolList from '~/components/tools/ToolList.vue';
import ToolDetailsModal from '~/components/tools/ToolDetailsModal.vue';
import McpServerList from '~/components/tools/McpServerList.vue';
import McpServerFormModal from '~/components/tools/McpServerFormModal.vue';
import McpBulkImportView from '~/components/tools/McpBulkImportView.vue';
import ToolsFilter from '~/components/tools/ToolsFilter.vue';
import ToastContainer from '~/components/common/ToastContainer.vue';
import ToolsConfirmationModal from '~/components/tools/ToolsConfirmationModal.vue';

type RootSection = 'local-tools' | 'mcp-servers';

const props = withDefaults(defineProps<{
  initialRootSection?: RootSection;
  showHeader?: boolean;
  showRootSwitcher?: boolean;
}>(), {
  initialRootSection: 'local-tools',
  showHeader: false,
  showRootSwitcher: false,
});

const store = useToolManagementStore();
const { addToast } = useToasts();

const activeView = ref<string>(props.initialRootSection);
const isToolDetailVisible = ref(false);
const isDeleteConfirmVisible = ref(false);
const selectedTool = ref<Tool | null>(null);
const selectedServer = ref<McpServer | null>(null);
const serverToDeleteId = ref<string | null>(null);
const searchQuery = ref('');
const selectedCategory = ref('All Categories');

const currentServerId = computed(() => {
  if (activeView.value.startsWith('mcp-tools-')) {
    return activeView.value.replace('mcp-tools-', '');
  }
  return null;
});

const activeRootSection = computed<RootSection>(() => {
  if (activeView.value.startsWith('mcp-')) {
    return 'mcp-servers';
  }
  return 'local-tools';
});

const contentContainerClass = computed(() =>
  props.showHeader ? 'flex flex-1 flex-col overflow-y-auto p-8' : 'flex flex-1 flex-col overflow-y-auto p-4 md:p-6',
);

const localToolCategories = computed(() => {
  const categories = store.getLocalToolsByCategory.map((group) => group.categoryName);
  return ['All Categories', ...categories.sort()];
});

const filteredLocalToolsByCategory = computed(() => {
  let groups = store.getLocalToolsByCategory;
  if (selectedCategory.value !== 'All Categories') {
    groups = groups.filter((group) => group.categoryName === selectedCategory.value);
  }
  if (!searchQuery.value) return groups;

  const query = searchQuery.value.toLowerCase();
  return groups.reduce((acc: ToolCategoryGroup[], group) => {
    const filteredTools = group.tools.filter((tool) => {
      return tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query);
    });
    if (filteredTools.length > 0) {
      acc.push({ ...group, tools: filteredTools });
    }
    return acc;
  }, []);
});

const filteredMcpServers = computed(() => {
  if (!searchQuery.value) return store.getMcpServers;
  const query = searchQuery.value.toLowerCase();
  return store.getMcpServers.filter((server) => server.serverId.toLowerCase().includes(query));
});

const handleNavigation = (view: string) => {
  activeView.value = view;
  searchQuery.value = '';
  selectedCategory.value = 'All Categories';

  if (view === 'local-tools') {
    store.fetchLocalToolsGroupedByCategory();
  } else if (view === 'mcp-servers') {
    store.fetchMcpServers();
  }
};

const switchRootSection = (section: RootSection) => {
  handleNavigation(section);
};

const handleShowToast = (payload: { message: string; type: ToastType }) => {
  addToast(payload.message, payload.type);
};

const showToolDetails = (tool: Tool) => {
  selectedTool.value = tool;
  isToolDetailVisible.value = true;
};

const showAddServerForm = () => {
  selectedServer.value = null;
  activeView.value = 'mcp-form';
};

const showEditServerForm = (server: McpServer) => {
  selectedServer.value = server;
  activeView.value = 'mcp-form';
};

const showBulkImportView = () => {
  activeView.value = 'mcp-bulk-import';
};

const viewToolsForServer = (serverId: string) => {
  activeView.value = `mcp-tools-${serverId}`;
  store.fetchToolsForServer(serverId);
};

const handleServerSave = (payload: { serverId: string; didSync: boolean }) => {
  if (payload.didSync) {
    viewToolsForServer(payload.serverId);
    return;
  }
  handleNavigation('mcp-servers');
};

const requestDeleteServer = (serverId: string) => {
  serverToDeleteId.value = serverId;
  isDeleteConfirmVisible.value = true;
};

const cancelDeleteServer = () => {
  serverToDeleteId.value = null;
  isDeleteConfirmVisible.value = false;
};

const executeDeleteServer = async () => {
  if (!serverToDeleteId.value) return;

  try {
    const result = await store.deleteMcpServer(serverToDeleteId.value);
    addToast(result.message, result.success ? 'success' : 'error');
  } catch (error: any) {
    addToast(`Failed to delete server: ${error.message}`, 'error');
  } finally {
    cancelDeleteServer();
  }
};

const discoverTools = async (serverId: string) => {
  addToast(`Syncing tools for '${serverId}'...`, 'info');
  try {
    const result = await store.discoverAndRegisterMcpServerTools(serverId);
    addToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      viewToolsForServer(serverId);
    }
  } catch (error: any) {
    addToast(`An unexpected error occurred: ${error.message}`, 'error');
  }
};

watch(
  () => props.initialRootSection,
  (nextSection) => {
    if (activeRootSection.value !== nextSection) {
      handleNavigation(nextSection);
    }
  },
);

onMounted(() => {
  store.fetchLocalToolsGroupedByCategory();
  store.fetchMcpServers();
  handleNavigation(props.initialRootSection);
});
</script>
