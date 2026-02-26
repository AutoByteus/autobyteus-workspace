<template>
  <div 
    class="image-viewer-container"
    ref="containerRef"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @dblclick="resetZoom"
    :style="{ cursor: cursorStyle }"
  >
    <img 
      v-if="url" 
      :src="url" 
      alt="Image content" 
      class="image-content"
      :style="imageTransformStyle"
      draggable="false"
    />
    <div v-else class="error-placeholder">
      <p>Image URL is not available.</p>
    </div>

    <!-- Zoom indicator -->
    <div v-if="url" class="zoom-indicator">
      <span class="zoom-text">{{ zoomPercentage }}%</span>
      <button 
        v-if="scale !== 1" 
        @click="resetZoom" 
        class="reset-button"
        title="Reset zoom (double-click image)"
      >
        Reset
      </button>
    </div>

    <!-- Zoom hint on first view -->
    <div v-if="url && showHint" class="zoom-hint">
      <span>Scroll to zoom • Drag to pan • Double-click to reset</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

defineProps<{
  url: string | null;
}>();

// Zoom state
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const containerRef = ref<HTMLElement | null>(null);

// Drag state
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const positionStart = ref({ x: 0, y: 0 });

// Hint visibility
const showHint = ref(true);
let hintTimeout: ReturnType<typeof setTimeout> | null = null;

// Zoom constraints
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const ZOOM_SENSITIVITY = 0.001;

const zoomPercentage = computed(() => Math.round(scale.value * 100));

const cursorStyle = computed(() => {
  if (isDragging.value) return 'grabbing';
  if (scale.value > 1) return 'grab';
  return 'default';
});

const imageTransformStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${position.value.x}px, ${position.value.y}px)`,
  transformOrigin: 'center center',
}));

const handleWheel = (event: WheelEvent) => {
  // Hide hint on first interaction
  if (showHint.value) {
    showHint.value = false;
  }

  const delta = -event.deltaY * ZOOM_SENSITIVITY;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale.value * (1 + delta)));
  
  // If zooming out to 1 or below, reset position
  if (newScale <= 1 && scale.value > 1) {
    position.value = { x: 0, y: 0 };
  }
  
  scale.value = newScale;
};

const handleMouseDown = (event: MouseEvent) => {
  // Only allow dragging when zoomed in
  if (scale.value <= 1) return;
  
  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  positionStart.value = { ...position.value };
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return;
  
  const dx = (event.clientX - dragStart.value.x) / scale.value;
  const dy = (event.clientY - dragStart.value.y) / scale.value;
  
  position.value = {
    x: positionStart.value.x + dx,
    y: positionStart.value.y + dy,
  };
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const resetZoom = () => {
  scale.value = 1;
  position.value = { x: 0, y: 0 };
};

onMounted(() => {
  // Auto-hide hint after 3 seconds
  hintTimeout = setTimeout(() => {
    showHint.value = false;
  }, 3000);
});

onBeforeUnmount(() => {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
  }
});
</script>

<style scoped>
.image-viewer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1rem;
  background-color: #f9fafb; /* gray-50 */
  overflow: hidden;
  position: relative;
  user-select: none;
}

.image-content {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  transition: transform 0.1s ease-out;
  pointer-events: none;
}

.error-placeholder {
  color: #6b7280; /* gray-500 */
}

.zoom-indicator {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.zoom-text {
  min-width: 3rem;
  text-align: center;
}

.reset-button {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #3b82f6;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-button:hover {
  background: #dbeafe;
  color: #2563eb;
}

.zoom-hint {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  animation: fadeInOut 3s ease-in-out forwards;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
