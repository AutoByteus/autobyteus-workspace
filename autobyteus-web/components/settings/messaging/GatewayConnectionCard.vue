<template>
  <section class="border border-gray-200 rounded-lg p-4">
    <h3 class="text-sm font-semibold text-gray-900">Gateway Connection</h3>
    <p class="mt-1 text-xs text-gray-500">
      Configure and validate the message gateway endpoint used for external setup flows.
    </p>

    <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <input
        v-model="baseUrl"
        type="text"
        placeholder="https://gateway.example.com"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
        data-testid="gateway-base-url-input"
      />
      <input
        v-model="adminToken"
        type="password"
        placeholder="Optional admin token"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        data-testid="gateway-token-input"
      />
    </div>

    <div class="mt-3 flex items-center gap-2">
      <button
        class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking"
        @click="onValidateConnection"
        data-testid="gateway-validate-button"
      >
        {{ gatewayStore.isGatewayChecking ? 'Validating...' : 'Validate Connection' }}
      </button>

      <span
        class="text-xs px-2 py-0.5 rounded uppercase tracking-wide"
        :class="statusClass"
        data-testid="gateway-status-badge"
      >
        {{ gatewayStore.gatewayStatus }}
      </span>
    </div>

    <p v-if="gatewayStore.gatewayError" class="mt-2 text-sm text-red-600" data-testid="gateway-error">
      {{ gatewayStore.gatewayError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

const gatewayStore = useGatewaySessionSetupStore();

const baseUrl = computed({
  get: () => gatewayStore.gatewayBaseUrl,
  set: (value: string) => {
    gatewayStore.setGatewayConfig({ baseUrl: value });
  },
});

const adminToken = computed({
  get: () => gatewayStore.gatewayAdminToken,
  set: (value: string) => {
    gatewayStore.setGatewayConfig({ adminToken: value });
  },
});

const statusClass = computed(() => {
  if (gatewayStore.gatewayStatus === 'READY') {
    return 'bg-green-100 text-green-700';
  }
  if (gatewayStore.gatewayStatus === 'BLOCKED') {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-700';
});

async function onValidateConnection(): Promise<void> {
  try {
    await gatewayStore.validateGatewayConnection({
      baseUrl: baseUrl.value,
      adminToken: adminToken.value,
    });
  } catch {
    // Error state is reflected by store.
  }
}
</script>
