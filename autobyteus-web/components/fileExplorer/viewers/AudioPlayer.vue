<template>
  <div class="audio-player-container">
    <div v-if="hasMediaFailure" class="audio-error" role="alert">
      <p>{{ $t('tools.components.fileExplorer.viewers.AudioPlayer.audio_could_not_be_played') }}</p>
      <button type="button" class="retry-button" @click="retry">
        {{ $t('tools.components.fileExplorer.viewers.AudioPlayer.retry') }}
      </button>
    </div>
    <MediaLoadingState v-else-if="loading" kind="audio" :progress="progress" class="audio-loading" />
    <audio
      v-else-if="resolvedUrl"
      :key="mediaAttemptKey"
      controls
      :src="resolvedUrl"
      :data-media-attempt="mediaAttemptKey"
      class="audio-player"
      @error="handleMediaError"
      @loadedmetadata="handleLoadedMetadata"
    >{{ $t('tools.components.fileExplorer.viewers.AudioPlayer.your_browser_does_not_support_the') }}</audio>
    <div v-else class="error-placeholder">
      <p>{{ $t('tools.components.fileExplorer.viewers.AudioPlayer.audio_url_is_not_available') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthorizedObjectUrl } from '~/composables/useAuthorizedObjectUrl';
import MediaLoadingState from './MediaLoadingState.vue';

const props = defineProps<{
  url: string | null;
  /** The open file's reload count (autobyteus-450): a change loads the same URL again. */
  contentRevision?: number;
}>();

// The same states as the video player (autobyteus-572 D-6): a failure is plain words with Retry, never the raw error.
const mediaAttemptKey = ref(0);
const nativeMediaFailed = ref(false);
const { resolvedUrl, error: resourceError, loading, progress, refresh } = useAuthorizedObjectUrl(() => props.url, { revision: () => props.contentRevision ?? 0 });
const hasMediaFailure = computed(() => nativeMediaFailed.value || Boolean(resourceError.value));

watch([() => props.url, () => props.contentRevision], () => {
  nativeMediaFailed.value = false;
  mediaAttemptKey.value += 1;
});

const handleMediaError = (event: Event): void => {
  const mediaElement = event.currentTarget as HTMLAudioElement | null;
  if (Number(mediaElement?.dataset.mediaAttempt) === mediaAttemptKey.value) nativeMediaFailed.value = true;
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

.audio-loading {
  color: #4b5563; /* gray-600 */
}

.audio-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 28rem;
  color: #374151; /* gray-700 */
  text-align: center;
}

.retry-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  background-color: #111827; /* gray-900 */
  color: #f9fafb; /* gray-50 */
  font-weight: 600;
}

.retry-button:hover {
  background-color: #374151; /* gray-700 */
}

.retry-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}
</style>
