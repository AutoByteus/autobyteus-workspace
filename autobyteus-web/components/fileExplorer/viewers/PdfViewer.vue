<template>
  <div class="pdf-viewer-container flex flex-col h-full bg-gray-100 p-4 overflow-auto">
    <div v-if="loading" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Error loading PDF:</strong>
      <span class="block sm:inline">{{ error }}</span>
    </div>
    <VuePdfEmbed
      v-if="url"
      :source="url"
      class="pdf-content shadow-lg w-full max-w-4xl mx-auto"
      @loaded="onLoaded"
      @loading-failed="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import VuePdfEmbed from 'vue-pdf-embed'

// Essential styles for vue-pdf-embed
// index.css is no longer separate in v2, styles are injected or not needed for base
// Essential styles for annotation layer (if needed, but simple viewer might not strictly require it unless annotations are enabled)
import 'vue-pdf-embed/dist/styles/annotationLayer.css'
// Essential styles for text layer (for text selection)
import 'vue-pdf-embed/dist/styles/textLayer.css'


interface Props {
  url: string
}

const props = defineProps<Props>()

const loading = ref(true)
const error = ref<string | null>(null)

watch(() => props.url, () => {
  loading.value = true
  error.value = null
})

const onLoaded = () => {
  loading.value = false
}

const onError = (e: any) => {
  loading.value = false
  error.value = e ? e.message || String(e) : 'Unknown error'
  console.error('PDF load error:', e)
}
</script>

<style scoped>
.pdf-viewer-container {
  /* Ensure container takes full height and scrolls */
  min-height: 0;
}
</style>
