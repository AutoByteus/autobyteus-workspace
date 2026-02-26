<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
    @click.self="closeModalAndReset"
    @keydown.esc="closeModalAndReset"
    @keydown.left.prevent="emit('previous')"
    @keydown.right.prevent="emit('next')"
    tabindex="0"
    ref="modalContainer"
  >
    <!-- Modal Box -->
    <div 
      class="group relative bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-xl 
             w-full max-w-[95vw] h-full max-h-[95vh] min-h-[75vh] 
             flex flex-col"
    >
      <!-- Top-right Controls: Appear on hover -->
      <div class="absolute top-3 right-3 z-20 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
            v-if="imageUrl && (currentScale !== 1 || imageScrollContainer && (imageScrollContainer.scrollLeft !== 0 || imageScrollContainer.scrollTop !== 0))"
            @click="resetImageState"
            title="Reset View"
            class="p-2 text-white bg-zinc-700/70 hover:bg-zinc-800/90 backdrop-blur-sm rounded-full transition-colors"
        >
            <Icon icon="heroicons:arrow-uturn-left-solid" class="w-5 h-5" />
        </button>
        <button
            v-if="imageUrl"
            @click="handleCopyUrl"
            :title="copyButtonTitle"
            class="p-2 text-white bg-zinc-700/70 hover:bg-zinc-800/90 backdrop-blur-sm rounded-full transition-colors"
        >
            <Icon v-if="copyButtonState === 'copied'" icon="heroicons:check-solid" class="w-5 h-5 text-green-400" />
            <Icon v-else icon="heroicons:clipboard-document-solid" class="w-5 h-5" />
        </button>
        <button
            v-if="imageUrl"
            @click="handleDownload"
            title="Download"
            class="p-2 text-white bg-zinc-700/70 hover:bg-zinc-800/90 backdrop-blur-sm rounded-full transition-colors"
        >
            <Icon icon="heroicons:arrow-down-tray-solid" class="w-5 h-5" />
        </button>
        <button
          @click="closeModalAndReset"
          title="Close"
          aria-label="Close"
          class="p-2 text-white bg-zinc-700/70 hover:bg-zinc-800/90 backdrop-blur-sm rounded-full transition-colors"
        >
          <Icon icon="heroicons:x-mark-solid" class="w-5 h-5" />
        </button>
      </div>

      <!-- Image container for zooming and scrolling -->
      <div 
        class="overflow-auto flex-grow relative select-none" 
        ref="imageScrollContainer"
        @wheel="handleWheelZoom"
      >
        <img 
          v-if="imageUrl"
          :src="imageUrl" 
          :alt="altText" 
          class="object-contain mx-auto my-auto transition-transform duration-75 ease-out"
          :style="{ transform: `scale(${currentScale})`, transformOrigin: 'top left', cursor: isDragging ? 'grabbing' : 'grab' }"
          ref="zoomableImage"
          draggable="false"
          @mousedown="startDrag"
          @mousemove="drag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
        />
        <div v-else class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          No image to display.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount, computed } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  visible: boolean;
  imageUrl: string | null;
  altText?: string;
  downloadFilename?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'next'): void;
  (e: 'previous'): void;
}>();

const modalContainer = ref<HTMLElement | null>(null);
const imageScrollContainer = ref<HTMLElement | null>(null); 
const zoomableImage = ref<HTMLImageElement | null>(null); 

const currentScale = ref(1);
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const ZOOM_SENSITIVITY = 0.1;

const isDragging = ref(false);
const lastDragPosition = ref<{ x: number; y: number } | null>(null);

const copyButtonState = ref<'idle' | 'copied'>('idle');
const copyButtonTitle = computed(() => copyButtonState.value === 'idle' ? 'Copy URL' : 'Copied!');

const resetImageState = () => {
  currentScale.value = 1;
  if (imageScrollContainer.value) {
    imageScrollContainer.value.scrollLeft = 0;
    imageScrollContainer.value.scrollTop = 0;
  }
};

const closeModalAndReset = () => {
  emit('close');
};

const handleDownload = () => {
  if (props.imageUrl) {
    const a = document.createElement('a');
    a.href = props.imageUrl;
    a.download = props.downloadFilename || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const handleCopyUrl = async () => {
  if (!props.imageUrl || copyButtonState.value === 'copied') return;

  try {
    await navigator.clipboard.writeText(props.imageUrl);
    copyButtonState.value = 'copied';
    setTimeout(() => {
      copyButtonState.value = 'idle';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy URL: ', err);
    alert('Failed to copy URL to clipboard.');
  }
};

const handleWheelZoom = (event: WheelEvent) => {
  if (!props.imageUrl || !imageScrollContainer.value || !zoomableImage.value) return;
  event.preventDefault();

  const container = imageScrollContainer.value;
  const rect = container.getBoundingClientRect();

  const mouseXInContainer = event.clientX - rect.left;
  const mouseYInContainer = event.clientY - rect.top;

  const pointX = (container.scrollLeft + mouseXInContainer) / currentScale.value;
  const pointY = (container.scrollTop + mouseYInContainer) / currentScale.value;
  
  const delta = event.deltaY > 0 ? -ZOOM_SENSITIVITY : ZOOM_SENSITIVITY;
  let newScale = currentScale.value * (1 + delta); 
  newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

  const newScrollLeft = pointX * newScale - mouseXInContainer;
  const newScrollTop = pointY * newScale - mouseYInContainer;

  currentScale.value = newScale;

  nextTick(() => {
    if (imageScrollContainer.value) { 
        imageScrollContainer.value.scrollLeft = newScrollLeft;
        imageScrollContainer.value.scrollTop = newScrollTop;
    }
  });
};

const startDrag = (event: MouseEvent) => {
  if (!imageScrollContainer.value) return;
  if (event.button !== 0) return;

  isDragging.value = true;
  lastDragPosition.value = { x: event.clientX, y: event.clientY };
  
  window.addEventListener('mousemove', drag);
  window.addEventListener('mouseup', endDrag);
};

const drag = (event: MouseEvent) => {
  if (!isDragging.value || !lastDragPosition.value || !imageScrollContainer.value) return;
  event.preventDefault(); 

  const dx = event.clientX - lastDragPosition.value.x;
  const dy = event.clientY - lastDragPosition.value.y;

  imageScrollContainer.value.scrollLeft -= dx;
  imageScrollContainer.value.scrollTop -= dy;

  lastDragPosition.value = { x: event.clientX, y: event.clientY };
};

const endDrag = () => {
  if (!isDragging.value) return;

  isDragging.value = false;
  lastDragPosition.value = null;
  
  window.removeEventListener('mousemove', drag);
  window.removeEventListener('mouseup', endDrag);
};

watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    await nextTick(); 
    modalContainer.value?.focus(); 
    resetImageState(); 
  } else {
    resetImageState(); 
    if(isDragging.value) endDrag();
  }
});

watch(() => props.imageUrl, () => {
    resetImageState();
});

onMounted(() => {
  if (props.visible) {
     modalContainer.value?.focus();
     resetImageState();
  }
});

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', drag);
    window.removeEventListener('mouseup', endDrag);
});

</script>

<style scoped>
[tabindex="0"]:focus {
  outline: none;
}
.object-contain {
  max-width: 100%;
  max-height: 100%;
}
.select-none {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
img {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  user-drag: none;
}
</style>
