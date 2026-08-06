import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ThinkSegment from '../ThinkSegment.vue';

describe('ThinkSegment disclosure', () => {
  it('is collapsed by default and expands only after native button activation', async () => {
    const wrapper = mount(ThinkSegment, {
      props: { content: 'retained reasoning detail' },
      global: {
        stubs: {
          Icon: true,
          MarkdownRenderer: {
            props: ['content'],
            template: '<div data-test="thinking-content">{{ content }}</div>',
          },
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

  it('does not mount the rich renderer until active reasoning completes', async () => {
    const wrapper = mount(ThinkSegment, {
      props: { content: '**thinking**', presentationComplete: false },
      global: {
        stubs: {
          Icon: true,
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
        },
        mocks: { $t: () => 'Thinking' },
      },
    });

    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[data-test="live-text-renderer"]').text()).toBe('**thinking**');
    expect(wrapper.find('[data-test="markdown-renderer"]').exists()).toBe(false);

    await wrapper.setProps({ presentationComplete: true });
    expect(wrapper.find('[data-test="live-text-renderer"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="markdown-renderer"]').text()).toBe('**thinking**');
  });
});
