<template>
  <div class="file-display-container">
    <MarkdownRenderer v-if="isMarkdownFile" :content="content" class="markdown-body prose dark:prose-invert prose-gray max-w-none" />
    <pre
      v-else
      :class="`language-${language} w-full my-0`"
    ><code
      v-html="highlightedCode"
      :class="`language-${language}`"
      data-highlighted="true"
    ></code></pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import { highlightWriteFileSegment } from '~/utils/highlighting/segmentHighlighter';
import { getLanguage } from '~/utils/highlighting/languageDetector';
import type { WriteFileSegment } from '~/types/segments';
import 'prismjs/themes/prism.css'; // Ensure PrismJS theme is available

const props = defineProps<{
  path: string;
  content: string;
}>();

const isMarkdownFile = computed(() => props.path.endsWith('.md'));
const language = computed(() => getLanguage(props.path));

// To use highlightWriteFileSegment, we need to construct a temporary WriteFileSegment-like object.
const tempFileSegmentForHighlighting = computed((): WriteFileSegment => ({
  type: 'write_file',
  invocationId: 'highlight-preview',
  toolName: 'write_file',
  arguments: {},
  status: 'parsed',
  logs: [],
  result: null,
  error: null,
  path: props.path,
  originalContent: props.content,
  language: language.value,
}));

const highlightedCode = computed(() => {
  if (isMarkdownFile.value) {
    return ''; // MarkdownRenderer handles markdown content.
  }
  try {
    // The highlightWriteFileSegment function expects a WriteFileSegment object.
    return highlightWriteFileSegment(tempFileSegmentForHighlighting.value).highlightedContent || '';
  } catch (err) {
    console.error(`Failed to highlight content for path: ${props.path}`, err);
    // Fallback to un-highlighted content, properly escaped to prevent XSS.
    return props.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});
</script>

<style scoped>
/* Scoped styles for the file display component */
.file-display-container pre[class*="language-"] {
  margin: 0;
  padding: 1em;
  overflow: auto;
}

.file-display-container code[class*="language-"] {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
}
</style>
