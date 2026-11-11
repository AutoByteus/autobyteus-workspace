import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// autobyteus-472: the phone viewer asks for touch zoom; FileViewer gives it, with the zoom memory, to the PDF and image
// viewers only. Without it (the desktop) those viewers get exactly what they got before.

const seen = vi.hoisted(() => ({ props: [] as Array<{ viewer: string; attrs: Record<string, unknown> }> }));
const { viewerStub } = vi.hoisted(() => ({
  viewerStub: (viewer: string) => async () => {
    const { defineComponent: define, h: render } = await import('vue');
    return {
      default: define({
        inheritAttrs: false,
        setup: (_props, { attrs }) => () => {
          seen.props.push({ viewer, attrs: { ...attrs } });
          return render('div', { 'data-viewer': viewer });
        },
      }),
    };
  },
}));
vi.mock('~/components/fileExplorer/viewers/PdfViewer.vue', viewerStub('pdf'));
vi.mock('~/components/fileExplorer/viewers/ImageViewer.vue', viewerStub('image'));
vi.mock('~/components/fileExplorer/viewers/AudioPlayer.vue', viewerStub('audio'));

import FileViewer from '../FileViewer.vue';

const memory = { pdf: null, image: null, rememberPdf: vi.fn(), rememberImage: vi.fn() };
const shown = (type: string, path: string, touch: boolean) => {
  seen.props.length = 0;
  mount(FileViewer, {
    props: { file: { path, type, content: null, url: 'blob:x', contentRevision: 0 } as never, mode: 'edit', ...(touch ? { touchZoom: true, zoomMemory: memory } : {}) },
    global: { mocks: { $t: (key: string) => key } },
  });
  return seen.props.at(-1)!.attrs;
};

describe('FileViewer touch zoom (autobyteus-472)', () => {
  it('gives touch zoom and the zoom memory to the PDF and image viewers in the phone viewer', () => {
    expect(shown('PDF', '/w/a.pdf', true)).toMatchObject({ touchZoom: true, zoomMemory: memory, url: 'blob:x' });
    expect(shown('Image', '/w/a.png', true)).toMatchObject({ touchZoom: true, zoomMemory: memory, url: 'blob:x' });
  });

  it('gives other viewers, and every viewer on the desktop, only what they had before', () => {
    expect(Object.keys(shown('Audio', '/w/a.mp3', true)).sort()).toEqual(['class', 'content', 'contentRevision', 'onSave', 'onUpdate:modelValue', 'url']);
    expect(Object.keys(shown('PDF', '/w/a.pdf', false)).sort()).toEqual(['class', 'content', 'contentRevision', 'onSave', 'onUpdate:modelValue', 'url']);
    expect(Object.keys(shown('Image', '/w/a.png', false)).sort()).toEqual(['class', 'content', 'contentRevision', 'onSave', 'onUpdate:modelValue', 'url']);
  });
});
