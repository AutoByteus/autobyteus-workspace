import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileFileViewer from '../MobileFileViewer.vue';
import type { FileDataType, OpenFileState } from '~/stores/fileExplorerState';
import type { MobileWorkContext } from '~/types/mobileWork';

let pinia: Pinia;

const context: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

function mountSubject(fileState: OpenFileState, path = fileState.path) {
  return mount(MobileFileViewer, {
    props: {
      node: { name: path.split('/').pop() || path, path, is_file: true },
      workspaceId: 'workspace-1',
      context,
      fileState,
      openError: null,
    },
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
      relativeResourceContext: { kind: 'workspace', workspaceId: 'workspace-1' },
      isLoading: false,
      error: null,
    }, path);

    expect(wrapper.get('[data-testid="file-viewer-stub"]').text()).toContain(`${type}:http://127.0.0.1:4100/rest/workspaces/workspace-1/content`);
    expect(wrapper.get('[data-testid="file-viewer-stub"]').text()).toContain('edit:true');
    expect(wrapper.find('[data-testid="mobile-file-attach"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-file-preview-unsupported"]').exists()).toBe(false);
  });

  it('keeps HTML workspace files in raw read-only mode on mobile instead of static iframe preview', () => {
    const wrapper = mountSubject({
      path: 'docs/page.html',
      type: 'Text',
      mode: 'preview',
      content: '<h1>Page</h1>',
      url: null,
      relativeResourceContext: { kind: 'workspace', workspaceId: 'workspace-1' },
      isLoading: false,
      error: null,
    });

    expect(wrapper.get('[data-testid="file-viewer-stub"]').text()).toContain('Text:<h1>Page</h1>:edit:true');
  });
});
