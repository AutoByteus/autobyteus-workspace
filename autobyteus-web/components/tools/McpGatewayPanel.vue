<template>
  <section class="flex h-full flex-col" data-testid="mcp-gateway-panel">
    <div class="mx-auto w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">{{ t('tools.components.tools.McpGatewayPanel.external_mcp_gateway') }}</p>
        <h2 class="text-2xl font-semibold tracking-tight text-gray-900">{{ t('tools.components.tools.McpGatewayPanel.connect_external_mcp_clients') }}</h2>
        <p class="max-w-2xl text-sm leading-6 text-gray-600">
          {{ t('tools.components.tools.McpGatewayPanel.configure_external_clients') }}
        </p>
      </header>

      <div class="mt-6 grid gap-4 lg:grid-cols-5">
        <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4 lg:col-span-3">
          <div class="mb-2 flex items-center justify-between gap-3">
            <label class="text-sm font-medium text-gray-700" for="mcp-gateway-endpoint">{{ t('tools.components.tools.McpGatewayPanel.endpoint') }}</label>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
              :class="endpointCopied
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-indigo-100 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50'"
              data-testid="mcp-gateway-copy-endpoint"
              @click="copyEndpoint"
            >
              <Icon v-if="endpointCopied" icon="heroicons:check-20-solid" aria-hidden="true" class="h-4 w-4" />
              <Icon v-else icon="heroicons:document-duplicate-20-solid" aria-hidden="true" class="h-4 w-4" />
              <span>{{ endpointCopyLabel }}</span>
            </button>
          </div>
          <div
            id="mcp-gateway-endpoint"
            class="rounded-lg border border-gray-200 bg-white px-3 py-3 font-mono text-sm leading-6 text-gray-900 shadow-inner"
            data-testid="mcp-gateway-endpoint"
          >
            <span class="break-all">{{ gatewayUrl }}</span>
          </div>
        </div>

        <div class="rounded-xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-800 lg:col-span-2" data-testid="mcp-gateway-token">
          <p class="font-semibold">{{ t('tools.components.tools.McpGatewayPanel.gateway_token') }}</p>
          <p class="mt-1 leading-6">{{ t('tools.components.tools.McpGatewayPanel.token_guidance') }}</p>
          <p v-if="tokenError" class="mt-2 text-red-700" role="alert" data-testid="mcp-gateway-token-error">{{ tokenError }}</p>
          <template v-else-if="token">
            <div class="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-gray-900" data-testid="mcp-gateway-token-value">
              <span class="break-all">{{ tokenShown ? token.token : maskedToken }}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button type="button" class="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100" data-testid="mcp-gateway-token-show" @click="tokenShown = !tokenShown">
                {{ tokenShown ? t('tools.components.tools.McpGatewayPanel.hide') : t('tools.components.tools.McpGatewayPanel.show') }}
              </button>
              <button type="button" class="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100" data-testid="mcp-gateway-token-copy" @click="copyToken">
                {{ tokenCopied ? t('tools.components.tools.McpGatewayPanel.copied') : t('tools.components.tools.McpGatewayPanel.copy') }}
              </button>
              <button
                v-if="token.source === 'node'"
                type="button"
                class="rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                :disabled="regenerating"
                data-testid="mcp-gateway-token-regenerate"
                @click="regenerateToken"
              >
                {{ t('tools.components.tools.McpGatewayPanel.regenerate') }}
              </button>
            </div>
            <p class="mt-2 text-xs leading-5 text-blue-700">
              {{ token.source === 'environment'
                ? t('tools.components.tools.McpGatewayPanel.token_from_environment')
                : t('tools.components.tools.McpGatewayPanel.regenerate_hint') }}
            </p>
          </template>
        </div>
      </div>

      <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-medium text-gray-700">{{ t('tools.components.tools.McpGatewayPanel.example_client_config') }}</h3>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            :class="configCopied
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-indigo-100 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50'"
            data-testid="mcp-gateway-copy-json"
            @click="copyConfigSnippet"
          >
            <Icon v-if="configCopied" icon="heroicons:check-20-solid" aria-hidden="true" class="h-4 w-4" />
            <Icon v-else icon="heroicons:document-duplicate-20-solid" aria-hidden="true" class="h-4 w-4" />
            <span>{{ configCopyLabel }}</span>
          </button>
        </div>
        <pre class="max-h-72 overflow-auto rounded-lg bg-gray-950 p-4 text-xs leading-5 text-gray-100"><code>{{ configSnippet }}</code></pre>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import apiService from '~/services/api';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useLocalization } from '~/composables/useLocalization';

type CopyTarget = 'endpoint' | 'config' | 'token';
/** The node's MCP gateway token (autobyteus-437 NA-12): every client needs it, this computer included. */
type GatewayToken = { token: string; source: 'environment' | 'node' };

const { t } = useLocalization();
const windowNodeContextStore = useWindowNodeContextStore();

const copiedTarget = ref<CopyTarget | null>(null);
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

const gatewayUrl = computed(() => {
  if (!windowNodeContextStore.initialized) {
    throw new Error('MCP gateway endpoint requested before window node binding.');
  }
  return `${windowNodeContextStore.nodeBaseUrl.replace(/\/+$/, '')}/mcp/gateway`;
});

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

const token = ref<GatewayToken | null>(null);
const tokenError = ref<string | null>(null);
const tokenShown = ref(false);
const regenerating = ref(false);
const maskedToken = computed(() => (token.value ? `${token.value.token.slice(0, 5)}${'•'.repeat(24)}` : ''));
const tokenCopied = computed(() => copiedTarget.value === 'token');

const loadToken = async () => {
  try {
    token.value = (await apiService.get<GatewayToken>('/mcp-gateway/token')).data;
    tokenError.value = null;
  } catch {
    tokenError.value = t('tools.components.tools.McpGatewayPanel.token_unavailable');
  }
};

const regenerateToken = async () => {
  regenerating.value = true;
  try {
    token.value = (await apiService.post<GatewayToken>('/mcp-gateway/token/regenerate')).data;
    tokenShown.value = true;
  } catch {
    tokenError.value = t('tools.components.tools.McpGatewayPanel.token_unavailable');
  } finally {
    regenerating.value = false;
  }
};

const copyToken = () => {
  if (token.value) void copyText(token.value.token, 'token');
};

onMounted(() => { void loadToken(); });

const endpointCopied = computed(() => copiedTarget.value === 'endpoint');
const configCopied = computed(() => copiedTarget.value === 'config');
const endpointCopyLabel = computed(() => endpointCopied.value
  ? t('tools.components.tools.McpGatewayPanel.copied')
  : t('tools.components.tools.McpGatewayPanel.copy'));
const configCopyLabel = computed(() => configCopied.value
  ? t('tools.components.tools.McpGatewayPanel.copied')
  : t('tools.components.tools.McpGatewayPanel.copy_json'));

const markCopied = (target: CopyTarget) => {
  copiedTarget.value = target;

  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
  }

  copyResetTimer = setTimeout(() => {
    if (copiedTarget.value === target) {
      copiedTarget.value = null;
    }
    copyResetTimer = null;
  }, 2000);
};

const copyText = async (value: string, target: CopyTarget) => {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API is unavailable.');
    }
    await navigator.clipboard.writeText(value);
    markCopied(target);
  } catch (error) {
    console.warn('Failed to copy MCP gateway text:', error);
  }
};

const copyEndpoint = () => {
  void copyText(gatewayUrl.value, 'endpoint');
};

const copyConfigSnippet = () => {
  void copyText(configSnippet.value, 'config');
};

onBeforeUnmount(() => {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer);
  }
});
</script>
