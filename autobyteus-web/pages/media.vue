<template>
  <div class="flex flex-col h-full bg-gray-50 font-sans">
    <!-- Header -->
    <header class="flex-shrink-0 bg-white border-b border-gray-200">
      <div class="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <h1 class="text-xl font-bold text-gray-900">Media Library</h1>
          
          <!-- Category Tabs -->
          <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              v-for="category in store.getCategories"
              :key="category"
              @click="store.setCategory(category)"
              :class="[
                category === store.selectedCategory
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium capitalize'
              ]"
            >
              {{ category }}
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto flex flex-col">
      <div class="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 flex flex-1 flex-col">
        <div class="flex-1">
          <!-- Loading State -->
          <div v-if="store.loading" class="text-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">Loading media...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="store.error" class="text-center py-20 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-lg font-medium text-red-700">Something went wrong</p>
            <p class="text-sm text-red-600 mt-1">{{ store.error }}</p>
          </div>
          
          <!-- Empty State -->
          <div v-else-if="store.files.length === 0" class="text-center py-20 bg-white rounded-lg border">
            <p class="text-lg font-medium text-gray-700">No media found</p>
            <p class="text-sm text-gray-500 mt-1">There are no files in the '{{ store.selectedCategory }}' category.</p>
          </div>
          
          <!-- Media Grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            <div 
              v-for="file in store.files" 
              :key="file.url"
              class="group relative aspect-square overflow-hidden rounded-lg bg-gray-200 shadow-sm transition-all"
            >
              <div @click="openMedia(file)" class="cursor-pointer w-full h-full">
                <!-- Image Thumbnail -->
                <img v-if="file.category === 'images'" :src="file.url" :alt="file.filename" class="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <!-- Video/Audio Icon Placeholder -->
                <div v-else class="flex h-full w-full items-center justify-center bg-gray-700">
                  <Icon :icon="getIconForCategory(file.category)" class="h-1/3 w-1/3 text-gray-400" />
                </div>
                <!-- Overlay -->
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity"></div>
                <!-- Filename -->
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p class="truncate text-xs font-medium text-white">{{ file.filename }}</p>
                </div>
              </div>
              <!-- Delete Button -->
              <button
                @click.stop="requestDelete(file)"
                class="absolute top-2 right-2 z-10 p-1.5 bg-gray-800 bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                title="Delete file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <nav v-if="store.pagination.totalPages > 1" class="flex-shrink-0 flex items-center justify-between border-t border-gray-200 px-4 sm:px-0 mt-8 pt-4">
          <div class="-mt-px flex w-0 flex-1">
            <button @click="store.changePage(store.pagination.currentPage - 1)" :disabled="store.pagination.currentPage === 1" class="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50">
              Previous
            </button>
          </div>
          <div class="hidden md:-mt-px md:flex">
            <span class="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500">
              Page {{ store.pagination.currentPage }} of {{ store.pagination.totalPages }}
            </span>
          </div>
          <div class="-mt-px flex w-0 flex-1 justify-end">
            <button @click="store.changePage(store.pagination.currentPage + 1)" :disabled="store.pagination.currentPage === store.pagination.totalPages" class="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:opacity-50">
              Next
            </button>
          </div>
        </nav>
      </div>
    </main>
    
    <ToastContainer />

    <!-- Modals -->
    <FullScreenImageModal
      :visible="isImageModalVisible"
      :image-url="selectedMediaUrl"
      :download-filename="selectedMediaFile?.filename"
      @close="closeModals"
      @next="showNextImage"
      @previous="showPreviousImage"
    />
    <FullScreenVideoModal 
      :visible="isVideoModalVisible" 
      :video-url="selectedMediaUrl" 
      :download-filename="selectedMediaFile?.filename"
      @close="closeModals" 
    />
    <FullScreenAudioModal 
      :visible="isAudioModalVisible" 
      :audio-url="selectedMediaUrl" 
      :download-filename="selectedMediaFile?.filename"
      @close="closeModals" 
    />
    <ConfirmationModal
      :show="showConfirmDelete"
      title="Confirm Deletion"
      :message="`Are you sure you want to permanently delete '<strong>${fileToDelete?.filename}</strong>'?<br>This action cannot be undone.`"
      confirm-button-text="Delete"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useMediaLibraryStore, type MediaFile } from '~/stores/mediaLibraryStore';
import FullScreenImageModal from '~/components/common/FullScreenImageModal.vue';
import FullScreenVideoModal from '~/components/common/FullScreenVideoModal.vue';
import FullScreenAudioModal from '~/components/common/FullScreenAudioModal.vue';
import ConfirmationModal from '~/components/common/ConfirmationModal.vue';
import ToastContainer from '~/components/common/ToastContainer.vue';
import { Icon } from '@iconify/vue';

const store = useMediaLibraryStore();

const selectedMediaUrl = ref<string | null>(null);
const selectedMediaFile = ref<MediaFile | null>(null);
const isImageModalVisible = ref(false);
const isVideoModalVisible = ref(false);
const isAudioModalVisible = ref(false);
const fileToDelete = ref<MediaFile | null>(null);
const showConfirmDelete = ref(false);

const imageFiles = computed(() => store.files.filter(f => f.category === 'images'));

const handleKeydown = (event: KeyboardEvent) => {
  // Don't hijack keys when user is typing or interacting with form controls
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName;
  if (target && (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;

  // Avoid paging while a modal is open
  if (isImageModalVisible.value || isVideoModalVisible.value || isAudioModalVisible.value) return;

  if (event.key === 'ArrowLeft' && store.pagination.currentPage > 1) {
    event.preventDefault();
    store.changePage(store.pagination.currentPage - 1);
  } else if (event.key === 'ArrowRight' && store.pagination.currentPage < store.pagination.totalPages) {
    event.preventDefault();
    store.changePage(store.pagination.currentPage + 1);
  }
};

onMounted(() => {
  store.fetchMedia();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const getIconForCategory = (category: string): string => {
  switch (category) {
    case 'video': return 'heroicons:video-camera-solid';
    case 'audio': return 'heroicons:musical-note-solid';
    case 'documents': return 'heroicons:document-text-solid';
    default: return 'heroicons:question-mark-circle-solid';
  }
};

const openMedia = (file: MediaFile) => {
  selectedMediaUrl.value = file.url;
  selectedMediaFile.value = file;
  switch (file.category) {
    case 'images':
      isImageModalVisible.value = true;
      break;
    case 'video':
      isVideoModalVisible.value = true;
      break;
    case 'audio':
      isAudioModalVisible.value = true;
      break;
    default:
      // For documents or others, open in a new tab
      window.open(file.url, '_blank');
      selectedMediaUrl.value = null;
      selectedMediaFile.value = null;
      break;
  }
};

const closeModals = () => {
  isImageModalVisible.value = false;
  isVideoModalVisible.value = false;
  isAudioModalVisible.value = false;
  // Delay clearing URL to prevent content flash during modal close animation
  setTimeout(() => {
    selectedMediaUrl.value = null;
    selectedMediaFile.value = null;
  }, 300);
};

const requestDelete = (file: MediaFile) => {
  fileToDelete.value = file;
  showConfirmDelete.value = true;
};

const cancelDelete = () => {
  showConfirmDelete.value = false;
  fileToDelete.value = null;
};

const confirmDelete = async () => {
  if (!fileToDelete.value) return;
  
  try {
    await store.deleteMediaFile(fileToDelete.value);
  } catch (error) {
    // The store handles the error toast, so we just log it here for debugging.
    console.error('Deletion failed at component level');
  } finally {
    cancelDelete();
  }
};

const showNextImage = () => {
  if (!selectedMediaUrl.value || imageFiles.value.length === 0) return;
  const currentIndex = imageFiles.value.findIndex(f => f.url === selectedMediaUrl.value);
  if (currentIndex === -1) return;

  const nextIndex = (currentIndex + 1) % imageFiles.value.length;
  openMedia(imageFiles.value[nextIndex]);
};

const showPreviousImage = () => {
  if (!selectedMediaUrl.value || imageFiles.value.length === 0) return;
  const currentIndex = imageFiles.value.findIndex(f => f.url === selectedMediaUrl.value);
  if (currentIndex === -1) return;

  const prevIndex = (currentIndex - 1 + imageFiles.value.length) % imageFiles.value.length;
  openMedia(imageFiles.value[prevIndex]);
};
</script>
