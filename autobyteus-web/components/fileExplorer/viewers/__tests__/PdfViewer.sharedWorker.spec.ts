// autobyteus-647 D-5 as revised in SR-002 (REQ-005): every PDF loads through the one shared pdf.js worker. The viewer
// hands vue-pdf-embed `{ url, worker }`, which it passes to pdf.js's `getDocument`; a loading task given a worker does not
// own it, so closing one PDF cannot break the next (IMP-003). The source stays the same object while the URL stays, so a
// re-render does not load the PDF again, and a new URL gives a new source on the same worker.
// Production: PdfViewer. Doubled: vue-pdf-embed (it records each source it is given) and the shared worker.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, watch } from 'vue';
import PdfViewer from '../PdfViewer.vue';

const seen = vi.hoisted(() => ({ sources: [] as unknown[], worker: { shared: 'pdf.js worker' } }));

vi.mock('~/utils/pdf/sharedPdfWorker', () => ({ getSharedPdfWorker: () => seen.worker }));
vi.mock('vue-pdf-embed/dist/index.essential.mjs', () => ({
  default: defineComponent({
    props: ['source', 'width'],
    setup(props) {
      watch(() => props.source, (source) => { seen.sources.push(source); }, { immediate: true });
      return () => h('div', { class: 'vue-pdf-embed' });
    },
  }),
}));
vi.mock('vue-pdf-embed/dist/styles/annotationLayer.css', () => ({}));
vi.mock('vue-pdf-embed/dist/styles/textLayer.css', () => ({}));

enableAutoUnmount(afterEach);

describe('PdfViewer and the shared pdf.js worker', () => {
  afterEach(() => { seen.sources.length = 0; });

  it('loads each PDF as { url, worker } on the shared worker, one source per URL', async () => {
    setActivePinia(createPinia());
    const wrapper = mount(PdfViewer, { props: { url: 'blob:first' } });
    await flushPromises();
    expect(seen.sources).toEqual([{ url: 'blob:first', worker: seen.worker }]);
    expect((seen.sources[0] as { worker: unknown }).worker).toBe(seen.worker);

    // A re-render with the same URL keeps the same source: vue-pdf-embed does not load it again.
    await wrapper.setProps({ contentRevision: 0 });
    await flushPromises();
    expect(seen.sources).toHaveLength(1);

    await wrapper.setProps({ url: 'blob:second' });
    await flushPromises();
    expect(seen.sources).toHaveLength(2);
    expect(seen.sources[1]).toEqual({ url: 'blob:second', worker: seen.worker });
    expect((seen.sources[1] as { worker: unknown }).worker).toBe(seen.worker);
  });
});
