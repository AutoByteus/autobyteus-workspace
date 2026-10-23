<template>
  <div class="h-full flex flex-col overflow-hidden bg-slate-50">
    <div class="flex flex-shrink-0 items-center border-b border-slate-200 bg-white/95 px-8 py-4">
      <NodeManagerTabs v-model="activeTab" :ariaLabel="$t('settings.components.settings.NodeManager.node_manager')" />
    </div>

    <div class="flex-1 overflow-auto px-6 py-6 lg:px-8">
      <div
        v-if="activeTab === 'manage'"
        id="node-manager-panel-manage"
        class="mx-auto w-full max-w-7xl space-y-5"
        role="tabpanel"
        aria-labelledby="node-manager-tab-manage"
        data-testid="node-manager-panel-manage"
      >
        <ThisNodeCard
          :node-name="currentNode?.name || $t('settings.components.settings.NodeManager.currentNodeUnknown')"
          :node-type-label="currentNodeTypeLabel"
          :base-url="currentNode?.baseUrl"
        />
        <NodeList @guide="activeTab = 'dockerGuide'" />
      </div>

      <div
        v-else-if="activeTab === 'memorySync'"
        id="node-manager-panel-memorySync"
        class="mx-auto w-full max-w-7xl space-y-5"
        role="tabpanel"
        aria-labelledby="node-manager-tab-memorySync"
        data-testid="node-manager-panel-memorySync"
      >
        <MemorySyncCard
          :node-name="currentNode?.name || $t('settings.components.settings.NodeManager.currentNodeUnknown')"
          :node-type-label="currentNodeTypeLabel"
          :base-url="currentNode?.baseUrl"
        />
      </div>
      <div
        v-else-if="activeTab === 'phoneSetup'"
        id="node-manager-panel-phoneSetup"
        class="mx-auto w-full max-w-7xl space-y-5"
        role="tabpanel"
        aria-labelledby="node-manager-tab-phoneSetup"
        data-testid="node-manager-panel-phoneSetup"
      >
        <PhoneSetupGuideCard />

        <PhoneAccessCard />
      </div>
      <div
        v-else-if="activeTab === 'dockerGuide'"
        id="node-manager-panel-dockerGuide"
        class="mx-auto w-full max-w-7xl"
        role="tabpanel"
        aria-labelledby="node-manager-tab-dockerGuide"
        data-testid="node-manager-panel-dockerGuide"
      >
        <DockerNodeStartGuideCard />
      </div>
      <div v-else-if="activeTab === 'nfsGuide'" id="node-manager-panel-nfsGuide"
        class="mx-auto w-full max-w-7xl" role="tabpanel" aria-labelledby="node-manager-tab-nfsGuide"
        data-testid="node-manager-panel-nfsGuide">
        <NfsGuideCard :release="nfsPublishedRelease" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import DockerNodeStartGuideCard from '~/components/settings/DockerNodeStartGuideCard.vue';
import { nfsPublishedRelease } from '~/utils/nfsLauncherCommands';
import NfsGuideCard from '~/components/settings/NfsGuideCard.vue';
import NodeManagerTabs from '~/components/settings/NodeManagerTabs.vue';
import MemorySyncCard from '~/components/settings/MemorySyncCard.vue';
import NodeList from '~/components/settings/nodes/NodeList.vue';
import ThisNodeCard from '~/components/settings/nodes/ThisNodeCard.vue';
import PhoneAccessCard from '~/components/settings/PhoneAccessCard.vue';
import PhoneSetupGuideCard from '~/components/settings/PhoneSetupGuideCard.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

const { t } = useLocalization();

/** The Nodes page's tabs (one-nodes-tab REQ-701): Remote Collaboration is part of Manage Nodes. */
type NodeManagerTabId = 'manage' | 'memorySync' | 'phoneSetup' | 'dockerGuide' | 'nfsGuide';

const nodeStore = useNodeStore();
const windowNodeContextStore = useWindowNodeContextStore();
const route = useRoute();

const validTabs = new Set<NodeManagerTabId>(['manage', 'memorySync', 'phoneSetup', 'dockerGuide', 'nfsGuide']);
const initialActiveTab = (): NodeManagerTabId => {
  const queryTab = typeof route.query.nodeTab === 'string' ? route.query.nodeTab : '';
  return validTabs.has(queryTab as NodeManagerTabId) ? queryTab as NodeManagerTabId : 'manage';
};
const activeTab = ref<NodeManagerTabId>(initialActiveTab());

const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
const nodeTypeLabel = (nodeType: string | undefined) =>
  t(`settings.components.settings.NodeManager.nodeType.${nodeType ?? 'unknown'}` as const);
const currentNodeTypeLabel = computed(() => nodeTypeLabel(currentNode.value?.nodeType));

function syncActiveTabFromRouteQuery(): void {
  const queryTab = typeof route.query.nodeTab === 'string' ? route.query.nodeTab : '';
  if (validTabs.has(queryTab as NodeManagerTabId)) {
    activeTab.value = queryTab as NodeManagerTabId;
  }
}

watch(
  () => route.query.nodeTab,
  () => {
    syncActiveTabFromRouteQuery();
  },
);

onMounted(async () => {
  syncActiveTabFromRouteQuery();
  await nodeStore.initializeRegistry();
});
</script>
