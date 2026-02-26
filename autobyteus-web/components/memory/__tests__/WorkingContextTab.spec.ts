import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkingContextTab from '../WorkingContextTab.vue';

describe('WorkingContextTab', () => {
  it('shows empty state when messages are null', () => {
    const wrapper = mount(WorkingContextTab, {
      props: { messages: null },
    });

    expect(wrapper.text()).toContain('Working context not available');
  });
});
