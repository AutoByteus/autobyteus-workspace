<template>
  <div class="server-log-viewer">
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-lg font-medium text-gray-800">Server Logs</h4>
      <div class="flex items-center space-x-2">
        <button 
          @click="refreshLogs" 
          class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none flex items-center"
          :disabled="isLoadingLogs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Logs
        </button>
        <button 
          @click="openLogFile" 
          class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          Open in Editor
        </button>
        <label class="inline-flex items-center text-sm text-gray-600">
          <input type="checkbox" v-model="autoRefreshLogs" class="form-checkbox h-4 w-4 text-blue-600">
          <span class="ml-2">Auto-refresh</span>
        </label>
      </div>
    </div>
    
    <div class="relative">
      <div 
        v-if="isLoadingLogs" 
        class="absolute inset-0 flex justify-center items-center bg-gray-50 bg-opacity-75 z-10"
      >
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
      
      <div 
        v-if="logContent" 
        class="log-content bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs h-96 overflow-auto"
      >
        <pre>{{ logContent }}</pre>
      </div>
      
      <div 
        v-else-if="logError" 
        class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg"
      >
        {{ logError }}
      </div>
      
      <div 
        v-else 
        class="bg-gray-100 p-4 rounded-lg text-gray-500 text-center h-96 flex items-center justify-center"
      >
        No logs available. Click "Refresh Logs" to load server logs.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useServerStore } from '~/stores/serverStore'

const props = defineProps({
  logFilePath: {
    type: String,
    required: true
  }
})

const serverStore = useServerStore()
const logContent = ref('')
const logError = ref('')
const isLoadingLogs = ref(false)
const autoRefreshLogs = ref(false)
let logRefreshInterval: NodeJS.Timeout | null = null

onMounted(async () => {
  console.log('ServerLogViewer: Component mounted')
  
  // Load logs immediately on mount
  await refreshLogs()
  
  // Set up auto-refresh interval for logs
  setupAutoRefresh()
})

// Watch for changes to autoRefreshLogs
watch(autoRefreshLogs, (newValue) => {
  if (newValue) {
    setupAutoRefresh()
  } else {
    clearAutoRefresh()
  }
})

const setupAutoRefresh = () => {
  // Clear any existing interval
  clearAutoRefresh()
  
  // Only set up interval if auto-refresh is enabled
  if (autoRefreshLogs.value) {
    logRefreshInterval = setInterval(async () => {
      await refreshLogs(false) // Don't show loading indicator for auto-refresh
    }, 5000) // Refresh every 5 seconds
  }
}

const clearAutoRefresh = () => {
  if (logRefreshInterval) {
    clearInterval(logRefreshInterval)
    logRefreshInterval = null
  }
}

onBeforeUnmount(() => {
  clearAutoRefresh()
})

const refreshLogs = async (showLoading: boolean = true) => {
  if (!serverStore.isElectron || !window.electronAPI?.readLogFile || !props.logFilePath) {
    logError.value = 'Cannot read log file: functionality not available'
    return
  }
  
  if (showLoading) {
    isLoadingLogs.value = true
  }
  
  try {
    logError.value = '' // Clear any previous error
    const result = await window.electronAPI.readLogFile(props.logFilePath)
    
    if (result.success) {
      logContent.value = result.content
    } else {
      logError.value = result.error || 'Failed to read log file'
    }
  } catch (e) {
    console.error('Error reading log file:', e)
    logError.value = e instanceof Error ? e.message : 'Unknown error reading log file'
  } finally {
    isLoadingLogs.value = false
  }
}

const openLogFile = async () => {
  if (!serverStore.isElectron || !window.electronAPI?.openLogFile || !props.logFilePath) {
    logError.value = 'Cannot open log file: functionality not available'
    return
  }
  
  try {
    logError.value = '' // Clear any previous error
    const result = await window.electronAPI.openLogFile(props.logFilePath)
    
    if (!result.success) {
      logError.value = result.error || 'Failed to open log file'
    }
  } catch (e) {
    console.error('Error opening log file:', e)
    logError.value = e instanceof Error ? e.message : 'Unknown error opening log file'
  }
}
</script>

<style scoped>
.server-log-viewer {
  margin-top: 1.5rem;
}

.log-content {
  font-family: 'Courier New', Courier, monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
