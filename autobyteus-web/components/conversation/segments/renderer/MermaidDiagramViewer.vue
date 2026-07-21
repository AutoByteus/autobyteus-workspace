<template>
  <Teleport to="body">
    <div
      class="mermaid-viewer-backdrop fixed inset-0 z-[130] flex bg-slate-950/80 p-2 sm:p-4"
      @click.self="requestClose"
    >
      <section
        ref="dialogRef"
        class="mermaid-viewer-dialog flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown="handleKeydown"
      >
        <header class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 sm:px-4">
          <h2 :id="titleId" class="mr-auto min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100 sm:text-base">
            {{ labels.viewer }}
          </h2>

          <div class="flex flex-wrap items-center gap-2" role="toolbar" :aria-label="labels.viewer">
            <button
              type="button"
              class="mermaid-viewer-action"
              :disabled="isAtMinimumZoom"
              :aria-label="labels.zoomOut"
              :title="labels.zoomOut"
              @click="zoomOut"
            >
              <Icon icon="heroicons:minus-20-solid" class="mermaid-viewer-action-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="mermaid-viewer-action"
              :aria-label="labels.fit"
              :title="labels.fit"
              @click="fitDiagram"
            >
              <Icon icon="heroicons:arrows-pointing-in-20-solid" class="mermaid-viewer-action-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="mermaid-viewer-action"
              :disabled="isAtMaximumZoom"
              :aria-label="labels.zoomIn"
              :title="labels.zoomIn"
              @click="zoomIn"
            >
              <Icon icon="heroicons:plus-20-solid" class="mermaid-viewer-action-icon" aria-hidden="true" />
            </button>
            <button
              ref="closeButtonRef"
              type="button"
              class="mermaid-viewer-action"
              :aria-label="labels.close"
              :title="labels.close"
              @click="requestClose"
            >
              <Icon icon="heroicons:x-mark-20-solid" class="mermaid-viewer-action-icon" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          ref="canvasRef"
          class="mermaid-viewer-canvas relative min-h-0 flex-1 select-none overflow-auto bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:bg-slate-950"
          :class="{
            'cursor-grab': isPannable && !isDragging,
            'cursor-grabbing': isDragging,
          }"
          role="region"
          tabindex="0"
          :aria-label="labels.viewer"
          @wheel.prevent="handleWheel"
          @click="handleCanvasClick"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="finishPointerDrag"
          @pointercancel="finishPointerDrag"
          @lostpointercapture="finishPointerDrag"
        >
          <div class="mermaid-diagram-plane relative" :style="planeStyle">
            <div
              ref="stageRef"
              class="mermaid-diagram-stage absolute"
              :style="stageStyle"
              v-html="svgContent"
            ></div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { resolveExternalHttpUrl } from './externalHttpLink';
import {
  DIAGRAM_WHEEL_ZOOM_STEP,
  DIAGRAM_ZOOM_STEP,
  MAX_DIAGRAM_ZOOM,
  MIN_DIAGRAM_ZOOM,
  calculateAnchoredScroll,
  calculateDiagramPlane,
  calculateFittedDiagramSize,
  clampDiagramZoom,
  type DiagramPoint,
  type DiagramSize,
} from './mermaidDiagramViewport';

defineProps<{
  svgContent: string;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'external-link', url: string): void;
}>();

const { t } = useLocalization();
const titleId = `mermaid-viewer-title-${Math.floor(Math.random() * 100000)}`;
const labels = computed(() => ({
  viewer: t('workspace.components.conversation.segments.renderer.MermaidDiagram.viewer'),
  zoomOut: t('workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_out'),
  fit: t('workspace.components.conversation.segments.renderer.MermaidDiagram.fit_diagram'),
  zoomIn: t('workspace.components.conversation.segments.renderer.MermaidDiagram.zoom_in'),
  close: t('workspace.components.conversation.segments.renderer.MermaidDiagram.close_viewer'),
}));

const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const diagramSize = ref<DiagramSize>({ width: 1, height: 1 });
const canvasSize = ref<DiagramSize>({ width: 1, height: 1 });
const fittedSize = ref<DiagramSize>({ width: 1, height: 1 });
const zoomFactor = ref(MIN_DIAGRAM_ZOOM);

const diagramPlane = computed(() => calculateDiagramPlane(
  canvasSize.value,
  fittedSize.value,
  zoomFactor.value,
));
const isAtMinimumZoom = computed(() => zoomFactor.value <= MIN_DIAGRAM_ZOOM);
const isAtMaximumZoom = computed(() => zoomFactor.value >= MAX_DIAGRAM_ZOOM);
const isPannable = computed(() =>
  diagramPlane.value.maxScroll.x > 0 || diagramPlane.value.maxScroll.y > 0,
);
const planeStyle = computed(() => ({
  width: `${diagramPlane.value.size.width}px`,
  height: `${diagramPlane.value.size.height}px`,
}));
const stageStyle = computed(() => ({
  left: `${diagramPlane.value.stageOffset.x}px`,
  top: `${diagramPlane.value.stageOffset.y}px`,
  width: `${diagramPlane.value.stageSize.width}px`,
  height: `${diagramPlane.value.stageSize.height}px`,
}));

const positiveSize = (width: number, height: number): DiagramSize | null =>
  Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? { width, height }
    : null;

const readSvgSize = (): DiagramSize => {
  const svg = stageRef.value?.querySelector<SVGSVGElement>('svg');
  if (!svg) return { width: 1, height: 1 };

  const viewBoxValues = svg.getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBoxValues?.length === 4) {
    const viewBoxSize = positiveSize(viewBoxValues[2], viewBoxValues[3]);
    if (viewBoxSize) return viewBoxSize;
  }

  try {
    const bounds = svg.getBBox?.();
    const measuredBounds = bounds && positiveSize(bounds.width, bounds.height);
    if (measuredBounds) return measuredBounds;
  } catch {
    // Some SVG roots do not expose getBBox until they are laid out.
  }

  const widthAttribute = svg.getAttribute('width');
  const heightAttribute = svg.getAttribute('height');
  if (widthAttribute && heightAttribute && !widthAttribute.includes('%') && !heightAttribute.includes('%')) {
    const attributeSize = positiveSize(Number.parseFloat(widthAttribute), Number.parseFloat(heightAttribute));
    if (attributeSize) return attributeSize;
  }

  const rect = svg.getBoundingClientRect();
  const renderedBounds = positiveSize(rect.width, rect.height);
  if (renderedBounds) return renderedBounds;

  return { width: 1, height: 1 };
};

const readCanvasSize = (): DiagramSize => {
  const canvas = canvasRef.value;
  if (!canvas) return { width: 1, height: 1 };
  const rect = canvas.getBoundingClientRect();
  return positiveSize(canvas.clientWidth || rect.width, canvas.clientHeight || rect.height)
    ?? { width: 1, height: 1 };
};

const fitDiagram = async () => {
  zoomFactor.value = MIN_DIAGRAM_ZOOM;
  await nextTick();
  if (canvasRef.value) {
    canvasRef.value.scrollLeft = 0;
    canvasRef.value.scrollTop = 0;
  }
};

const measureAndFit = async () => {
  diagramSize.value = readSvgSize();
  canvasSize.value = readCanvasSize();
  fittedSize.value = calculateFittedDiagramSize(diagramSize.value, canvasSize.value);
  await fitDiagram();
};

const applyZoom = async (requestedZoom: number, anchor: DiagramPoint) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const nextZoom = clampDiagramZoom(requestedZoom);
  if (nextZoom === zoomFactor.value) return;

  const before = diagramPlane.value;
  const currentScroll = { x: canvas.scrollLeft, y: canvas.scrollTop };
  zoomFactor.value = nextZoom;
  const after = diagramPlane.value;
  const targetScroll = calculateAnchoredScroll({ before, after, currentScroll, anchor });

  await nextTick();
  canvas.scrollLeft = targetScroll.x;
  canvas.scrollTop = targetScroll.y;
};

const canvasCenter = (): DiagramPoint => ({
  x: canvasSize.value.width / 2,
  y: canvasSize.value.height / 2,
});
const zoomIn = () => applyZoom(zoomFactor.value + DIAGRAM_ZOOM_STEP, canvasCenter());
const zoomOut = () => applyZoom(zoomFactor.value - DIAGRAM_ZOOM_STEP, canvasCenter());

const handleWheel = (event: WheelEvent) => {
  const canvas = canvasRef.value;
  if (!canvas || event.deltaY === 0) return;
  const rect = canvas.getBoundingClientRect();
  const anchor = {
    x: Math.min(Math.max(event.clientX - rect.left, 0), canvasSize.value.width),
    y: Math.min(Math.max(event.clientY - rect.top, 0), canvasSize.value.height),
  };
  const direction = event.deltaY < 0 ? 1 : -1;
  applyZoom(zoomFactor.value + direction * DIAGRAM_WHEEL_ZOOM_STEP, anchor);
};

const interactiveSelector = [
  'a', '[role="link"]', 'button', 'input', 'select', 'textarea', 'summary',
  '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])', '.clickable', '[onclick]',
].join(',');
const isInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  const interactiveTarget = target.closest(interactiveSelector);
  return Boolean(interactiveTarget && interactiveTarget !== canvasRef.value);
};

type PointerDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};
const pointerDrag = ref<PointerDrag | null>(null);
const isDragging = computed(() => pointerDrag.value !== null);

const handlePointerDown = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas || !event.isPrimary || event.button !== 0 || !isPannable.value) return;
  if (isInteractiveTarget(event.target)) return;

  pointerDrag.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: canvas.scrollLeft,
    scrollTop: canvas.scrollTop,
  };
  canvas.setPointerCapture?.(event.pointerId);
};

const handlePointerMove = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  const drag = pointerDrag.value;
  if (!canvas || !drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  canvas.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  canvas.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
};

const finishPointerDrag = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  const drag = pointerDrag.value;
  if (!drag || drag.pointerId !== event.pointerId) return;
  pointerDrag.value = null;
  if (canvas?.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
};

const handleCanvasClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a');
  if (!anchor) return;

  const externalUrl = resolveExternalHttpUrl(anchor, window.location.href);
  if (!externalUrl) return;
  event.preventDefault();
  event.stopPropagation();
  emit('external-link', externalUrl);
};

const focusableSelector = [
  'button:not([disabled])', 'a', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');
const focusableElements = () => Array.from(
  dialogRef.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
).filter((element) => element.getAttribute('aria-hidden') !== 'true');

const trapTabFocus = (event: KeyboardEvent) => {
  const focusable = focusableElements();
  if (!focusable.length) return;
  const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
  const nextIndex = event.shiftKey
    ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
    : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
  if (currentIndex === -1 || nextIndex !== currentIndex + (event.shiftKey ? -1 : 1)) {
    event.preventDefault();
    focusable[nextIndex]?.focus();
  }
};

const requestClose = () => emit('close');
const handleKeydown = (event: KeyboardEvent) => {
  if (event.defaultPrevented) return;
  if (event.key === 'Tab') {
    trapTabFocus(event);
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    requestClose();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    zoomIn();
  } else if (event.key === '-') {
    event.preventDefault();
    zoomOut();
  } else if (event.key === '0') {
    event.preventDefault();
    fitDiagram();
  }
};

const containFocus = (event: FocusEvent) => {
  if (dialogRef.value?.contains(event.target as Node)) return;
  closeButtonRef.value?.focus();
};

let priorBodyOverflow = '';
let resizeObserver: ResizeObserver | null = null;
onMounted(async () => {
  priorBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.addEventListener('focusin', containFocus);
  await nextTick();
  await measureAndFit();
  closeButtonRef.value?.focus();

  if (typeof ResizeObserver !== 'undefined' && canvasRef.value) {
    resizeObserver = new ResizeObserver(() => measureAndFit());
    resizeObserver.observe(canvasRef.value, { box: 'border-box' });
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  document.removeEventListener('focusin', containFocus);
  document.body.style.overflow = priorBodyOverflow;
  pointerDrag.value = null;
});
</script>

<style scoped>
.mermaid-viewer-action {
  align-items: center;
  background: rgb(255 255 255);
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  color: rgb(51 65 85);
  display: inline-flex;
  flex: 0 0 36px;
  height: 36px;
  justify-content: center;
  padding: 0;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
  width: 36px;
}

.mermaid-viewer-action-icon {
  height: 18px;
  width: 18px;
}

.mermaid-viewer-action:hover:not(:disabled) {
  background: rgb(238 242 255);
  border-color: rgb(129 140 248);
  color: rgb(67 56 202);
}

.mermaid-viewer-action:focus-visible {
  outline: 2px solid rgb(79 70 229);
  outline-offset: 2px;
}

.mermaid-viewer-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.mermaid-viewer-canvas {
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  touch-action: none;
}

.mermaid-diagram-stage :deep(svg) {
  display: block;
  height: 100% !important;
  max-height: none !important;
  max-width: none !important;
  width: 100% !important;
}

/* Keep every action touch-sized when any coarse pointer is available. */
@media (hover: none), (pointer: coarse), (any-pointer: coarse), (max-width: 480px) {
  .mermaid-viewer-action {
    flex-basis: 44px;
    height: 44px;
    width: 44px;
  }
}

@media (prefers-color-scheme: dark) {
  .mermaid-viewer-action {
    background: rgb(30 41 59);
    border-color: rgb(71 85 105);
    color: rgb(226 232 240);
  }

  .mermaid-viewer-action:hover:not(:disabled) {
    background: rgb(49 46 129);
    border-color: rgb(129 140 248);
    color: rgb(238 242 255);
  }
}
</style>
