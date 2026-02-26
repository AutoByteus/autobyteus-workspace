<template>
  <div class="markdown-renderer-segments" @click="handleLinkClick">
    <template v-for="segment in segments" :key="segment.key">
      <div v-if="segment.type === 'html'" v-html="segment.content" class="markdown-body prose dark:prose-invert prose-gray max-w-none"></div>
      <MermaidDiagram
        v-else-if="segment.type === 'mermaid'"
        :content="segment.content"
        class="mermaid-segment-container"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useMarkdownSegments } from '~/composables/useMarkdownSegments';
import MermaidDiagram from './MermaidDiagram.vue'; 
import 'prismjs/themes/prism.css'; 
// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css';

const props = defineProps<{
  content: string;
}>();

const contentRef = computed(() => props.content);
const { parsedSegments } = useMarkdownSegments(contentRef);

const segments = computed(() => parsedSegments.value);

const markdownRendererContainer = ref<HTMLElement | null>(null);

const applyPostRenderEffects = async () => {
    await nextTick();
};

const handleLinkClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const anchor = target.closest('a');
  
  if (anchor && anchor.href) {
    try {
      const url = new URL(anchor.href);
      if (['http:', 'https:'].includes(url.protocol)) {
        event.preventDefault();
        openExternalLink(anchor.href);
      }
    } catch (e) {
      console.warn('Could not parse anchor href, or it is not an external link:', anchor.href, e);
    }
  }
};

const openExternalLink = (url: string) => {
  if (window.electronAPI?.openExternalLink) {
    try {
      window.electronAPI.openExternalLink(url);
      return;
    } catch (e) {
      console.error('Failed to open link using electronAPI.openExternalLink. Falling back to window.open.', e);
    }
  }
  
  window.open(url, '_blank', 'noopener,noreferrer');
};

onMounted(applyPostRenderEffects);
watch(segments, applyPostRenderEffects, { deep: true });

</script>

<style>
.markdown-renderer-segments .markdown-body pre[class*="language-"] {
  margin: 1em 0;
  padding: 1em;
  overflow: auto;
}

.markdown-renderer-segments .markdown-body code[class*="language-"] {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.markdown-renderer-segments .markdown-body p.katex-block {
  /* Reduce default paragraph margin for display math */
  margin: 0.35em 0;
}

.markdown-renderer-segments .markdown-body .katex-display {
  /* Tighten KaTeX block spacing inside lists */
  margin: 0.25em 0;
}

.markdown-renderer-segments .markdown-body li > p {
  /* Keep list items compact while preserving readability */
  margin: 0.2em 0 0.35em;
}

.markdown-renderer-segments .md-panel {
  background: #f5f7fb;
  border: 1px solid #e4e7ee;
  border-radius: 10px;
  padding: 12px 14px;
  margin: 0.65em 0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.markdown-renderer-segments .md-panel p:last-child {
  margin-bottom: 0;
}

.mermaid-segment-container {
  margin: 1em 0;
}
</style>
