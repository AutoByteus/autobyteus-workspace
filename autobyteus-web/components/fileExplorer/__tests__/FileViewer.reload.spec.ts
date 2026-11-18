import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, onMounted } from 'vue';

// autobyteus-450 DS-002: an explicit open of an open media file bumps `contentRevision`; the viewer gets it and loads the
// (unchanged) URL again. Text keeps its editor and re-renders from `content`.

const seen = vi.hoisted(() => ({ imageRevisions: [] as number[], editorMounts: 0 }));
vi.mock('~/components/fileExplorer/viewers/ImageViewer.vue', () => ({
  default: defineComponent({ props: ['url', 'content', 'contentRevision'], setup: (props) => () => {
    seen.imageRevisions.push(props.contentRevision);
    return h('img', { src: props.url });
  } }),
}));
vi.mock('~/components/fileExplorer/MonacoEditor.vue', () => ({
  default: defineComponent({ props: ['modelValue', 'language', 'readOnly'], setup: (props) => { onMounted(() => { seen.editorMounts += 1; }); return () => h('pre', props.modelValue); } }),
}));

import FileViewer from '../FileViewer.vue';

const mountViewer = (file: Record<string, unknown>) => mount(FileViewer, {
  props: { file: file as never, mode: 'edit' },
  global: { mocks: { $t: (key: string) => key } },
});

describe('FileViewer reload on contentRevision', () => {
  it('hands a media viewer the revision, with the same URL', async () => {
    seen.imageRevisions.length = 0;
    const file = { path: 'chart.png', type: 'Image', content: null, url: 'https://node/rest/workspaces/w/content?path=chart.png', contentRevision: 0 };
    const wrapper = mountViewer(file);
    await wrapper.setProps({ file: { ...file, contentRevision: 1 } as never });
    expect(seen.imageRevisions).toEqual([0, 1]);
    expect(wrapper.get('img').attributes('src')).toBe(file.url);
  });

  it('keeps the text editor mounted across a reload; it shows the new content', async () => {
    seen.editorMounts = 0;
    const file = { path: 'post.md', type: 'Text', content: 'VERSION-ONE', url: null, contentRevision: 0 };
    const wrapper = mountViewer(file);
    await wrapper.setProps({ file: { ...file, content: 'VERSION-TWO', contentRevision: 3 } as never });
    expect(seen.editorMounts).toBe(1);
    expect(wrapper.text()).toContain('VERSION-TWO');
  });
});
