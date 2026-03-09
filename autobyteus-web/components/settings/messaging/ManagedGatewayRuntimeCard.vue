<template>
  <section class="border border-gray-200 rounded-lg p-4 bg-white">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-900">Managed Messaging Gateway</h3>
        <p class="mt-1 text-xs text-gray-500">
          Shared messaging runtime for all providers on the selected node.
        </p>
      </div>

      <span
        class="self-start text-xs px-2 py-0.5 rounded uppercase tracking-wide"
        :class="statusClass"
        data-testid="gateway-status-badge"
      >
        {{ gatewayStore.managedStatus?.lifecycleState || gatewayStore.gatewayStatus }}
      </span>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button
        class="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onEnableGateway"
        data-testid="gateway-enable-button"
      >
        {{ gatewayStore.isGatewayMutating ? 'Applying...' : primaryActionLabel }}
      </button>
      <button
        class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onRefreshStatus"
        data-testid="gateway-refresh-button"
      >
        {{ gatewayStore.isGatewayChecking ? 'Refreshing...' : 'Refresh Status' }}
      </button>
      <button
        class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onUpdateGateway"
        data-testid="gateway-update-button"
      >
        Update Runtime
      </button>
      <button
        class="px-4 py-2 rounded-md border border-red-300 text-red-700 text-sm disabled:opacity-50"
        :disabled="gatewayStore.isGatewayChecking || gatewayStore.isGatewayMutating"
        @click="onDisableGateway"
        data-testid="gateway-disable-button"
      >
        Disable
      </button>
    </div>

    <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4 text-sm">
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Runtime State</p>
        <p class="font-medium text-gray-800" data-testid="managed-gateway-runtime-state">
          {{ runtimeStateLabel }}
        </p>
      </div>
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Active Version</p>
        <p class="font-medium text-gray-800" data-testid="managed-gateway-active-version">
          {{ gatewayStore.managedStatus?.activeVersion || 'Not installed' }}
        </p>
      </div>
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Release Tag</p>
        <p class="font-medium text-gray-800">{{ gatewayStore.managedStatus?.releaseTag || 'N/A' }}</p>
      </div>
      <div class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p class="text-xs text-gray-500">Runtime Endpoint</p>
        <p class="font-medium text-gray-800" data-testid="managed-gateway-port">
          {{ bindPortLabel }}
        </p>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
      <div class="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p class="text-xs uppercase tracking-wide text-gray-500">Installed Versions</p>
        <p class="mt-1 font-medium text-gray-800">
          {{ installedVersionsLabel }}
        </p>
      </div>
      <div class="rounded-md border border-gray-200 bg-white px-3 py-2">
        <p class="text-xs uppercase tracking-wide text-gray-500">Supported Providers</p>
        <p class="mt-1 font-medium text-gray-800">
          {{ supportedProvidersLabel }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          Excluded providers: {{ excludedProvidersLabel }}
        </p>
      </div>
    </div>

    <p
      v-if="gatewayStore.managedStatus?.message"
      class="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
      data-testid="managed-gateway-message"
    >
      {{ gatewayStore.managedStatus.message }}
    </p>
    <p v-if="gatewayStore.gatewayError" class="mt-3 text-sm text-red-600" data-testid="gateway-error">
      {{ gatewayStore.gatewayError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

const gatewayStore = useGatewaySessionSetupStore();

const statusClass = computed(() => {
  if (gatewayStore.gatewayStatus === 'READY') {
    return 'bg-green-100 text-green-700';
  }
  if (gatewayStore.gatewayStatus === 'BLOCKED') {
    return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-700';
});

const runtimeStateLabel = computed(() => {
  if (gatewayStore.managedStatus?.runtimeRunning) {
    return 'Running';
  }
  if (gatewayStore.managedStatus?.enabled) {
    return 'Enabled, not running';
  }
  return 'Disabled';
});

const bindPortLabel = computed(() => {
  const host = gatewayStore.managedStatus?.bindHost;
  const port = gatewayStore.managedStatus?.bindPort;
  if (!host || !port) {
    return 'Not running';
  }
  return `${host}:${port}`;
});

const installedVersionsLabel = computed(() => {
  const versions = gatewayStore.managedStatus?.installedVersions || [];
  return versions.length > 0 ? versions.join(', ') : 'None';
});

const supportedProvidersLabel = computed(() => {
  const providers = gatewayStore.managedStatus?.supportedProviders || [];
  return providers.length > 0 ? providers.join(', ') : 'None';
});

const excludedProvidersLabel = computed(() => {
  const providers = gatewayStore.managedStatus?.excludedProviders || [];
  return providers.length > 0 ? providers.join(', ') : 'None';
});

const primaryActionLabel = computed(() => {
  const status = gatewayStore.managedStatus;
  if (!status?.activeVersion) {
    return 'Install and Start Gateway';
  }
  if (!status.runtimeRunning) {
    return 'Start Gateway';
  }
  return 'Restart Gateway';
});

async function onRefreshStatus(): Promise<void> {
  try {
    await gatewayStore.refreshManagedGatewayStatus();
  } catch {
    // Store exposes error state.
  }
}

async function onEnableGateway(): Promise<void> {
  try {
    await gatewayStore.enableManagedGateway();
  } catch {
    // Store exposes error state.
  }
}

async function onDisableGateway(): Promise<void> {
  try {
    await gatewayStore.disableManagedGateway();
  } catch {
    // Store exposes error state.
  }
}

async function onUpdateGateway(): Promise<void> {
  try {
    await gatewayStore.updateManagedGateway();
  } catch {
    // Store exposes error state.
  }
}
</script>
