<template>
  <div
    v-if="windowNodeContextStore.isEmbeddedWindow"
    class="server-monitor h-full flex flex-col overflow-hidden"
  >
    <div class="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
      <h2 class="text-xl font-semibold text-gray-900">Server Status</h2>
    </div>
    
    <div class="flex-1 overflow-auto p-8">
    
    <!-- Server Status Card -->
    <div 
      class="status-card p-6 rounded-lg mb-6"
      :class="{
        'bg-green-50 border border-green-200': serverStore.status === 'running',
        'bg-yellow-50 border border-yellow-200': serverStore.status === 'starting',
        'bg-red-50 border border-red-200': serverStore.status === 'error'
      }"
    >
      <div class="flex items-center mb-4">
        <div 
          class="w-3 h-3 rounded-full mr-3" 
          :class="{
            'bg-green-500': serverStore.status === 'running',
            'bg-yellow-500': serverStore.status === 'starting',
            'bg-red-500': serverStore.status === 'error'
          }"
        ></div>
        <h3 class="text-lg font-medium">
          <span v-if="serverStore.status === 'running'">Server Running</span>
          <span v-else-if="serverStore.status === 'starting'">Server Starting</span>
          <span v-else-if="serverStore.status === 'error'">Server Error</span>
          <span v-else>Unknown Status</span>
        </h3>
      </div>
      
      <div class="mb-4">
        <p v-if="serverStore.status === 'running'" class="text-green-700">
          The server is running and ready to use.
        </p>
        <p v-else-if="serverStore.status === 'starting'" class="text-yellow-700">
          {{ serverStore.connectionMessage }}
        </p>
        <p v-else-if="serverStore.status === 'error'" class="text-red-700">
          {{ serverStore.userFriendlyError }}
        </p>
      </div>
      
      <div class="flex justify-end items-center space-x-4">
        <button 
          @click="serverStore.checkServerHealth" 
          data-testid="server-monitor-refresh-button"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none transition-colors duration-150"
        >
          Refresh Status
        </button>
        <template v-if="canRestartServerControl">
          <button
            @click="handleRestartServer"
            data-testid="server-monitor-restart-button"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none transition-colors duration-150"
          >
            Restart Server
          </button>
        </template>
      </div>
    </div>
    
    <!-- Server Technical Details -->
    <div class="technical-details bg-gray-50 p-6 rounded-lg">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Technical Details</h3>
      
      <div class="grid gap-4 md:grid-cols-2 mb-4">
        <!-- Removed Server Type block as it's no longer needed -->
        
        <div class="detail-item">
          <span class="text-sm text-gray-500">Server URL:</span>
          <p class="font-mono">{{ serverStore.urls.graphql }}</p>
        </div>
        
        <div class="detail-item">
          <span class="text-sm text-gray-500">Health Check Status:</span>
          <p class="font-mono">{{ serverStore.healthCheckStatus || 'Not checked' }}</p>
        </div>
        
        <div class="detail-item" v-if="logFilePath">
          <span class="text-sm text-gray-500">Log File:</span>
          <p class="font-mono">{{ logFilePath }}</p>
        </div>
      </div>
      
      <!-- Server Logs Section - only show in Electron mode -->
      <ServerLogViewer 
        v-if="logFilePath" 
        :logFilePath="logFilePath" 
      />
    </div>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center text-gray-500 p-8">
    Embedded server monitor is unavailable for remote node windows.
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useServerStore } from '~/stores/serverStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import ServerLogViewer from '~/components/server/ServerLogViewer.vue'

const serverStore = useServerStore()
const windowNodeContextStore = useWindowNodeContextStore()
const logFilePath = ref('')
const canRestartServerControl = computed(
  () => windowNodeContextStore.isEmbeddedWindow && serverStore.isElectron && Boolean(window.electronAPI?.restartServer),
)

const handleRestartServer = async () => {
  if (!canRestartServerControl.value) return
  await serverStore.restartServer()
}

onMounted(async () => {
  console.log('ServerMonitor: Component mounted with status:', serverStore.status)
  
  if (windowNodeContextStore.isEmbeddedWindow && window.electronAPI?.getLogFilePath) {
    try {
      logFilePath.value = await window.electronAPI.getLogFilePath()
    } catch (e) {
      console.error('Failed to get log file path:', e)
    }
  }
  
  serverStore.checkServerHealth()
})
</script>

<style scoped>
.detail-item {
  margin-bottom: 0.5rem;
}
</style>
