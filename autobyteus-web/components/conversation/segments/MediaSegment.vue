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
        <img :src="url" alt="Generated image" class="rounded-lg object-cover w-full h-full shadow-md transition-transform duration-300 group-hover:scale-105" />
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
          <button @click.stop="openModal(url)" class="p-2 bg-gray-800 bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100" title="View Full Size">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="w-5 h-5 fill-current"><path d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V384c0-17.7-14.3-32-32-32H64zM320 32c-17.7 0-32 14.3-32 32v64h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320zM384 352c-17.7 0-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V384c0-17.7-14.3-32-32-32z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Audio Display -->
    <div v-if="segment.mediaType === 'audio'" class="space-y-3">
      <div v-for="(url, index) in segment.urls" :key="index">
        <audio controls :src="url" class="w-full">
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>

    <!-- Video Display -->
    <div v-if="segment.mediaType === 'video'" class="space-y-4">
      <div v-for="(url, index) in segment.urls" :key="index" class="relative">
        <video controls :src="url" class="rounded-lg w-full shadow-md">
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
    
    <!-- Modal for Full-Screen Image -->
    <FullScreenImageModal
      v-if="selectedImageUrl"
      :visible="isModalVisible"
      :image-url="selectedImageUrl"
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

defineProps<{
  segment: MediaSegment;
}>();

const isModalVisible = ref(false);
const selectedImageUrl = ref<string | null>(null);

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
    const response = await fetch(url);
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
