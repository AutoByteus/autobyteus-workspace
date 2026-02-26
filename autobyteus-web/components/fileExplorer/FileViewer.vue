<template>
  <div class="h-full w-full overflow-hidden relative">
    <!-- Loading State -->
    <div v-if="loading" class="flex-1 h-full flex items-center justify-center text-gray-400">
      Loading content...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline">{{ error }}</span>
    </div>

    <!-- Content Rendering -->
    <component
      v-else-if="activeComponent"
      :is="activeComponent"
      v-bind="componentProps"
      @update:model-value="$emit('update:modelValue', $event)"
      @save="$emit('save')"
      class="h-full w-full flex-1 min-h-0 overflow-auto"
    />

    <!-- Unsupported/Empty State -->
    <div v-else class="flex-1 h-full flex items-center justify-center text-gray-400">
      <p>Preview not available for this file type.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getLanguage } from '~/utils/highlighting/languageDetector';
import type { FileDataType, FileOpenMode } from '~/stores/fileExplorer';

// Import Viewers
import MonacoEditor from '~/components/fileExplorer/MonacoEditor.vue';
import ImageViewer from '~/components/fileExplorer/viewers/ImageViewer.vue';
import AudioPlayer from '~/components/fileExplorer/viewers/AudioPlayer.vue';
import VideoPlayer from '~/components/fileExplorer/viewers/VideoPlayer.vue';
import PdfViewer from '~/components/fileExplorer/viewers/PdfViewer.vue';
import ExcelViewer from '~/components/fileExplorer/viewers/ExcelViewer.vue';
import MarkdownPreviewer from '~/components/fileExplorer/viewers/MarkdownPreviewer.vue';
import HtmlPreviewer from '~/components/fileExplorer/viewers/HtmlPreviewer.vue';

const props = defineProps<{
  file: {
    path: string;
    type: FileDataType;
    content: string | null;
    url: string | null;
  };
  mode: FileOpenMode;
  loading?: boolean;
  error?: string | null;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save'): void;
}>();

const activeComponent = computed(() => {
  const { type, path } = props.file;
  const lowerPath = (path || '').toLowerCase();

  if (type === 'Text') {
    if (props.mode === 'preview') {
      if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) return MarkdownPreviewer;
      if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) return HtmlPreviewer;
      return MarkdownPreviewer; // Default preview
    }
    return MonacoEditor;
  }

  switch (type) {
    case 'Image': return ImageViewer;
    case 'Audio': return AudioPlayer;
    case 'Video': return VideoPlayer;
    case 'Excel': return ExcelViewer;
    case 'PDF': return PdfViewer;
    default: return null;
  }
});

const componentProps = computed(() => {
  if (props.file.type === 'Text') {
    if (props.mode === 'preview') {
      return {
        content: props.file.content || '',
        path: props.file.path,
      };
    }
    return {
      modelValue: props.file.content,
      language: getLanguage(props.file.path),
      readOnly: props.readOnly,
    };
  }

  // Media types
  return {
    url: props.file.url || null,
    content: props.file.content || null,
  };
});
</script>
