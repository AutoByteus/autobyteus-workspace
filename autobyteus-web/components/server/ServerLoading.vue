<template>
  <div class="server-loading-container" v-if="windowNodeContextStore.isEmbeddedWindow && (serverStore.status === 'starting' || serverStore.status === 'error' || serverStore.status === 'restarting')">
    <div class="server-loading-content">
      <div v-if="serverStore.status === 'starting'" class="loading-state">
        <div class="spinner"></div>
        <h2 class="text-xl font-semibold mt-4">Starting AutoByteus...</h2>
        <p class="text-gray-600 mt-2">{{ serverStore.connectionMessage }}</p>
        
        <div v-if="serverStore.connectionAttempts > 0" class="mt-2 text-gray-600">
          Connection attempt {{ serverStore.connectionAttempts }} of {{ serverStore.maxConnectionAttempts }}...
        </div>
        
        <div v-if="serverStore.isInitialStartup" class="mt-2 text-gray-600">
          <p>Initial server startup may take a moment. Please be patient...</p>
        </div>
        
        <div v-if="showDetails" class="technical-details mt-4">
          <p class="text-gray-600 text-sm">
            Backend service initializing...
          </p>
          <p class="text-gray-600 text-sm font-mono mt-1">
            {{ serverStore.urls.graphql }}
          </p>
          <p v-if="serverStore.healthCheckStatus" class="text-gray-600 text-sm mt-2">
            Health check: {{ serverStore.healthCheckStatus }}
          </p>
          <p v-if="logFilePath" class="text-gray-600 text-sm mt-2">
            Logs available at: {{ logFilePath }}
          </p>
        </div>
        
        <div class="mt-4 flex flex-col md:flex-row gap-2 justify-center">
          <button 
            @click="toggleDetails" 
            class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            {{ showDetails ? 'Hide technical details' : 'Show technical details' }}
          </button>
          <button 
            v-if="showDetails"
            @click="serverStore.checkServerHealth" 
            class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none md:ml-4"
          >
            Run health check
          </button>
        </div>
      </div>
      
      <div v-else-if="serverStore.status === 'error'" class="error-state">
        <div class="error-icon">❌</div>
        <h2 class="text-xl font-semibold mt-4 text-red-600">
          Application Error
        </h2>
        <p class="text-gray-800 mt-2">{{ serverStore.userFriendlyError }}</p>
        
        <div v-if="showDetails && serverStore.errorMessage" class="technical-details mt-4">
          <p class="text-gray-600 text-sm">Technical details: {{ serverStore.errorMessage }}</p>
          <p v-if="serverStore.healthCheckStatus" class="text-gray-600 text-sm mt-2">
            Health check: {{ serverStore.healthCheckStatus }}
          </p>
          <p v-if="logFilePath" class="text-gray-600 text-sm mt-2">
            Logs available at: {{ logFilePath }}
          </p>
        </div>
        
        <div class="mt-4 flex flex-col gap-2">
          <button 
            @click="serverStore.restartServer"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none"
          >
            Restart Server
          </button>
          <button 
            @click="serverStore.checkServerHealth" 
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none mt-2"
          >
            Check Server Health
          </button>
          <button 
            v-if="serverStore.errorMessage"
            @click="toggleDetails" 
            class="text-sm text-blue-600 hover:text-blue-800 focus:outline-none mt-2"
          >
            {{ showDetails ? 'Hide technical details' : 'Show technical details' }}
          </button>
        </div>
        
        <!-- Advanced Recovery Options -->
        <div class="mt-4">
          <button @click="showRecoveryOptions = !showRecoveryOptions" class="text-sm text-gray-600 hover:text-gray-800">
            {{ showRecoveryOptions ? 'Hide' : 'Show' }} Advanced Recovery Options
          </button>

          <div v-if="showRecoveryOptions" class="recovery-options mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded-lg text-left">
            <h4 class="font-bold text-yellow-800">Warning</h4>
            <p class="text-sm text-yellow-700 mt-1">
              These actions can lead to data loss. Proceed with caution.
            </p>
            <div class="mt-4 flex flex-col gap-2">
              <button 
                @click="handleResetData"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none"
              >
                Reset All Server Data and Restart
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="serverStore.status === 'restarting'" class="restarting-state">
        <div class="spinner"></div>
        <h2 class="text-xl font-semibold mt-4">Restarting Server...</h2>
        <p class="text-gray-600 mt-2">Please wait, this may take a moment.</p>
        <p v-if="serverStore.errorMessage" class="text-gray-600 mt-2 font-semibold">{{ serverStore.errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useServerStore } from '~/stores/serverStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

// Use the server store
const serverStore = useServerStore()
const windowNodeContextStore = useWindowNodeContextStore()

// Toggle for showing technical details
const showDetails = ref(false)
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

// Toggle for recovery options
const showRecoveryOptions = ref(false)

// Log file path
const logFilePath = ref('')

// Recovery handlers
const handleResetData = () => {
  const confirmed = window.confirm(
    '⚠️ DANGER: PERMANENT DATA LOSS ⚠️\n\n' +
    'Are you absolutely sure you want to reset all server data?\n\n' +
    'This will permanently delete the entire `server-data` directory, including:\n' +
    '- The database (all sessions, workspaces, etc.)\n' +
    '- Your settings and API keys\n\n' +
    'This action cannot be undone.'
  );
  if (confirmed) {
    serverStore.resetServerDataAndRestart();
  }
};

watch(() => serverStore.status, (newStatus, oldStatus) => {
  console.log(`ServerLoading: Status changed from ${oldStatus} to ${newStatus}`)
})

let healthInterval: NodeJS.Timeout | null = null

onMounted(async () => {
  console.log('ServerLoading: Component mounted with status:', serverStore.status)
  
  if (windowNodeContextStore.isEmbeddedWindow && window.electronAPI?.getLogFilePath) {
    try {
      logFilePath.value = await window.electronAPI.getLogFilePath()
    } catch (e) {
      console.error('Failed to get log file path:', e)
    }
  }
  
  setTimeout(() => {
    serverStore.checkServerHealth()
  }, 2000)
  
  healthInterval = setInterval(() => {
    if (serverStore.status === 'starting') {
      console.log('ServerLoading: Still starting, checking health again')
      serverStore.checkServerHealth()
    } else if (healthInterval) {
      clearInterval(healthInterval)
      healthInterval = null
    }
  }, serverStore.isInitialStartup ? 5000 : 3000)
})

onBeforeUnmount(() => {
  if (healthInterval) {
    clearInterval(healthInterval)
    healthInterval = null
  }
})
</script>

<style scoped>
.server-loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.server-loading-content {
  text-align: center;
  padding: 2rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  width: 30rem;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

.error-icon {
  font-size: 50px;
  margin: 0 auto;
}

.technical-details {
  background-color: #f8f9fa;
  padding: 0.75rem;
  border-radius: 0.25rem;
  font-family: monospace;
  text-align: left;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
