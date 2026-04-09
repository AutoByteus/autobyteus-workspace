<template>
  <div class="video-player-container">
    <video v-if="url" controls :src="url" class="video-player">{{ $t('tools.components.fileExplorer.viewers.VideoPlayer.your_browser_does_not_support_the') }}</video>
    <div v-else class="error-placeholder">
      <p>{{ $t('tools.components.fileExplorer.viewers.VideoPlayer.video_url_is_not_available') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  url: string | null;
}>();
</script>

<style scoped>
.video-player-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
  background-color: #000;
}

.video-player {
  max-width: 100%;
  max-height: 100%;
  border-radius: 0.5rem;
}

.error-placeholder {
  color: #9ca3af; /* gray-400 */
}
</style>
