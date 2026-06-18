import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import NodesPage from '../nodes.vue';

describe('nodes page', () => {
  it('is a thin facade over the existing NodeManager owner', () => {
    const wrapper = mount(NodesPage, {
      global: {
        stubs: {
          NodeManager: { template: '<div data-testid="node-manager" />' },
        },
      },
    });

    expect(wrapper.find('[data-testid="node-manager"]').exists()).toBe(true);
  });
});
