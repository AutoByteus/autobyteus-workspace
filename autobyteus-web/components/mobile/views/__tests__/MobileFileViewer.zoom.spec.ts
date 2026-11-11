// autobyteus-472: the phone viewer's PDF and image zoom by touch, keep their zoom and position when the same file is
// reloaded (AC-005: the open-file state goes through `isLoading` and comes back with a new URL; the viewers are
// replaced meanwhile), start at 1× for another file, and offer Download for a loaded PDF or image (REQ-004).
// Production: MobileFileViewer, FileViewer, PdfViewer, ImageViewer, the zoom composables and the zoom memory.
// Doubled: vue-pdf-embed (it sizes each page canvas at its `width`, as the real one does), the layout numbers jsdom
// does not compute, and the Download composable's download (its own spec covers it).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick, onMounted, watch } from 'vue';
import MobileFileViewer from '../MobileFileViewer.vue';
import type { OpenFileState } from '~/stores/fileExplorerState';

vi.mock('vue-pdf-embed', () => ({
  default: defineComponent({
    props: ['source', 'width'],
    emits: ['loaded', 'loading-failed'],
    setup(props, { emit }) {
      // As vue-pdf-embed: `loaded` for each document it loads, on mount and when its source changes.
      onMounted(() => { void nextTick(() => emit('loaded', {})); });
      watch(() => props.source, () => { void nextTick(() => emit('loaded', {})); });
      return () => h('div', { class: 'vue-pdf-embed', 'data-width': props.width }, [
        h('div', { class: 'vue-pdf-embed__page' }, [h('canvas', { style: { width: `${props.width}px` } })]),
      ]);
    },
  }),
}));
vi.mock('vue-pdf-embed/dist/styles/annotationLayer.css', () => ({}));
vi.mock('vue-pdf-embed/dist/styles/textLayer.css', () => ({}));
const downloads = vi.hoisted(() => ({ download: vi.fn(async () => undefined) }));
vi.mock('~/composables/mobile/useMobileFileDownload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/composables/mobile/useMobileFileDownload')>()),
  useMobileFileDownload: () => downloads,
}));

enableAutoUnmount(afterEach);

const WIDTH = 360;
const HEIGHT = 640;
const scrolls = new WeakMap<Element, { left: number; top: number }>();
const scrollOf = (element: Element) => scrolls.get(element) ?? scrolls.set(element, { left: 0, top: 0 }).get(element)!;

beforeEach(() => {
  setActivePinia(createPinia());
  downloads.download.mockClear();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(HEIGHT);
  // The scrolled size follows the drawn page width: a page twice as wide scrolls twice as far.
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
    const embed = this.querySelector('.vue-pdf-embed');
    return Number(embed?.getAttribute('data-width') ?? WIDTH);
  });
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    const embed = this.querySelector('.vue-pdf-embed');
    return Number(embed?.getAttribute('data-width') ?? WIDTH) * 10;
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', { configurable: true, get() { return scrollOf(this).left; }, set(v: number) { scrollOf(this).left = v; } });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, get() { return scrollOf(this).top; }, set(v: number) { scrollOf(this).top = v; } });
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(600);
});
afterEach(() => { vi.restoreAllMocks(); });

const fileState = (path: string, type: 'PDF' | 'Image', url: string | null, isLoading = false): OpenFileState => ({
  path, type, mode: 'preview', content: null, url, contentRevision: 0, relativeResourceContext: null, isLoading, error: null,
});

const mountViewer = (path: string, state: OpenFileState) => mount(MobileFileViewer, {
  props: { path, fileState: state },
  global: { mocks: { $t: (key: string) => key } },
});

const touch = (target: Element, type: string, points: Array<[number, number]>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: points.map(([clientX, clientY], identifier) => ({ identifier, clientX, clientY })) });
  target.dispatchEvent(event);
};
const doubleTapPdf = (target: Element, x: number, y: number) => {
  for (let i = 0; i < 2; i += 1) { touch(target, 'touchstart', [[x, y]]); touch(target, 'touchend', []); }
};
const pointer = (target: Element, type: string, x: number, y: number) =>
  target.dispatchEvent(new PointerEvent(type, { pointerId: 9, clientX: x, clientY: y, bubbles: true, cancelable: true }));
const doubleTapImage = (target: Element, x: number, y: number) => {
  for (let i = 0; i < 2; i += 1) { pointer(target, 'pointerdown', x, y); pointer(target, 'pointerup', x, y); }
};

const pdfWidth = (wrapper: ReturnType<typeof mountViewer>) => Number(wrapper.get('.vue-pdf-embed').attributes('data-width'));
const scroller = (wrapper: ReturnType<typeof mountViewer>) => wrapper.get('[data-testid="pdf-viewer-scroller"]').element;

describe('the phone viewer zooms PDFs and images by touch (autobyteus-472)', () => {
  it('AC-005 a zoomed PDF keeps its zoom and position across a reload of the same file; another file starts at 1×', async () => {
    const wrapper = mountViewer('/w/resume.pdf', fileState('/w/resume.pdf', 'PDF', 'blob:pdf-1'));
    await vi.waitFor(() => expect(pdfWidth(wrapper)).toBe(WIDTH));
    expect(wrapper.get('[data-testid="pdf-viewer-scroller"]').classes()).toContain('pdf-viewer-touch');

    doubleTapPdf(scroller(wrapper), 100, 150);
    await vi.waitFor(() => expect(pdfWidth(wrapper)).toBe(WIDTH * 2));
    // The tapped point stays under the finger: it is scrolled to where it is drawn at 2×.
    await vi.waitFor(() => expect(scrollOf(scroller(wrapper))).toEqual({ left: 100, top: 150 }));

    // A reload of the same path: "Opening…" (the viewers go), then a new URL.
    await wrapper.setProps({ fileState: fileState('/w/resume.pdf', 'PDF', null, true) });
    expect(wrapper.find('[data-testid="pdf-viewer-scroller"]').exists()).toBe(false);
    await wrapper.setProps({ fileState: fileState('/w/resume.pdf', 'PDF', 'blob:pdf-2') });
    await vi.waitFor(() => expect(pdfWidth(wrapper)).toBe(WIDTH * 2));
    await vi.waitFor(() => expect(scrollOf(scroller(wrapper))).toEqual({ left: 100, top: 150 }));

    // Another file starts at page width, at the top.
    await wrapper.setProps({ path: '/w/other.pdf', fileState: fileState('/w/other.pdf', 'PDF', 'blob:pdf-3') });
    await wrapper.setProps({ fileState: fileState('/w/other.pdf', 'PDF', null, true) });
    await wrapper.setProps({ fileState: fileState('/w/other.pdf', 'PDF', 'blob:pdf-3') });
    await vi.waitFor(() => expect(pdfWidth(wrapper)).toBe(WIDTH));
    expect(scrollOf(scroller(wrapper))).toEqual({ left: 0, top: 0 });
  });

  // CRR-005 CR-002: a live refresh reloads a media file in place (autobyteus-452: a new `contentRevision`, no "Opening…"),
  // so the same viewer draws the pages again; the scroller collapses meanwhile, as a browser's does.
  it('AC-005 a zoomed PDF keeps its zoom and position across a live refresh in place, also when one rewrite redraws twice', async () => {
    const state = (url: string, contentRevision: number) => ({ ...fileState('/w/resume.pdf', 'PDF', url), contentRevision });
    const wrapper = mountViewer('/w/resume.pdf', state('blob:pdf-1', 0));
    await vi.waitFor(() => expect(pdfWidth(wrapper)).toBe(WIDTH));
    doubleTapPdf(scroller(wrapper), 100, 150);
    await vi.waitFor(() => expect(pdfWidth(wrapper)).toBe(WIDTH * 2));
    await vi.waitFor(() => expect(scrollOf(scroller(wrapper))).toEqual({ left: 100, top: 150 }));
    const box = scroller(wrapper);

    /** A redraw in place: the new source, then the collapsed scroller's own scroll events, then the pages again. */
    const refresh = async (url: string, contentRevision: number) => {
      await wrapper.setProps({ fileState: state(url, contentRevision) });
      scrollOf(box).left = 0;
      scrollOf(box).top = 0;
      box.dispatchEvent(new Event('scroll'));
    };
    await refresh('blob:pdf-2', 1);
    // The same viewer: no "Opening…", no remount.
    expect(wrapper.find('[data-testid="mobile-file-preview-loading"]').exists()).toBe(false);
    expect(scroller(wrapper)).toBe(box);
    await vi.waitFor(() => expect(scrollOf(box)).toEqual({ left: 100, top: 150 }));
    expect(pdfWidth(wrapper)).toBe(WIDTH * 2);

    // One rewrite seen twice: two redraws back to back; the place still comes back, and the collapse is not remembered.
    await refresh('blob:pdf-3', 2);
    await refresh('blob:pdf-4', 3);
    await new Promise((resolve) => setTimeout(resolve, 250));
    await vi.waitFor(() => expect(scrollOf(box)).toEqual({ left: 100, top: 150 }));
    expect(pdfWidth(wrapper)).toBe(WIDTH * 2);
  });

  it('AC-005 a zoomed image keeps its zoom and position across a reload of the same file; another file starts at fit', async () => {
    const wrapper = mountViewer('/w/chart.png', fileState('/w/chart.png', 'Image', 'blob:png-1'));
    await flushPromises();
    await wrapper.get('[data-testid="image-viewer-touch"] img').trigger('load');
    const picture = () => (wrapper.get('[data-testid="image-viewer-picture"]').element as HTMLElement).style.transform;
    expect(picture()).toBe('translate(0px, 0px) scale(1)');

    vi.useFakeTimers();
    doubleTapImage(wrapper.get('[data-testid="image-viewer-touch"]').element, 180, 320);
    vi.useRealTimers();
    await nextTick();
    const zoomed = picture();
    // Fit → Fill: an 800×600 picture fitted into 360×640 fills it at 640 / 270.
    expect(zoomed).toMatch(/scale\(2\.37/);

    await wrapper.setProps({ fileState: fileState('/w/chart.png', 'Image', null, true) });
    expect(wrapper.find('[data-testid="image-viewer-touch"]').exists()).toBe(false);
    await wrapper.setProps({ fileState: fileState('/w/chart.png', 'Image', 'blob:png-2') });
    await flushPromises();
    await wrapper.get('[data-testid="image-viewer-touch"] img').trigger('load');
    expect(picture()).toBe(zoomed);

    await wrapper.setProps({ path: '/w/photo.jpg', fileState: fileState('/w/photo.jpg', 'Image', null, true) });
    await wrapper.setProps({ fileState: fileState('/w/photo.jpg', 'Image', 'blob:jpg-1') });
    await flushPromises();
    await wrapper.get('[data-testid="image-viewer-touch"] img').trigger('load');
    expect(picture()).toBe('translate(0px, 0px) scale(1)');
  });

  it('REQ-004 a loaded PDF or image has Download in the bar; while it opens, or for other files, there is none', async () => {
    const wrapper = mountViewer('/w/resume.pdf', fileState('/w/resume.pdf', 'PDF', null, true));
    expect(wrapper.find('[data-testid="mobile-file-download"]').exists()).toBe(false);
    await wrapper.setProps({ fileState: fileState('/w/resume.pdf', 'PDF', 'blob:pdf-1') });
    const button = wrapper.get('[data-testid="mobile-file-download"]');
    expect(button.attributes('aria-label')).toBe('Download');
    // The back arrow stays where it is.
    expect(wrapper.find('[data-testid="mobile-screen-back"]').exists()).toBe(true);
    await button.trigger('click');
    expect(downloads.download).toHaveBeenCalledWith({ path: '/w/resume.pdf', type: 'PDF', url: 'blob:pdf-1' });

    await wrapper.setProps({ path: '/w/chart.png', fileState: fileState('/w/chart.png', 'Image', 'blob:png-1') });
    expect(wrapper.find('[data-testid="mobile-file-download"]').exists()).toBe(true);

    const text = mount(MobileFileViewer, {
      props: { path: '/w/notes.md', fileState: { ...fileState('/w/notes.md', 'PDF', null), type: 'Text', content: '# notes' } },
      global: { mocks: { $t: (key: string) => key } },
    });
    expect(text.find('[data-testid="mobile-file-download"]').exists()).toBe(false);
  });
});
