import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileFileViewer from '../MobileFileViewer.vue';
import type { FileDataType, OpenFileState } from '~/stores/fileExplorerState';

let pinia: Pinia;


function mountSubject(fileState: OpenFileState, path = fileState.path) {
  return mount(MobileFileViewer, {
    props: { path, fileState, openError: null },
    global: {
      plugins: [pinia],
      stubs: {
        FileViewer: {
          props: ['file', 'mode', 'readOnly', 'loading', 'error'],
          template: '<div data-testid="file-viewer-stub">{{ file.type }}:{{ file.url || file.content }}:{{ mode }}:{{ readOnly }}</div>',
        },
      },
    },
  });
}

describe('MobileFileViewer', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it.each([
    ['Image', 'images/pic.png'],
    ['Image', 'images/diagram.svg'],
    ['Audio', 'audio/clip.mp3'],
    ['Video', 'video/demo.mp4'],
    ['PDF', 'docs/spec.pdf'],
    ['Excel', 'sheets/data.csv'],
  ] satisfies Array<[FileDataType, string]>)('renders protected %s workspace files through the shared read-only FileViewer', (type, path) => {
    const wrapper = mountSubject({
      path,
      type,
      mode: 'preview',
      content: null,
      url: `http://127.0.0.1:4100/rest/workspaces/workspace-1/content?path=${encodeURIComponent(path)}`,
      contentRevision: 0, relativeResourceContext: { kind: 'workspace', workspaceId: 'workspace-1' },
      isLoading: false,
      error: null,
    }, path);

    expect(wrapper.get('[data-testid="mobile-file-preview-content"]').text()).toContain(`${type}:http://127.0.0.1:4100/rest/workspaces/workspace-1/content`);
    expect(wrapper.get('[data-testid="mobile-file-preview-content"]').text()).toContain('edit:true');
    // An opened file has no Attach (DEC-004): the composer's own + attaches.
    expect(wrapper.find('[data-testid="mobile-file-attach"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Attach');
    expect(wrapper.find('[data-testid="mobile-file-preview-unsupported"]').exists()).toBe(false);
  });

  it('keeps HTML workspace files in raw read-only mode on mobile instead of static iframe preview', () => {
    const wrapper = mountSubject({
      path: 'docs/page.html',
      type: 'Text',
      mode: 'preview',
      content: '<h1>Page</h1>',
      url: null,
      contentRevision: 0, relativeResourceContext: { kind: 'workspace', workspaceId: 'workspace-1' },
      isLoading: false,
      error: null,
    });

    expect(wrapper.get('[data-testid="mobile-file-preview-content"]').text()).toContain('Text:<h1>Page</h1>:edit:true');
  });

  it.each([
    ['loading', { isLoading: true, error: null, type: 'Text' as FileDataType }, 'Opening…'],
    ['an error', { isLoading: false, error: 'boom', type: 'Text' as FileDataType }, 'Couldn’t open this file.'],
    ['an unsupported file', { isLoading: false, error: null, type: 'Unsupported' as FileDataType }, 'This file can’t be shown on the phone.'],
  ])('shows the spec\'s line while %s (TR-019)', (_name, patch, text) => {
    const wrapper = mountSubject({ path: 'docs/a.txt', mode: 'preview', content: '', url: null, contentRevision: 0, relativeResourceContext: null, ...patch } as OpenFileState);
    expect(wrapper.text()).toContain(text);
    expect(wrapper.find('[data-testid="mobile-file-preview-content"]').exists()).toBe(false);
  });

  it('its bar is ← and the file name', async () => {
    const wrapper = mountSubject({ path: 'docs/notes.md', type: 'Text', mode: 'preview', content: '# a', url: null, contentRevision: 0, relativeResourceContext: null, isLoading: false, error: null });
    expect(wrapper.get('[data-testid="mobile-screen-title"]').text()).toBe('notes.md');
    await wrapper.get('[data-testid="mobile-screen-back"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
