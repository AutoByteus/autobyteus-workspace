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
    expect(wrapper.text()).toContain('Loading content...');
  });

  it('renders error state', () => {
    const wrapper = mount(FileViewer, {
      props: {
        file: { path: 'test.ts', type: 'Text', content: null, url: null },
        mode: 'edit',
        error: 'Failed to load'
      }
    });
    expect(wrapper.text()).toContain('Error!');
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
});
