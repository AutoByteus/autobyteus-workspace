import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ThinkSegment from '../ThinkSegment.vue';
import MarkdownRenderer from '../renderer/MarkdownRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

const MarkdownRendererStub = {
  name: 'MarkdownRenderer',
  props: ['content', 'enableEventMonitorFileActions'],
  emits: ['file-path-action'],
  template: '<div data-test="thinking-content">{{ content }}</div>',
};

describe('ThinkSegment disclosure', () => {
  it('is collapsed by default and expands only after native button activation', async () => {
    const wrapper = mount(ThinkSegment, {
      props: { content: 'retained reasoning detail' },
      global: {
        stubs: {
          Icon: true,
          MarkdownRenderer: MarkdownRendererStub,
        },
        mocks: { $t: () => 'Thinking' },
      },
    });

    const toggle = wrapper.get('button');
    expect(wrapper.find('[data-test="thinking-content"]').exists()).toBe(false);
    expect(toggle.classes()).not.toContain('is-active');

    await toggle.trigger('click');
    expect(wrapper.get('[data-test="thinking-content"]').text()).toBe('retained reasoning detail');
    expect(toggle.classes()).toContain('is-active');

    await toggle.trigger('click');
    expect(wrapper.find('[data-test="thinking-content"]').exists()).toBe(false);
  });

  it('renders visible active reasoning richly and revises it through the same mounted renderer', async () => {
    const wrapper = mount(ThinkSegment, {
      props: { content: '**thinking**', enableEventMonitorFileActions: true },
      global: {
        stubs: {
          Icon: true,
        },
        mocks: { $t: () => 'Thinking' },
      },
    });

    await wrapper.get('button').trigger('click');
    const initialRenderer = wrapper.getComponent(MarkdownRenderer);
    const initialRendererElement = initialRenderer.element;
    expect(initialRenderer.props('content')).toBe('**thinking**');
    expect(initialRenderer.props('enableEventMonitorFileActions')).toBe(true);
    expect(wrapper.get('strong').text()).toBe('thinking');

    await wrapper.setProps({ content: '## Still thinking with `code`' });
    const revisedRenderer = wrapper.getComponent(MarkdownRenderer);
    expect(revisedRenderer.element).toBe(initialRendererElement);
    expect(wrapper.get('h2').text()).toBe('Still thinking with code');
    expect(wrapper.get('code').text()).toBe('code');

    const action: AbsoluteFilePathAction = {
      id: 'file-1',
      rawCandidate: '/tmp/reasoning.md',
      normalizedCandidate: '/tmp/reasoning.md',
      sourceKind: 'markdown-link',
      displayLabel: 'reasoning.md',
      previewType: 'Text',
    };
    revisedRenderer.vm.$emit('file-path-action', action);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('file-path-action')).toEqual([[action]]);
  });
});
