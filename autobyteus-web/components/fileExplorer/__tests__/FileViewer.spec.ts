import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FileViewer from '../FileViewer.vue';
import MonacoEditor from '../MonacoEditor.vue';
import ImageViewer from '../viewers/ImageViewer.vue';

// Mock child components to avoid deep rendering issues in unit tests
vi.mock('~/components/fileExplorer/MonacoEditor.vue', () => ({
  default: { name: 'MonacoEditor', template: '<div class="monaco-mock" />', props: ['modelValue', 'language', 'readOnly'] }
}));
vi.mock('~/components/fileExplorer/viewers/ImageViewer.vue', () => ({
  default: { name: 'ImageViewer', template: '<div class="image-mock" />', props: ['url'] }
}));
vi.mock('~/components/fileExplorer/viewers/MarkdownPreviewer.vue', () => ({
  default: {
    name: 'MarkdownPreviewer',
    template: '<div class="markdown-preview-mock" />',
    props: ['content', 'path', 'relativeResourceContext'],
  }
}));
vi.mock('~/components/fileExplorer/viewers/HtmlPreviewer.vue', () => ({
  default: {
    name: 'HtmlPreviewer',
    template: '<div class="html-preview-mock" />',
    props: ['content', 'path', 'relativeResourceContext'],
  }
}));
vi.mock('~/utils/highlighting/languageDetector', () => ({
  getLanguage: () => 'typescript'
}));

describe('FileViewer.vue', () => {
  it('renders loading state', () => {
    const wrapper = mount(FileViewer, {
      props: {
        file: { path: 'test.ts', type: 'Text', content: null, url: null },
        mode: 'edit',
        loading: true
      }
    });
    expect(wrapper.text()).toContain('Loading content');
  });

  it('renders error state', () => {
    const wrapper = mount(FileViewer, {
      props: {
        file: { path: 'test.ts', type: 'Text', content: null, url: null },
        mode: 'edit',
        error: 'Failed to load'
      }
    });
    expect(wrapper.text()).toContain('Error');
    expect(wrapper.text()).toContain('Failed to load');
  });

  it('renders MonacoEditor for text files in edit mode', () => {
    const wrapper = mount(FileViewer, {
      props: {
        file: { path: 'test.ts', type: 'Text', content: 'console.log("hi")', url: null },
        mode: 'edit'
      }
    });
    const editor = wrapper.findComponent({ name: 'MonacoEditor' });
    expect(editor.exists()).toBe(true);
    expect(editor.props('modelValue')).toBe('console.log("hi")');
  });

  it('renders ImageViewer for image files', () => {
    const wrapper = mount(FileViewer, {
      props: {
        file: { path: 'test.png', type: 'Image', content: null, url: 'http://example.com/img.png' },
        mode: 'preview'
      }
    });
    const image = wrapper.findComponent({ name: 'ImageViewer' });
    expect(image.exists()).toBe(true);
    expect(image.props('url')).toBe('http://example.com/img.png');
  });

  it('forwards explicit relative-resource identity to Markdown preview', () => {
    const relativeResourceContext = { kind: 'workspace' as const, workspaceId: 'workspace-1' };
    const wrapper = mount(FileViewer, {
      props: {
        file: {
          path: 'docs/readme.md',
          type: 'Text',
          content: '![Card](assets/card.png)',
          url: null,
          relativeResourceContext,
        },
        mode: 'preview',
      }
    });

    const preview = wrapper.findComponent({ name: 'MarkdownPreviewer' });
    expect(preview.props('path')).toBe('docs/readme.md');
    expect(preview.props('relativeResourceContext')).toEqual(relativeResourceContext);
  });

  it('forwards explicit relative-resource identity to HTML preview', () => {
    const relativeResourceContext = { kind: 'workspace' as const, workspaceId: 'workspace-2' };
    const wrapper = mount(FileViewer, {
      props: {
        file: {
          path: 'docs/index.html',
          type: 'Text',
          content: '<h1>Preview</h1>',
          url: null,
          relativeResourceContext,
        },
        mode: 'preview',
      }
    });

    const preview = wrapper.findComponent({ name: 'HtmlPreviewer' });
    expect(preview.exists()).toBe(true);
    expect(preview.props('path')).toBe('docs/index.html');
    expect(preview.props('relativeResourceContext')).toEqual(relativeResourceContext);
  });
});
