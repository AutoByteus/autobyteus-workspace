<template>
  <div
    ref="markdownRendererContainer"
    class="markdown-renderer-segments"
    @click="handleLinkClick"
    @keydown="handleKeydown"
  >
    <template v-for="segment in segments" :key="segment.key">
      <div v-if="segment.type === 'html'" v-html="segment.content" class="markdown-body prose dark:prose-invert prose-gray max-w-none"></div>
      <MermaidDiagram
        v-else-if="segment.type === 'mermaid'"
        :content="segment.content"
        class="mermaid-segment-container"
        @external-link="openExternalLink"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { useMarkdownSegments } from '~/composables/useMarkdownSegments';
import { useAuthorizedObjectUrlMap } from '~/composables/useAuthorizedObjectUrl';
import { useLocalization } from '~/composables/useLocalization';
import type { MarkdownImageResourceResolver } from '~/utils/markdownImageResource';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import MermaidDiagram from './MermaidDiagram.vue'; 
import { resolveExternalHttpUrl } from './externalHttpLink';
import 'prismjs/themes/prism.css'; 
// Import KaTeX CSS for math rendering
import 'katex/dist/katex.min.css';

const props = defineProps<{
  content: string;
  imageResourceResolver?: MarkdownImageResourceResolver;
  enableEventMonitorFileActions?: boolean;
}>();

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();

const { t } = useLocalization();
const contentRef = computed(() => props.content);
const imageResourceResolverRef = computed(() => props.imageResourceResolver);
const { parsedSegments, managedImageSources, fileActions } = useMarkdownSegments(
  contentRef,
  imageResourceResolverRef,
  {
    enableEventMonitorFileActions: props.enableEventMonitorFileActions === true,
    fileActionLabel: (action) => action.displayLabel,
  },
);
const { resolvedUrlsBySource, errorsBySource } = useAuthorizedObjectUrlMap(
  () => managedImageSources.value,
);

const segments = computed(() => parsedSegments.value);

const markdownRendererContainer = ref<HTMLElement | null>(null);

const applyManagedImageBindings = () => {
  const container = markdownRendererContainer.value;
  if (!container) return;

  const managedImages = container.querySelectorAll<HTMLImageElement>(
    'img[data-markdown-image-source]',
  );
  for (const image of managedImages) {
    const source = image.dataset.markdownImageSource;
    image.removeAttribute('src');
    image.removeAttribute('data-markdown-image-error');
    if (!source) continue;

    const resolvedUrl = resolvedUrlsBySource.value[source];
    if (resolvedUrl) {
      image.src = `${resolvedUrl}${image.dataset.markdownImageFragment ?? ''}`;
    } else if (errorsBySource.value[source]) {
      image.dataset.markdownImageError = 'load-failed';
    }
  }
};

const applyPostRenderEffects = async () => {
  await nextTick();
  applyManagedImageBindings();
  applyFileActionAccessibility();
};

const resolveFileAction = (target: Element): AbsoluteFilePathAction | null => {
  const actionId = target.closest<HTMLElement>('[data-event-monitor-file-action-id]')
    ?.dataset.eventMonitorFileActionId;
  return actionId ? fileActions.value[actionId] || null : null;
};

const applyFileActionAccessibility = () => {
  const container = markdownRendererContainer.value;
  if (!container || !props.enableEventMonitorFileActions) return;
  container.querySelectorAll<HTMLElement>('[data-event-monitor-file-action-control="true"]').forEach((control) => {
    const action = resolveFileAction(control);
    if (!action) return;
    const label = t('workspace.components.conversation.segments.renderer.MarkdownRenderer.open_file', {
      file: action.displayLabel,
    });
    control.setAttribute('aria-label', label);
    if (control.tagName.toLowerCase() === 'button') {
      control.textContent = label;
    }
    control.setAttribute('title', action.normalizedCandidate);
  });
};

const handleFileAction = (event: Event, target: Element) => {
  if (!props.enableEventMonitorFileActions) return false;
  const action = resolveFileAction(target);
  if (!action) return false;
  event.preventDefault();
  event.stopPropagation();
  emit('file-path-action', action);
  return true;
};

const handleLinkClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (handleFileAction(event, target)) return;
  const anchor = target.closest('a');
  if (!anchor) return;

  const externalUrl = resolveExternalHttpUrl(anchor, window.location.href);
  if (!externalUrl) return;
  event.preventDefault();
  openExternalLink(externalUrl);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  handleFileAction(event, target);
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
watch(
  [resolvedUrlsBySource, errorsBySource],
  applyManagedImageBindings,
  { flush: 'sync' },
);

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
  font-size: 0.875rem;
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

.markdown-renderer-segments .event-monitor-file-action-link {
  color: rgb(55 65 81);
  cursor: pointer;
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.15em;
}

.markdown-renderer-segments .event-monitor-file-action-link:hover {
  color: rgb(17 24 39);
}

.markdown-renderer-segments .event-monitor-file-action-link:focus-visible {
  outline: 2px solid rgb(99 102 241);
  outline-offset: 2px;
}

.markdown-renderer-segments .event-monitor-file-action-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.25rem;
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
