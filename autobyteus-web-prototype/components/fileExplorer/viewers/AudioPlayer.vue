<template>
  <div class="audio-player-container">
    <audio v-if="resolvedUrl" controls :src="resolvedUrl" class="audio-player">{{ $t('tools.components.fileExplorer.viewers.AudioPlayer.your_browser_does_not_support_the') }}</audio>
    <div v-else class="error-placeholder">
      <p>{{ resourceError || $t('tools.components.fileExplorer.viewers.AudioPlayer.audio_url_is_not_available') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthorizedObjectUrl } from '~/composables/useAuthorizedObjectUrl';

const props = defineProps<{
  url: string | null;
}>();

const { resolvedUrl, error: resourceError } = useAuthorizedObjectUrl(() => props.url);
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
