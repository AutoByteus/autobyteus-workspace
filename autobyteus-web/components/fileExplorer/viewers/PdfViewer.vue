<template>
  <div
    ref="scroller"
    class="pdf-viewer-container flex flex-col h-full bg-gray-100 p-4 overflow-auto"
    :class="{ 'pdf-viewer-touch': touchZoom }"
    data-testid="pdf-viewer-scroller"
    @scroll.passive="onScroll"
  >
    <div v-if="loading" class="flex justify-center items-center py-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">{{ $t('tools.components.fileExplorer.viewers.PdfViewer.error_loading_pdf') }}</strong>
      <span class="block sm:inline">{{ error }}</span>
    </div>
    <!-- The phone viewer (autobyteus-472): pages drawn at the zoomed width; a pinch scales them live until then. -->
    <div
      v-if="resolvedUrl && touchZoom"
      ref="pages"
      class="pdf-pages mx-auto shrink-0"
      :style="{ width: `${renderWidth}px`, transform: pinchZoom.transform.value, transformOrigin: pinchZoom.transformOrigin.value }"
      data-testid="pdf-viewer-pages"
    >
      <VuePdfEmbed
        v-if="baseWidth > 0"
        :source="resolvedUrl"
        :width="renderWidth"
        class="pdf-content shadow-lg"
        @loaded="onTouchLoaded"
        @loading-failed="onError"
      />
    </div>
    <VuePdfEmbed
      v-else-if="resolvedUrl"
      :source="resolvedUrl"
      class="pdf-content shadow-lg w-full max-w-4xl mx-auto"
      @loaded="onLoaded"
      @loading-failed="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import VuePdfEmbed from 'vue-pdf-embed'
import { useAuthorizedObjectUrl } from '~/composables/useAuthorizedObjectUrl'
import { usePdfPinchZoom } from '~/composables/usePdfPinchZoom'
import type { ViewerZoomMemory } from '~/composables/mobile/useViewerZoomMemory'

// Essential styles for vue-pdf-embed
// index.css is no longer separate in v2, styles are injected or not needed for base
// Essential styles for annotation layer (if needed, but simple viewer might not strictly require it unless annotations are enabled)
import 'vue-pdf-embed/dist/styles/annotationLayer.css'
// Essential styles for text layer (for text selection)
import 'vue-pdf-embed/dist/styles/textLayer.css'


interface Props {
  url: string
  /** The open file's reload count (autobyteus-450): a change loads the same URL again. */
  contentRevision?: number
  /** The phone viewer (autobyteus-472): pinch, pan and double-tap zoom, 1× (page width) to 3×. */
  touchZoom?: boolean
  /** The phone viewer's memory of the zoom and position, kept across a reload of the same file. */
  zoomMemory?: ViewerZoomMemory | null
}

const props = defineProps<Props>()
const { resolvedUrl, error: resourceError } = useAuthorizedObjectUrl(() => props.url, { revision: () => props.contentRevision ?? 0 })

const loading = ref(true)
const error = ref<string | null>(null)

watch(resourceError, (value) => {
  if (value) {
    loading.value = false
    error.value = value
  }
})

watch([() => props.url, () => props.contentRevision], () => {
  loading.value = true
  error.value = null
})

const onLoaded = () => {
  loading.value = false
}

// Touch zoom (autobyteus-472 DS-001, REQ-006).
const scroller = ref<HTMLElement | null>(null)
const pages = ref<HTMLElement | null>(null)
/** The page width at 1×: the scroller's inner width. */
const baseWidth = ref(0)
const zoom = ref(props.zoomMemory?.pdf?.zoom ?? 1)
const renderWidth = computed(() => Math.floor(baseWidth.value * zoom.value))
/**
 * The remembered position has been put back for the shown document (or there was none): from then on scrolling is
 * remembered. Each new source (the first load, and each reload in place: a live refresh redraws the same viewer,
 * autobyteus-452) is a new generation: remembering pauses while the pages are drawn again (the scroller collapses
 * meanwhile), and only the newest generation's `loaded` puts the place back.
 */
let placed = false
let generation = 0
let unmounted = false
let scrollTimer: ReturnType<typeof setTimeout> | null = null
/** How long a layout may take before the viewer gives up putting a place back (it never scrolls against a partial one). */
const LAYOUT_WAIT_MS = 10_000

const measureBase = () => {
  const box = scroller.value
  if (!box) return
  const style = getComputedStyle(box)
  baseWidth.value = Math.max(0, box.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0'))
}

/**
 * Whether vue-pdf-embed has laid out every page at `width`: it sizes each page's canvas (CSS width and height) as that
 * page resolves, one after another, so the scrolled height is whole only when the last page is sized (CRR-007 CR-003).
 */
const everyPageAt = (width: number): boolean => {
  const canvases = [...(pages.value?.querySelectorAll<HTMLElement>('.vue-pdf-embed__page canvas') ?? [])]
  return canvases.length > 0 && canvases.every((canvas) => canvas.style.width === `${width}px`)
}

/**
 * Resolves `true` once every page is laid out at the current zoom's width (a zoom that changes meanwhile is the one
 * waited for); `false` if the viewer goes or the layout takes too long.
 */
const pagesLaidOut = (): Promise<boolean> => new Promise((resolve) => {
  const until = Date.now() + LAYOUT_WAIT_MS
  const check = () => {
    if (unmounted || Date.now() > until) resolve(false)
    else if (everyPageAt(renderWidth.value)) resolve(true)
    else requestAnimationFrame(check)
  }
  requestAnimationFrame(check)
})

const remember = () => {
  const box = scroller.value
  if (!props.zoomMemory || !box || !placed) return
  props.zoomMemory.rememberPdf({
    zoom: zoom.value,
    scrollLeftRatio: box.scrollWidth > 0 ? box.scrollLeft / box.scrollWidth : 0,
    scrollTopRatio: box.scrollHeight > 0 ? box.scrollTop / box.scrollHeight : 0,
  })
}

const pinchZoom = usePdfPinchZoom(scroller, pages, {
  zoom: () => zoom.value,
  setZoom: async (next) => {
    zoom.value = next
    return pagesLaidOut()
  },
  onCommit: remember,
})

watch(resolvedUrl, () => {
  if (!props.touchZoom) return
  generation += 1
  placed = false
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = null
})

/** The document is loaded: once its pages are laid out, the remembered position (a reload of this file) is put back. */
const onTouchLoaded = async () => {
  loading.value = false
  const loaded = generation
  const laidOut = await pagesLaidOut()
  // A newer source is being drawn: its own `loaded` puts the place back.
  if (unmounted || loaded !== generation) return
  const box = scroller.value
  const place = props.zoomMemory?.pdf
  // Only against the whole layout: a partial one would put the place too high.
  if (box && place && laidOut) {
    box.scrollLeft = place.scrollLeftRatio * box.scrollWidth
    box.scrollTop = place.scrollTopRatio * box.scrollHeight
  }
  placed = true
}

/** Panning and paging are the scroller's own scrolling: its position is remembered when it settles. */
const onScroll = () => {
  if (!props.touchZoom || !placed) return
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(remember, 200)
}

onMounted(() => {
  if (!props.touchZoom) return
  measureBase()
  window.addEventListener('resize', measureBase)
})
onBeforeUnmount(() => {
  unmounted = true
  if (scrollTimer) clearTimeout(scrollTimer)
  window.removeEventListener('resize', measureBase)
})

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

/* One finger scrolls and pans; the page itself never zooms (two fingers are the viewer's pinch). */
.pdf-viewer-touch {
  touch-action: pan-x pan-y;
}
</style>
