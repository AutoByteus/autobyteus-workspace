<template>
  <div 
    class="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col"
  >
    <div class="p-4 flex-grow flex flex-col">
      <div class="flex justify-between items-start">
        <div 
          class="flex-grow min-w-0 cursor-pointer hover:opacity-80"
          @click="$emit('view-tools', server.serverId)"
        >
          <h3 class="font-medium text-gray-900 truncate">{{ server.serverId }}</h3>
          <p class="text-sm text-gray-500">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
              {{ server.transportType }}
            </span>
          </p>
        </div>
        <div class="flex items-center flex-shrink-0 ml-2">
          <span 
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            :class="server.enabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
          >
            {{ server.enabled ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>
      
      <!-- Details Section -->
      <div 
        class="mt-4 border-t border-gray-200 pt-4 space-y-2 cursor-pointer hover:bg-gray-50 -mx-4 px-4 pb-2"
        @click="$emit('view-tools', server.serverId)"
      >
        <div v-if="server.toolNamePrefix" class="flex items-center text-sm">
          <span class="i-heroicons-tag-20-solid w-4 h-4 text-gray-400 mr-2 flex-shrink-0"></span>
          <span class="text-gray-500 mr-2">Prefix:</span>
          <code class="text-gray-800 font-semibold">{{ server.toolNamePrefix }}</code>
        </div>
        
        <!-- STDIO Details -->
        <template v-if="server.__typename === 'StdioMcpServerConfig'">
          <div class="flex items-start text-sm">
            <span class="i-heroicons-command-line-20-solid w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5"></span>
            <span class="text-gray-500 mr-2">Command:</span>
            <code class="text-gray-800 break-all">{{ server.command }}</code>
          </div>
          <div v-if="server.cwd" class="flex items-start text-sm">
            <span class="i-heroicons-folder-open-20-solid w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5"></span>
            <span class="text-gray-500 mr-2">CWD:</span>
            <code class="text-gray-800 break-all">{{ server.cwd }}</code>
          </div>
        </template>
        
        <!-- HTTP Details -->
        <template v-if="server.__typename === 'StreamableHttpMcpServerConfig'">
           <div class="flex items-start text-sm">
            <span class="i-heroicons-globe-alt-20-solid w-4 h-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5"></span>
            <span class="text-gray-500 mr-2">URL:</span>
            <code class="text-gray-800 break-all">{{ server.url }}</code>
          </div>
        </template>
      </div>
      
      <div class="mt-auto pt-4 flex justify-end items-center space-x-2">
        <button
          @click.stop="$emit('discover-tools', server.serverId)"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-cyan-700 bg-cyan-100 hover:bg-cyan-200"
          title="Discover and register tools for this server"
        >
          <span class="i-heroicons-sparkles-20-solid w-4 h-4 mr-1.5"></span>
          Sync Tools
        </button>
        <button
          @click.stop="$emit('edit', server)"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          Edit
        </button>
        <button
          @click.stop="$emit('delete', server.serverId)"
          class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { McpServer } from '~/stores/toolManagementStore';

defineProps<{
  server: McpServer;
}>();

defineEmits(['view-tools', 'edit', 'delete', 'discover-tools']);
</script>
