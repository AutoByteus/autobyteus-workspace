<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <!-- Modal Box -->
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md flex flex-col p-6">
        <!-- Close Button -->
        <button
          @click="closeModal"
          aria-label="Close"
          class="absolute top-2 right-2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Icon icon="heroicons:x-mark-solid" class="w-5 h-5" />
        </button>

        <!-- Copy URL Button -->
        <button
          v-if="audioUrl"
          @click="handleCopyUrl"
          :title="copyButtonTitle"
          class="absolute top-2 right-10 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Icon v-if="copyButtonState === 'copied'" icon="heroicons:check-solid" class="w-5 h-5 text-green-500" />
          <Icon v-else icon="heroicons:clipboard-document-solid" class="w-5 h-5" />
        </button>
        
        <!-- Header -->
        <div class="flex items-center mb-4">
          <Icon icon="heroicons:musical-note-solid" class="w-8 h-8 text-indigo-500 mr-3" />
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Audio Player</h3>
        </div>

        <!-- Audio Player -->
        <div class="flex-grow">
          <audio
            v-if="audioUrl"
            :src="audioUrl"
            controls
            autoplay
            class="w-full"
          >
            Your browser does not support the audio element.
          </audio>
          <div v-else class="text-gray-500 dark:text-gray-400 text-center py-4">
            No audio to display.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  visible: boolean;
  audioUrl: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const copyButtonState = ref<'idle' | 'copied'>('idle');
const copyButtonTitle = computed(() => copyButtonState.value === 'idle' ? 'Copy URL' : 'Copied!');

const closeModal = () => {
  emit('close');
};

const handleCopyUrl = async () => {
  if (!props.audioUrl || copyButtonState.value === 'copied') return;

  try {
    await navigator.clipboard.writeText(props.audioUrl);
    copyButtonState.value = 'copied';
    setTimeout(() => {
      copyButtonState.value = 'idle';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy URL: ', err);
    alert('Failed to copy URL to clipboard.');
  }
};
</script>

<style scoped>
.fixed {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

