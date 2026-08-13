import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TeamActivityDot from '../TeamActivityDot.vue';

describe('TeamActivityDot', () => {
  it('renders a solid accessible blue active indicator without agent animation', async () => {
    const wrapper = mount(TeamActivityDot, {
      props: {
        isActive: true,
        label: 'Active team run',
      },
    });

    expect(wrapper.attributes()).toMatchObject({
      role: 'img',
      'aria-label': 'Active team run',
      title: 'Active team run',
      'data-active': 'true',
    });
    expect(wrapper.classes()).toEqual(expect.arrayContaining([
      'h-2',
      'w-2',
      'rounded-full',
      'bg-blue-500',
    ]));
    expect(wrapper.classes()).not.toContain('animate-pulse');

    await wrapper.setProps({
      isActive: false,
      label: 'Inactive team run',
    });

    expect(wrapper.attributes()).toMatchObject({
      'aria-label': 'Inactive team run',
      title: 'Inactive team run',
      'data-active': 'false',
    });
    expect(wrapper.classes()).toContain('bg-gray-400');
    expect(wrapper.classes()).not.toContain('bg-blue-500');
    expect(wrapper.classes()).not.toContain('animate-pulse');
  });
});
