<template>
  <div class="video-player-container">
    <div v-if="playbackMode === 'native'" class="native-video" data-testid="native-video">
      <p class="native-video-title">{{ title }}</p>
      <button type="button" class="play-button" @click="playNatively">
        {{ $t('tools.components.fileExplorer.viewers.VideoPlayer.play') }}
      </button>
    </div>
    <MediaLoadingState v-else-if="playbackMode === 'pending'" kind="video" :progress="null" class="video-loading" />
    <div v-else-if="hasMediaFailure" class="video-error" role="alert">
      <p>{{ $t('tools.components.fileExplorer.viewers.VideoPlayer.video_could_not_be_played') }}</p>
      <button type="button" class="retry-button" @click="retry">
        {{ $t('tools.components.fileExplorer.viewers.VideoPlayer.retry') }}
      </button>
    </div>
    <MediaLoadingState v-else-if="loading" kind="video" :progress="progress" class="video-loading" />
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
import { useNativeVideoPlayback, videoTitleOf } from '~/composables/mobile/useNativeVideoPlayback';
import MediaLoadingState from './MediaLoadingState.vue';

const props = defineProps<{
  url: string | null;
  /** The open file's reload count (autobyteus-450): a change loads the same URL again. */
  contentRevision?: number;
}>();

const mediaAttemptKey = ref(0);
const nativeMediaFailed = ref(false);
// In the phone apps a protected node video plays in the app's own player, by range (autobyteus-574 D-2): the page then
// loads nothing itself; elsewhere it plays here, as before.
const nativePlayback = useNativeVideoPlayback();
const playbackMode = computed(() => nativePlayback.modeFor(props.url));
const title = computed(() => (props.url ? videoTitleOf(props.url) : ''));
const { resolvedUrl, error: resourceError, loading, progress, refresh } = useAuthorizedObjectUrl(
  () => (playbackMode.value === 'page' ? props.url : null),
  { revision: () => props.contentRevision ?? 0 },
);

const playNatively = (): void => {
  if (props.url) nativePlayback.play(props.url, title.value);
};

// Opening a video opens the player at once (the viewer shown, another URL, or the app's answer arriving); Play opens it
// again after it was closed. A reload of the same file (`contentRevision`: the file changed, or it was opened again)
// never opens it by itself: the player may be open, or the user closed it (autobyteus-574 CR-001).
watch([playbackMode, () => props.url], ([mode, url], previous) => {
  const [previousMode, previousUrl] = previous ?? [];
  if (mode === 'native' && (previousMode !== 'native' || previousUrl !== url)) playNatively();
}, { immediate: true });
const hasMediaFailure = computed(() => nativeMediaFailed.value || Boolean(resourceError.value));

watch([() => props.url, () => props.contentRevision], () => {
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

.native-video {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  color: #f3f4f6; /* gray-100 */
  text-align: center;
}

.native-video-title {
  max-width: 100%;
  overflow-wrap: anywhere;
}

.play-button {
  min-width: 6rem;
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  background-color: #f9fafb; /* gray-50 */
  color: #111827; /* gray-900 */
  font-weight: 600;
}

.play-button:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 3px;
}

.video-loading {
  color: #e5e7eb; /* gray-200 */
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
