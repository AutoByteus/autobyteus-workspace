<template>
  <div class="flex flex-col h-full">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-medium text-gray-900">MCP Servers</h2>
      <div class="flex items-center space-x-2">
        <button
          @click="$emit('bulk-import')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <span class="i-heroicons-document-arrow-down-20-solid w-4 h-4 mr-1"></span>
          Bulk Import
        </button>
        <button
          @click="$emit('add')"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <span class="i-heroicons-plus-20-solid w-4 h-4 mr-1"></span>
          Add Server
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="text-center py-8">
      <span class="i-heroicons-arrow-path-20-solid w-8 h-8 text-gray-400 mx-auto animate-spin"></span>
      <p class="text-gray-500 mt-2">Loading servers...</p>
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
      <span class="i-heroicons-server-stack-20-solid w-10 h-10 text-gray-400 mx-auto mb-3"></span>
      <p class="text-gray-500">No MCP Servers configured.</p>
      <p class="text-sm text-gray-400 mt-2">Add a server or use Bulk Import to get started.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import McpServerCard from './McpServerCard.vue';
import type { McpServer } from '~/stores/toolManagementStore';

defineProps<{
  servers: McpServer[];
  loading: boolean;
}>();

defineEmits(['add', 'bulk-import', 'view-tools', 'edit', 'delete', 'discover-tools']);
</script>
