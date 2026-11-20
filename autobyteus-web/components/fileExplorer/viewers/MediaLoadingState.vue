<template>
  <div class="media-loading-state" role="status" aria-live="polite" data-testid="media-loading-state">
    <!-- A media file on its way (autobyteus-572 D-3): what is loading and how much has arrived; never "not available". -->
    <span class="media-loading-spinner" aria-hidden="true" />
    <p class="media-loading-label">{{ $t(LABEL_KEYS[kind]) }}</p>
    <p v-if="progressText" class="media-loading-progress" data-testid="media-loading-progress">{{ progressText }}</p>
  </div>
</template>

<script lang="ts">
import type { DownloadProgress } from '~/utils/download/responseBlobProgress';

// Decimal units, as the phone's own file details show a file's size (a 9,684,568-byte video is "9.7 MB" there).
const KILOBYTE = 1000;
const MEGABYTE = 1000 * 1000;

/** A byte count as the loading view shows it: megabytes with one decimal ("4.1 MB"), kilobytes below one megabyte. */
export const formatLoadedBytes = (bytes: number): string =>
  bytes >= MEGABYTE ? `${(bytes / MEGABYTE).toFixed(1)} MB` : `${Math.max(0, Math.round(bytes / KILOBYTE))} KB`;

/**
 * How much of a download has arrived, as text: "4.1 of 9.7 MB" when its length is known (both in the unit of the
 * total), else "4.1 MB"; null before anything is known. `ofTotal` words the known-length form.
 */
export const formatLoadingProgress = (
  progress: DownloadProgress | null,
  ofTotal: (loaded: string, total: string) => string,
): string | null => {
  if (!progress) return null;
  if (progress.total === null || progress.total <= 0) return progress.loaded > 0 ? formatLoadedBytes(progress.loaded) : null;
  const unit = progress.total >= MEGABYTE ? MEGABYTE : KILOBYTE;
  const suffix = unit === MEGABYTE ? 'MB' : 'KB';
  const amount = (bytes: number) => (unit === MEGABYTE ? (bytes / unit).toFixed(1) : String(Math.round(bytes / unit)));
  return ofTotal(amount(Math.min(progress.loaded, progress.total)), `${amount(progress.total)} ${suffix}`);
};

const LABEL_KEYS = {
  video: 'tools.components.fileExplorer.viewers.MediaLoadingState.loading_video',
  audio: 'tools.components.fileExplorer.viewers.MediaLoadingState.loading_audio',
  file: 'tools.components.fileExplorer.viewers.MediaLoadingState.loading_file',
} as const;

export type MediaLoadingKind = keyof typeof LABEL_KEYS;
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';

const props = defineProps<{
  kind: MediaLoadingKind;
  progress: DownloadProgress | null;
}>();

const { t } = useLocalization();
const progressText = computed(() => formatLoadingProgress(props.progress, (loaded, total) =>
  t('tools.components.fileExplorer.viewers.MediaLoadingState.progress_of_total', { loaded, total })));
</script>

<style scoped>
.media-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
}

.media-loading-spinner {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  border: 3px solid currentColor;
  border-right-color: transparent;
  opacity: 0.7;
  animation: media-loading-spin 0.9s linear infinite;
}

.media-loading-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.media-loading-progress {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

@keyframes media-loading-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .media-loading-spinner { animation: none; }
}
</style>
