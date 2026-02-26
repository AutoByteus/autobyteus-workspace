<template>
  <div class="audio-player-container">
    <audio v-if="url" controls :src="url" class="audio-player">
      Your browser does not support the audio element.
    </audio>
    <div v-else class="error-placeholder">
      <p>Audio URL is not available.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  url: string | null;
}>();
</script>

<style scoped>
.audio-player-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
  background-color: #f9fafb; /* gray-50 */
}

.audio-player {
  width: 100%;
  max-width: 500px;
}

.error-placeholder {
  color: #6b7280; /* gray-500 */
}
</style>
