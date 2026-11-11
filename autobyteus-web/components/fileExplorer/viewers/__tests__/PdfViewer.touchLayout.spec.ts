// autobyteus-472 CRR-007 CR-003: vue-pdf-embed sizes its pages one after another (each page's canvas gets its CSS width
// and height as that page resolves), so the scrolled height grows over several frames. The phone viewer's PDF puts a
// remembered place back, and scrolls a zoom's anchor, only against the whole layout: never when only the first pages
// are sized (which put the place too high in the Android app).
// Production: PdfViewer (touch mode) and usePdfPinchZoom. Doubled: vue-pdf-embed (four pages sized one per frame, as
// above) and the layout numbers jsdom does not compute (taken from the sized canvases).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick, onMounted, ref, watch } from 'vue';
import PdfViewer from '../PdfViewer.vue';
import type { ViewerZoomMemory } from '~/composables/mobile/useViewerZoomMemory';

const PAGES = 4;
const PAGE_RATIO = 1.3;
const layout = vi.hoisted(() => ({ sized: 0 }));

vi.mock('vue-pdf-embed', () => ({
  default: defineComponent({
    props: ['source', 'width'],
    emits: ['loaded', 'loading-failed'],
    setup(props, { emit }) {
      const sized = ref(0);
      let drawn: number | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      // As vue-pdf-embed: each page is sized when it resolves, one after another.
      const draw = () => {
        if (timer) clearTimeout(timer);
        sized.value = 0;
        layout.sized = 0;
        const next = () => {
          sized.value += 1;
          layout.sized = sized.value;
          if (sized.value < PAGES) timer = setTimeout(next, 20);
          else drawn = props.width;
        };
        timer = setTimeout(next, 20);
      };
      onMounted(() => { draw(); void nextTick(() => emit('loaded', {})); });
      watch(() => props.width, draw);
      watch(() => props.source, () => { draw(); void nextTick(() => emit('loaded', {})); });
      return () => h('div', { class: 'vue-pdf-embed' }, Array.from({ length: PAGES }, (_, i) => {
        const width = i < sized.value ? props.width : drawn;
        return h('div', { class: 'vue-pdf-embed__page' }, [
          h('canvas', { style: width ? { width: `${width}px`, height: `${Math.floor(width * PAGE_RATIO)}px` } : {} }),
        ]);
      }));
    },
  }),
}));
vi.mock('vue-pdf-embed/dist/styles/annotationLayer.css', () => ({}));
vi.mock('vue-pdf-embed/dist/styles/textLayer.css', () => ({}));

enableAutoUnmount(afterEach);

const WIDTH = 300;
const scrolls = new WeakMap<Element, { left: number; top: number; sizedAtTop: number | null }>();
const scrollOf = (element: Element) => scrolls.get(element) ?? scrolls.set(element, { left: 0, top: 0, sizedAtTop: null }).get(element)!;
const canvasesOf = (element: Element) => [...element.querySelectorAll<HTMLElement>('.vue-pdf-embed__page canvas')];

beforeEach(() => {
  setActivePinia(createPinia());
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  // The scrolled size is what the sized pages make: the height grows page by page.
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return Math.max(WIDTH, ...canvasesOf(this).map(c => parseFloat(c.style.width) || 0));
  });
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return canvasesOf(this).reduce((sum, c) => sum + (parseFloat(c.style.height) || 0), 0);
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, get() { return scrollOf(this).left; }, set(v: number) { scrollOf(this).left = v; } });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, get() { return scrollOf(this).top; }, set(v: number) {
    scrollOf(this).top = v;
    scrollOf(this).sizedAtTop = layout.sized;
  } });
});
afterEach(() => { vi.restoreAllMocks(); });

const memoryWith = (pdf: ViewerZoomMemory['pdf']): ViewerZoomMemory => ({
  pdf, image: null, rememberPdf: vi.fn(), rememberImage: vi.fn(),
});

const mountPdf = (zoomMemory: ViewerZoomMemory) => mount(PdfViewer, {
  props: { url: 'blob:resume', touchZoom: true, zoomMemory },
  global: { mocks: { $t: (key: string) => key } },
});

const touch = (target: Element, type: string, points: Array<[number, number]>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: points.map(([clientX, clientY], identifier) => ({ identifier, clientX, clientY })) });
  target.dispatchEvent(event);
};

describe('PdfViewer touch mode waits for the whole layout (autobyteus-472 CR-003)', () => {
  it('puts a remembered place back against the full height, not after the first page is sized', async () => {
    const wrapper = mountPdf(memoryWith({ zoom: 2, scrollLeftRatio: 0.25, scrollTopRatio: 0.5 }));
    const box = wrapper.get('[data-testid="pdf-viewer-scroller"]').element;
    // Four pages at 600 px wide, each 780 px high: 3120 px in all.
    await vi.waitFor(() => expect(scrollOf(box).sizedAtTop).not.toBeNull());
    expect(scrollOf(box).sizedAtTop).toBe(PAGES);
    expect(scrollOf(box)).toMatchObject({ left: 150, top: 1560 });
  });

  it('scrolls a double tap\'s anchor on a lower page only once every page is drawn at the new zoom', async () => {
    const memory = memoryWith(null);
    const wrapper = mountPdf(memory);
    const box = wrapper.get('[data-testid="pdf-viewer-scroller"]').element;
    await vi.waitFor(() => expect(canvasesOf(box).map(c => c.style.width)).toEqual(Array(PAGES).fill(`${WIDTH}px`)));
    // The first load has put its (empty) place back: from here on a zoom is remembered.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await flushPromises();
    // A tap on the third page (y 1000 at 1×: pages are 390 px high there), twice.
    for (let i = 0; i < 2; i += 1) { touch(box, 'touchstart', [[100, 1000]]); touch(box, 'touchend', []); }
    await vi.waitFor(() => expect(memory.rememberPdf).toHaveBeenCalled());
    expect(scrollOf(box).sizedAtTop).toBe(PAGES);
    // The tapped point (100, 1000) is drawn at (200, 2000): scrolled so it stays under the finger.
    expect(scrollOf(box)).toMatchObject({ left: 100, top: 1000 });
    expect(canvasesOf(box).every(c => c.style.width === `${WIDTH * 2}px`)).toBe(true);
  });

  it('a double tap while the pages are first being laid out still zooms, and the zoom is remembered', async () => {
    const memory = memoryWith(null);
    const wrapper = mountPdf(memory);
    const box = wrapper.get('[data-testid="pdf-viewer-scroller"]').element;
    // The pages exist but are not all sized yet.
    await vi.waitFor(() => expect(canvasesOf(box)).toHaveLength(PAGES));
    expect(canvasesOf(box).some(c => c.style.width !== `${WIDTH}px`)).toBe(true);
    for (let i = 0; i < 2; i += 1) { touch(box, 'touchstart', [[100, 200]]); touch(box, 'touchend', []); }
    await vi.waitFor(() => expect(memory.rememberPdf).toHaveBeenCalledWith(expect.objectContaining({ zoom: 2 })));
    expect(canvasesOf(box).every(c => c.style.width === `${WIDTH * 2}px`)).toBe(true);
  });
});
