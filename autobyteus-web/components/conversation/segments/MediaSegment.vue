<template>
  <div class="media-segment-container my-4">
    <!-- Image Display -->
    <div v-if="segment.mediaType === 'image'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div 
        v-for="(url, index) in segment.urls" 
        :key="index" 
        class="relative group cursor-pointer" 
        @click="openModal(url)"
      >
        <img v-if="displayUrlFor(url)" :src="displayUrlFor(url) || ''" :alt="$t('workspace.components.conversation.segments.MediaSegment.generated_image')" class="rounded-lg object-cover w-full h-full shadow-md transition-transform duration-300 group-hover:scale-105" />
        <div v-else class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {{ resourceErrorsBySource[url] || 'Loading protected media…' }}
        </div>
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
          <button @click.stop="openModal(url)" class="p-2 bg-gray-800 bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100" :title="$t('workspace.components.conversation.segments.MediaSegment.view_full_size')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-5 h-5 fill-current"><path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V384c0-17.7-14.3-32-32-32H64zM320 32c-17.7 0-32 14.3-32 32v64h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zM384 352c-17.7 0-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V384c0-17.7-14.3-32-32-32z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Audio Display -->
    <div v-if="segment.mediaType === 'audio'" class="space-y-3">
      <div v-for="(url, index) in segment.urls" :key="index">
        <!-- In the phone apps a node audio file of a type the app plays opens its own player (autobyteus-642 D-2). -->
        <button
          v-if="audioPlayback.modeFor(url, fileNameOf(url)) === 'native'"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg bg-gray-900 p-4 text-left text-white shadow-md"
          data-testid="native-audio-tile"
          @click="audioPlayback.play(url, fileNameOf(url))"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-8 w-8 flex-none fill-current"><path d="M8 5v14l11-7z" /></svg>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">{{ $t('workspace.components.conversation.segments.MediaSegment.play_audio') }}</span>
            <span class="block truncate text-xs text-gray-300">{{ fileNameOf(url) }}</span>
          </span>
        </button>
        <p v-else-if="audioPlayback.modeFor(url, fileNameOf(url)) === 'pending'" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{{ $t('workspace.components.conversation.segments.MediaSegment.loading_audio') }}</p>
        <audio v-else-if="displayUrlFor(url)" controls :src="displayUrlFor(url) || ''" class="w-full">{{ $t('workspace.components.conversation.segments.MediaSegment.your_browser_does_not_support_the') }}</audio>
        <p v-else class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{{ resourceErrorsBySource[url] || 'Loading protected audio…' }}</p>
      </div>
    </div>

    <!-- Video Display -->
    <div v-if="segment.mediaType === 'video'" class="space-y-4">
      <div v-for="(url, index) in segment.urls" :key="index" class="relative">
        <!-- In the phone apps a node video opens the app's own player (autobyteus-574 D-2); nothing is downloaded here. -->
        <button
          v-if="videoPlayback.modeFor(url, fileNameOf(url)) === 'native'"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg bg-gray-900 p-4 text-left text-white shadow-md"
          data-testid="native-video-tile"
          @click="videoPlayback.play(url, fileNameOf(url))"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" class="h-8 w-8 flex-none fill-current"><path d="M8 5v14l11-7z" /></svg>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">{{ $t('workspace.components.conversation.segments.MediaSegment.play_video') }}</span>
            <span class="block truncate text-xs text-gray-300">{{ fileNameOf(url) }}</span>
          </span>
        </button>
        <p v-else-if="videoPlayback.modeFor(url, fileNameOf(url)) === 'pending'" class="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{{ $t('workspace.components.conversation.segments.MediaSegment.loading_video') }}</p>
        <video v-else-if="displayUrlFor(url)" controls :src="displayUrlFor(url) || ''" class="rounded-lg w-full shadow-md">{{ $t('workspace.components.conversation.segments.MediaSegment.your_browser_does_not_support_the_2') }}</video>
        <p v-else class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{{ resourceErrorsBySource[url] || 'Loading protected video…' }}</p>
      </div>
    </div>
    
    <!-- Modal for Full-Screen Image -->
    <FullScreenImageModal
      v-if="selectedImageUrl"
      :visible="isModalVisible"
      :image-url="selectedImageDisplayUrl"
      alt-text="Generated image - full size"
      :download-filename="downloadFilename"
      @close="closeModal"
      @download="downloadImage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MediaSegment } from '~/types/segments';
import FullScreenImageModal from '~/components/common/FullScreenImageModal.vue';
import { useAuthorizedObjectUrlMap } from '~/composables/useAuthorizedObjectUrl';
import { useNativeMediaPlayback } from '~/composables/mobile/useNativeMediaPlayback';
import { authorizedFetch } from '~/utils/remoteAccess/authorizedTransport';

const props = defineProps<{
  segment: MediaSegment;
}>();

const isModalVisible = ref(false);
const selectedImageUrl = ref<string | null>(null);
const videoPlayback = useNativeMediaPlayback('video');
/**
 * The file a media URL of this message names: a node media file is `/rest/files/<relativePath>`, so the last segment of
 * its path, decoded (autobyteus-642 SR-004). The tile's label and the native player's title.
 */
const fileNameOf = (url: string): string => {
  try {
    return decodeURIComponent(new URL(url, 'http://node.invalid').pathname.split('/').filter(Boolean).pop() ?? '');
  } catch {
    return '';
  }
};
const audioPlayback = useNativeMediaPlayback('audio');
// A video or audio file the app plays itself (or may, while it has not answered) is not downloaded by the page.
const pageLoadedUrls = () => {
  const { mediaType, urls } = props.segment;
  if (mediaType === 'video') return urls.filter((url) => videoPlayback.modeFor(url, fileNameOf(url)) === 'page');
  if (mediaType === 'audio') return urls.filter((url) => audioPlayback.modeFor(url, fileNameOf(url)) === 'page');
  return urls;
};
const {
  errorsBySource: resourceErrorsBySource,
  resolveUrl: displayUrlFor,
} = useAuthorizedObjectUrlMap(pageLoadedUrls);
const selectedImageDisplayUrl = computed(() => {
  if (!selectedImageUrl.value) {
    return null;
  }
  return displayUrlFor(selectedImageUrl.value) || selectedImageUrl.value;
});

const downloadFilename = computed(() => {
  if (!selectedImageUrl.value) return 'image.png';
  try {
    const url = new URL(selectedImageUrl.value);
    const pathParts = url.pathname.split('/');
    const filename = pathParts.pop() || 'image.png';
    return filename.includes('.') ? filename : `${filename}.png`;
  } catch (e) {
    // Fallback for invalid URLs or URLs without a clear filename
    return `generated-image-${Date.now()}.png`;
  }
});

const openModal = (url: string) => {
  selectedImageUrl.value = url;
  isModalVisible.value = true;
};

const closeModal = () => {
  isModalVisible.value = false;
  // Delay clearing the URL to allow for the modal's closing animation
  setTimeout(() => {
    selectedImageUrl.value = null;
  }, 300);
};

const downloadImage = async () => {
  const url = selectedImageUrl.value;
  if (!url) return;
  
  try {
    // Fetch the image data
    const response = await authorizedFetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const blobUrl = URL.createObjectURL(blob);
    
    // Create a link element and trigger download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadFilename.value;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Failed to download image:', err);
    // Fallback for when fetch fails (e.g., CORS) - open in a new tab
    window.open(url, '_blank');
  }
};
</script>

<style scoped>
/* Scoped styles for the media segment component */
.media-segment-container img,
.media-segment-container video {
  max-width: 100%;
  height: auto;
  display: block;
}

.media-segment-container audio {
  display: block;
}
</style>
