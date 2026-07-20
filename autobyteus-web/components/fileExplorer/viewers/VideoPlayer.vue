<template>
  <div class="video-player-container">
    <div v-if="hasMediaFailure" class="video-error" role="alert">
      <p>{{ $t('tools.components.fileExplorer.viewers.VideoPlayer.video_could_not_be_played') }}</p>
      <button type="button" class="retry-button" @click="retry">
        {{ $t('tools.components.fileExplorer.viewers.VideoPlayer.retry') }}
      </button>
    </div>
    <video
      v-else-if="resolvedUrl"
      :key="mediaAttemptKey"
      controls
      :src="resolvedUrl"
      :data-media-attempt="mediaAttemptKey"
      class="video-player"
      @error="handleMediaError"
      @loadedmetadata="handleLoadedMetadata"
    >{{ $t('tools.components.fileExplorer.viewers.VideoPlayer.your_browser_does_not_support_the') }}</video>
    <div v-else class="error-placeholder">
      <p>{{ $t('tools.components.fileExplorer.viewers.VideoPlayer.video_url_is_not_available') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthorizedObjectUrl } from '~/composables/useAuthorizedObjectUrl';

const props = defineProps<{
  url: string | null;
}>();

const mediaAttemptKey = ref(0);
const nativeMediaFailed = ref(false);
const { resolvedUrl, error: resourceError, refresh } = useAuthorizedObjectUrl(() => props.url);
const hasMediaFailure = computed(() => nativeMediaFailed.value || Boolean(resourceError.value));

watch(() => props.url, () => {
  nativeMediaFailed.value = false;
  mediaAttemptKey.value += 1;
});

const handleMediaError = (event: Event): void => {
  const mediaElement = event.currentTarget as HTMLVideoElement | null;
  const failedAttempt = Number(mediaElement?.dataset.mediaAttempt);
  if (failedAttempt === mediaAttemptKey.value) {
    nativeMediaFailed.value = true;
  }
};

const handleLoadedMetadata = (): void => {
  nativeMediaFailed.value = false;
};

const retry = async (): Promise<void> => {
  nativeMediaFailed.value = false;
  mediaAttemptKey.value += 1;
  await refresh();
};
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

.video-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 28rem;
  color: #f3f4f6; /* gray-100 */
  text-align: center;
}

.retry-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  background-color: #f9fafb; /* gray-50 */
  color: #111827; /* gray-900 */
  font-weight: 600;
}

.retry-button:hover {
  background-color: #e5e7eb; /* gray-200 */
}

.retry-button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 3px;
}
</style>
