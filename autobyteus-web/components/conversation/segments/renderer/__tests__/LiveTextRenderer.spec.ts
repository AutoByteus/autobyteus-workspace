import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LiveTextRenderer from '../LiveTextRenderer.vue';

describe('LiveTextRenderer', () => {
  it('renders active source as escaped text with whitespace preservation', () => {
    const source = '<img src=x onerror="alert(1)">\n  **unfinished**';
    const wrapper = mount(LiveTextRenderer, { props: { content: source } });

    expect(wrapper.text()).toBe(source);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.html()).toContain('&lt;img src=x onerror="alert(1)"&gt;');
    expect(wrapper.get('[data-testid="live-text-renderer"]').classes()).toContain('whitespace-pre-wrap');
  });
});
