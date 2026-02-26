<template>
  <div class="mermaid-diagram-component group relative my-4" @mouseenter="isHovering = true" @mouseleave="isHovering = false">
    
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center min-h-[100px]">
      <svg class="animate-spin h-8 w-8 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="mt-3 text-sm text-gray-600 dark:text-gray-300">Rendering diagram...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state p-6 border border-dashed border-red-400 dark:border-red-600 rounded bg-red-50 dark:bg-gray-800 flex flex-col items-center justify-center min-h-[100px]">
      <svg class="h-8 w-8 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      <span class="mt-3 text-sm text-red-600 dark:text-red-400 text-center font-mono whitespace-pre-wrap">{{ error }}</span>
    </div>

    <!-- Diagram content -->
    <div v-else class="diagram-content relative overflow-auto flex justify-center p-2 rounded bg-white dark:bg-[#1e1e1e]" ref="containerRef">
       <div v-html="svgContent" class="mermaid-svg-container" :id="uniqueDiagramId"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { mermaidService } from '~/services/mermaidService';

const props = defineProps<{
  content: string;
  diagramId?: string;
}>();

const uniqueDiagramId = computed(() => props.diagramId || `mermaid-${Math.floor(Math.random() * 100000)}`);
const isLoading = ref(true);
const error = ref<string | null>(null);
const svgContent = ref('');
const isHovering = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const renderDiagram = async () => {
    isLoading.value = true;
    error.value = null;
    svgContent.value = '';

    try {
        // Initialize service (idempotent, handles theme)
        // TODO: Detect current theme from store and pass to initialize
        mermaidService.initialize(); 
        
        const svg = await mermaidService.render(props.content, uniqueDiagramId.value);
        svgContent.value = svg;
    } catch (e: any) {
        console.error("Mermaid rendering failed:", e);
        error.value = e.message || 'Failed to render mermaid diagram';
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    renderDiagram();
});

watch(() => props.content, () => {
    renderDiagram();
});
</script>

<style>
/* 
Mermaid SVG styling issues often arise because styles are encapsulated. 
Since mermaid generates inline SVG with internal styles or classes, 
we sometimes need global overrides or ensure the container allows correct sizing.
*/
.mermaid-svg-container svg {
    max-width: 100%;
    height: auto;
}
</style>
