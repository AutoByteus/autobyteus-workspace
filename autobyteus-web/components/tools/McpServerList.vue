<template>
  <div class="flex flex-col h-full">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-medium text-gray-900">{{ $t('tools.components.tools.McpServerList.mcp_servers') }}</h2>
      <div class="flex items-center space-x-2">
        <button
          @click="$emit('bulk-import')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {{ $t('tools.components.tools.McpServerList.bulk_import') }}</button>
        <button
          @click="$emit('add')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {{ $t('tools.components.tools.McpServerList.add_server') }}</button>
      </div>
    </div>
    
    <McpSecretMoveBanner @show-toast="$emit('show-toast', $event)" />

    <div v-if="loading" class="text-center py-8">
      <Icon icon="heroicons:arrow-path-20-solid" class="w-8 h-8 text-gray-400 mx-auto animate-spin" />
      <p class="text-gray-500 mt-2">{{ $t('tools.components.tools.McpServerList.loading_servers') }}</p>
    </div>
    
    <div v-else-if="servers.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <McpServerCard
        v-for="server in servers"
        :key="server.serverId"
        :server="server"
        @view-tools="$emit('view-tools', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @discover-tools="$emit('discover-tools', $event)"
      />
    </div>

    <div v-else class="col-span-full flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-lg border border-gray-200">
      <p class="text-gray-500">{{ $t('tools.components.tools.McpServerList.no_mcp_servers_configured') }}</p>
      <p class="text-sm text-gray-400 mt-2">{{ $t('tools.components.tools.McpServerList.add_a_server_or_use_bulk') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import McpServerCard from './McpServerCard.vue';
import McpSecretMoveBanner from './McpSecretMoveBanner.vue';
import type { McpServer } from '~/types/mcpServer';

defineProps<{
  servers: McpServer[];
  loading: boolean;
}>();

defineEmits(['add', 'bulk-import', 'view-tools', 'edit', 'delete', 'discover-tools', 'show-toast']);
</script>
