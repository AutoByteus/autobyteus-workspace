<template>
  <div class="shutdown-container" v-if="windowNodeContextStore.isEmbeddedWindow && serverStore.status === 'shutting-down'">
    <div class="shutdown-content">
      <div class="spinner"></div>
      <h2 class="text-xl font-semibold mt-4">Shutting Down...</h2>
      <p class="text-gray-600 mt-2">Please wait while we safely close the application.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useServerStore } from '~/stores/serverStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
const serverStore = useServerStore()
const windowNodeContextStore = useWindowNodeContextStore()
</script>

<style scoped>
.shutdown-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.shutdown-content {
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
