import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TextSegment from '../TextSegment.vue';

const stubs = {
  MarkdownRenderer: {
    name: 'MarkdownRenderer',
    props: ['content'],
    template: '<div data-test="markdown-renderer">{{ content }}</div>',
  },
  LiveTextRenderer: {
    name: 'LiveTextRenderer',
    props: ['content'],
    template: '<div data-test="live-text-renderer">{{ content }}</div>',
  },
};

describe('TextSegment', () => {
  it('mounts only safe live text while active and switches to rich output at completion', async () => {
    const wrapper = mount(TextSegment, {
      props: { content: '# partial', presentationComplete: false },
      global: { stubs },
    });

    expect(wrapper.get('[data-test="live-text-renderer"]').text()).toBe('# partial');
    expect(wrapper.find('[data-test="markdown-renderer"]').exists()).toBe(false);

    await wrapper.setProps({ presentationComplete: true });
    expect(wrapper.find('[data-test="live-text-renderer"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="markdown-renderer"]').text()).toBe('# partial');
  });

  it('defaults historical content to the completed rich path', () => {
    const wrapper = mount(TextSegment, {
      props: { content: 'history' },
      global: { stubs },
    });

    expect(wrapper.get('[data-test="markdown-renderer"]').text()).toBe('history');
  });
});
