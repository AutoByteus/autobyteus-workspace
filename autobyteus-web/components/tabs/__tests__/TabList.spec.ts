import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';

const { TabStub } = vi.hoisted(() => ({
  TabStub: {
    name: 'Tab',
    template: '<button class="tab-stub" @click="$emit(\'select\', name)">{{ name }}</button>',
    props: ['name', 'selected'],
  },
}));

vi.mock('../Tab.vue', () => ({
  default: TabStub,
}));

import TabList from '../TabList.vue';

describe('TabList.vue', () => {

  // Sample tab data for testing
  const sampleTabs = [
    { name: 'Tab1' },
    { name: 'Tab2' },
    { name: 'Tab3' },
  ];
  
  it('renders the correct number of Tab components', () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1'
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    // Expecting three Tab components
    expect(wrapper.findAllComponents(TabStub).length).toBe(3);
  });

  it('passes the correct props to each Tab component', () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1'
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    const tabs = wrapper.findAllComponents(TabStub);
    for (let i = 0; i < sampleTabs.length; i++) {
      expect(tabs[i].props().name).toBe(sampleTabs[i].name);
      expect(tabs[i].props().selected).toBe(sampleTabs[i].name === 'Tab1');
    }
  });

  it('emits the select event with the correct tab name when a Tab is clicked', async () => {
    const wrapper = mount(TabList, {
      props: {
        tabs: sampleTabs,
        selectedTab: 'Tab1'
      },
      global: {
        stubs: { Tab: TabStub },
      },
    });

    // Simulating a click on the second tab
    await wrapper.findAllComponents(TabStub)[1].trigger('click');

    // Expecting the emitted event's payload to be 'Tab2'
    expect(wrapper.emitted().select[0]).toEqual(['Tab2']);
  });

});
