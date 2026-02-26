import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RawTracesTab from '../RawTracesTab.vue';

describe('RawTracesTab', () => {
  it('emits updateLimit when apply is clicked', async () => {
    const wrapper = mount(RawTracesTab, {
      props: {
        traces: [],
        limit: 10,
        loading: false,
      },
    });

    const applyButton = wrapper.find('button');
    await applyButton.trigger('click');

    expect(wrapper.emitted('updateLimit')).toBeTruthy();
    expect(wrapper.emitted('updateLimit')![0]).toEqual([10]);
  });
});
