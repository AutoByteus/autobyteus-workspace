import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EpisodicTab from '../EpisodicTab.vue';

describe('EpisodicTab', () => {
  it('shows empty state when items are null', () => {
    const wrapper = mount(EpisodicTab, {
      props: { items: null },
    });

    expect(wrapper.text()).toContain('Episodic memory not available');
  });
});
