<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" @click.self="closeModal">
      <!-- Modal Box -->
      <div class="relative bg-black rounded-lg shadow-xl w-full max-w-4xl h-auto max-h-[90vh] flex flex-col">
        <!-- Close Button -->
        <button
          @click="closeModal"
          aria-label="Close"
          class="absolute -top-3 -right-3 text-white bg-zinc-800 hover:bg-zinc-900 rounded-full p-2 z-20"
        >
          <Icon icon="heroicons:x-mark-solid" class="w-5 h-5" />
        </button>

        <!-- Copy URL Button -->
        <button
          v-if="videoUrl"
          @click="handleCopyUrl"
          :title="copyButtonTitle"
          aria-label="Copy URL"
          class="absolute -top-3 right-12 text-white bg-zinc-800 hover:bg-zinc-900 rounded-full p-2 z-20"
        >
          <Icon v-if="copyButtonState === 'copied'" icon="heroicons:check-solid" class="w-5 h-5 text-green-400" />
          <Icon v-else icon="heroicons:clipboard-document-solid" class="w-5 h-5" />
        </button>
        
        <!-- Video Player -->
        <div class="flex-grow flex items-center justify-center overflow-hidden p-4">
          <video
            v-if="videoUrl"
            :src="videoUrl"
            controls
            autoplay
            class="w-full h-auto max-h-[85vh] object-contain"
          >
            Your browser does not support the video tag.
          </video>
          <div v-else class="text-gray-400">
            No video to display.
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
  videoUrl: string | null;
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
  if (!props.videoUrl || copyButtonState.value === 'copied') return;

  try {
    await navigator.clipboard.writeText(props.videoUrl);
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
/* Optional: Add transition effects */
.fixed {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

