import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Tab from '../Tab.vue';

describe('Tab.vue', () => {
  it('preserves the personal-branch default typography and spacing', () => {
    const wrapper = mount(Tab, {
      props: {
        name: 'files',
        selected: true,
      },
    });

    const button = wrapper.get('button');
    expect(button.classes()).toEqual(expect.arrayContaining(['px-5', 'py-3', 'text-base']));
    expect(button.classes()).not.toEqual(expect.arrayContaining(['px-2.5', 'py-2', 'text-sm']));
    expect(button.attributes('role')).toBe('tab');
    expect(button.attributes('aria-selected')).toBe('true');
    expect(button.find('.bg-blue-600').exists()).toBe(true);
  });
});
