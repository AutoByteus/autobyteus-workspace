import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TextSegment from '../TextSegment.vue';
import MarkdownRenderer from '../renderer/MarkdownRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

const stubs = {
  MarkdownRenderer: {
    name: 'MarkdownRenderer',
    props: ['content', 'enableEventMonitorFileActions'],
    emits: ['file-path-action'],
    template: '<div data-test="markdown-renderer">{{ content }}</div>',
  },
};

describe('TextSegment', () => {
  it('delegates active Markdown directly to the rich renderer', () => {
    const wrapper = mount(TextSegment, {
      props: { content: '# Active **rich**' },
    });

    expect(wrapper.getComponent(MarkdownRenderer).props('content')).toBe('# Active **rich**');
    expect(wrapper.get('h1').text()).toBe('Active rich');
    expect(wrapper.get('strong').text()).toBe('rich');
  });

  it('reacts to shaped content revisions through the same mounted rich renderer', async () => {
    const wrapper = mount(TextSegment, {
      props: { content: '# partial' },
    });
    const initialRendererElement = wrapper.getComponent(MarkdownRenderer).element;

    await wrapper.setProps({ content: '## Revised `rich`' });

    const revisedRenderer = wrapper.getComponent(MarkdownRenderer);
    expect(revisedRenderer.element).toBe(initialRendererElement);
    expect(wrapper.get('h2').text()).toBe('Revised rich');
    expect(wrapper.get('code').text()).toBe('rich');
  });

  it('keeps historical rich rendering and Event Monitor file-action propagation', async () => {
    const wrapper = mount(TextSegment, {
      props: { content: 'history', enableEventMonitorFileActions: true },
      global: { stubs },
    });
    const action: AbsoluteFilePathAction = {
      id: 'file-1',
      rawCandidate: '/tmp/history.md',
      normalizedCandidate: '/tmp/history.md',
      sourceKind: 'markdown-link',
      displayLabel: 'history.md',
      previewType: 'Text',
    };
    const renderer = wrapper.getComponent({ name: 'MarkdownRenderer' });

    expect(renderer.props('content')).toBe('history');
    expect(renderer.props('enableEventMonitorFileActions')).toBe(true);
    renderer.vm.$emit('file-path-action', action);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('file-path-action')).toEqual([[action]]);
  });
});
