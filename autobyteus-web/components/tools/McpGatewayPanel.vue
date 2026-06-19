<template>
  <section class="flex h-full flex-col gap-6" data-testid="mcp-gateway-panel">
    <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">{{ t('tools.components.tools.McpGatewayPanel.external_mcp_gateway') }}</p>
        <h2 class="text-xl font-semibold text-gray-900">{{ t('tools.components.tools.McpGatewayPanel.connect_external_mcp_clients') }}</h2>
        <p class="max-w-3xl text-sm text-gray-600">
          {{ t('tools.components.tools.McpGatewayPanel.configure_external_clients') }}
        </p>
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <label class="text-sm font-medium text-gray-700" for="mcp-gateway-endpoint">{{ t('tools.components.tools.McpGatewayPanel.endpoint') }}</label>
          <div class="mt-2 flex overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            <input
              id="mcp-gateway-endpoint"
              class="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-gray-800 outline-none"
              readonly
              :value="gatewayUrl"
            />
            <button
              type="button"
              class="border-l border-gray-200 px-3 text-sm font-medium text-indigo-600 hover:bg-gray-100"
              @click="copyText(gatewayUrl)"
            >{{ t('tools.components.tools.McpGatewayPanel.copy') }}</button>
          </div>
        </div>
        <div class="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p class="font-semibold">{{ t('tools.components.tools.McpGatewayPanel.access_mode') }}</p>
          <p>{{ t('tools.components.tools.McpGatewayPanel.bearer_token_guidance') }}</p>
        </div>
      </div>

      <div class="mt-5">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-700">{{ t('tools.components.tools.McpGatewayPanel.example_client_config') }}</h3>
          <button
            type="button"
            class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            @click="copyText(configSnippet)"
          >{{ t('tools.components.tools.McpGatewayPanel.copy_json') }}</button>
        </div>
        <pre class="overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100"><code>{{ configSnippet }}</code></pre>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900">{{ t('tools.components.tools.McpGatewayPanel.exposed_mcp_origin_tools') }}</h3>
          <p class="text-sm text-gray-500">{{ exposedToolCountLabel }}</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="refreshTools"
        >{{ t('tools.components.tools.McpGatewayPanel.refresh') }}</button>
      </div>

      <div v-if="loading" class="py-8 text-center text-gray-500">
        <span class="i-heroicons-arrow-path-20-solid mx-auto h-8 w-8 animate-spin text-gray-400"></span>
        <p class="mt-2">{{ t('tools.components.tools.McpGatewayPanel.loading_mcp_origin_tools') }}</p>
      </div>
      <div v-else-if="mcpTools.length === 0" class="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-8 text-center">
        <span class="i-heroicons-puzzle-piece-20-solid mx-auto mb-3 h-10 w-10 text-gray-400"></span>
        <p class="font-medium text-gray-700">{{ t('tools.components.tools.McpGatewayPanel.no_mcp_origin_tools_registered') }}</p>
        <p class="mt-1 text-sm text-gray-500">{{ t('tools.components.tools.McpGatewayPanel.add_or_sync_mcp_servers') }}</p>
      </div>
      <ul v-else class="min-h-0 flex-1 overflow-auto divide-y divide-gray-100 rounded-md border border-gray-100">
        <li v-for="tool in mcpTools" :key="tool.name" class="p-4">
          <p class="font-mono text-sm font-semibold text-gray-900">{{ tool.name }}</p>
          <p class="mt-1 text-sm text-gray-600">{{ tool.description }}</p>
          <p v-if="tool.category" class="mt-2 text-xs uppercase tracking-wide text-gray-400">{{ tool.category }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { getServerBaseUrl } from '~/utils/serverConfig';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { useLocalization } from '~/composables/useLocalization';

const store = useToolManagementStore();
const { t } = useLocalization();

const gatewayUrl = computed(() => `${getServerBaseUrl().replace(/\/+$/, '')}/mcp/gateway`);
const mcpTools = computed(() => store.getMcpGatewayTools);
const loading = computed(() => store.getLoading);
const exposedToolCountLabel = computed(() => t('tools.components.tools.McpGatewayPanel.exposed_tool_count', {
  count: mcpTools.value.length,
  pluralSuffix: mcpTools.value.length === 1 ? '' : 's',
}));

const configSnippet = computed(() => JSON.stringify({
  mcpServers: {
    autobyteus: {
      type: 'streamable-http',
      url: gatewayUrl.value,
      headers: {
        Authorization: t('tools.components.tools.McpGatewayPanel.bearer_token_placeholder'),
      },
    },
  },
}, null, 2));

const refreshTools = () => {
  void store.fetchMcpGatewayTools();
};

const copyText = async (value: string) => {
  try {
    await navigator.clipboard?.writeText(value);
  } catch (error) {
    console.warn('Failed to copy MCP gateway text:', error);
  }
};

onMounted(() => {
  refreshTools();
});
</script>
