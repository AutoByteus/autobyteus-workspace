import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SemanticTab from '../SemanticTab.vue';

describe('SemanticTab', () => {
  it('shows empty state when items are null', () => {
    const wrapper = mount(SemanticTab, {
      props: { items: null },
    });

    expect(wrapper.text()).toContain('Semantic memory not available');
  });
});
