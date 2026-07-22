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
});
